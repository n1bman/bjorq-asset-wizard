"""
Bjorq 3D Worker — FastAPI server for TRELLIS.2 inference.

Runs on the user's Windows machine with NVIDIA GPU.
Exposes async job API for the Wizard addon to proxy through.
"""

import os
import sys
import uuid
import time
import logging
import threading
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

import torch
import uvicorn
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Depends, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from jobs import JobStore, JobStatus
from trellis_bridge import TrellisBridge, BridgeError

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

WORKER_VERSION = "2.7.0"
WORKER_PORT = int(os.environ.get("WORKER_PORT", "8080"))
WORKER_HOST = os.environ.get("WORKER_HOST", "0.0.0.0")
WORKER_TOKEN = os.environ.get("WORKER_TOKEN", "")
TRELLIS_REPO = os.environ.get("TRELLIS_REPO", str(Path(__file__).parent / "trellis-repo"))
TRELLIS_WEIGHTS = os.environ.get("TRELLIS_WEIGHTS", str(Path(__file__).parent / "weights"))
JOBS_DIR = Path(os.environ.get("JOBS_DIR", str(Path(__file__).parent / "jobs")))
JOBS_DIR.mkdir(parents=True, exist_ok=True)

LOG_LINES: list[str] = []
MAX_LOG_LINES = 200

logger = logging.getLogger("bjorq-worker")


class LogCapture(logging.Handler):
    """Capture log lines for the /ui dashboard."""

    def emit(self, record: logging.LogRecord) -> None:
        line = self.format(record)
        LOG_LINES.append(line)
        if len(LOG_LINES) > MAX_LOG_LINES:
            del LOG_LINES[: MAX_LOG_LINES // 2]


# ---------------------------------------------------------------------------
# GPU detection
# ---------------------------------------------------------------------------


def detect_gpu() -> dict:
    """Detect NVIDIA GPU capabilities via PyTorch."""
    info: dict = {
        "available": False,
        "name": None,
        "vramGB": None,
        "driver": None,
        "cudaRuntime": None,
    }

    if not torch.cuda.is_available():
        return info

    info["available"] = True
    info["cudaRuntime"] = torch.version.cuda or None

    try:
        info["name"] = torch.cuda.get_device_name(0)
        vram_bytes = torch.cuda.get_device_properties(0).total_mem
        info["vramGB"] = round(vram_bytes / (1024**3), 1)
    except Exception:
        pass

    # Try to get driver version via nvidia-smi
    try:
        import subprocess

        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=driver_version", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            info["driver"] = result.stdout.strip().split("\n")[0]
    except Exception:
        pass

    return info


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------


async def verify_token(request: Request) -> None:
    if not WORKER_TOKEN:
        return
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {WORKER_TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid or missing token")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

gpu_info: dict = {}
bridge: Optional[TrellisBridge] = None
bridge_error: Optional[str] = None
job_store = JobStore(JOBS_DIR)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global gpu_info, bridge, bridge_error

    # Configure logging
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    capture = LogCapture()
    capture.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logging.basicConfig(level=logging.INFO, handlers=[handler, capture])

    logger.info("Bjorq 3D Worker v%s starting...", WORKER_VERSION)
    gpu_info = detect_gpu()
    logger.info("GPU: %s", gpu_info)

    # Initialize bridge (lazy — won't fail if TRELLIS not installed yet)
    try:
        bridge = TrellisBridge(TRELLIS_REPO, TRELLIS_WEIGHTS)
        logger.info("TRELLIS bridge initialized")
    except Exception as e:
        bridge_error = str(e)
        logger.warning("TRELLIS bridge not available: %s", e)
        bridge = None

    # Start cleanup thread
    job_store.start_cleanup(interval_seconds=300, max_age_seconds=3600)

    yield

    job_store.stop_cleanup()
    logger.info("Worker shutting down")


app = FastAPI(title="Bjorq 3D Worker", version=WORKER_VERSION, lifespan=lifespan)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/status")
async def status():
    last_job = job_store.get_latest()
    return {
        "ok": bridge is not None,
        "version": WORKER_VERSION,
        "gpu": gpu_info.get("available", False),
        "gpuName": gpu_info.get("name"),
        "driver": gpu_info.get("driver"),
        "cudaRuntime": gpu_info.get("cudaRuntime"),
        "vramGB": gpu_info.get("vramGB"),
        "installing": False,
        "progress": 100,
        "lastError": bridge_error,
        "lastJob": {
            "id": last_job.id,
            "status": last_job.status.value,
            "step": last_job.step,
        }
        if last_job
        else None,
        "endpoints": ["/status", "/jobs", "/ui"],
    }


@app.post("/jobs", status_code=202, dependencies=[Depends(verify_token)])
async def create_job(
    images: list[UploadFile] = File(...),
    options: str = Form("{}"),
):
    if not bridge:
        detail = f"TRELLIS engine not available — {bridge_error or 'run installer first'}"
        raise HTTPException(503, detail)

    if not images:
        raise HTTPException(400, "At least one image is required")

    import json

    try:
        opts = json.loads(options)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON in options field")

    # Save uploaded images
    job_id = str(uuid.uuid4())[:12]
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    image_paths: list[str] = []
    for i, img in enumerate(images):
        ext = Path(img.filename or f"image_{i}.png").suffix or ".png"
        path = job_dir / f"input_{i}{ext}"
        content = await img.read()
        path.write_bytes(content)
        image_paths.append(str(path))

    # Create job
    job = job_store.create(job_id, image_paths, opts)

    # Start generation in background thread
    thread = threading.Thread(
        target=_run_generation, args=(job_id, image_paths, opts, job_dir), daemon=True
    )
    thread.start()

    return {"jobId": job_id}


def _run_generation(job_id: str, image_paths: list[str], opts: dict, job_dir: Path):
    """Run TRELLIS generation in background thread."""
    try:
        job_store.update(job_id, JobStatus.PROCESSING, step="preprocessing", progress=10)

        job_store.update(job_id, JobStatus.PROCESSING, step="generating", progress=30)
        glb_bytes = bridge.generate(image_paths, opts)

        job_store.update(job_id, JobStatus.PROCESSING, step="saving", progress=90)
        output_path = job_dir / "result.glb"
        output_path.write_bytes(glb_bytes)

        job_store.update(
            job_id, JobStatus.DONE, step="complete", progress=100, result_path=str(output_path)
        )
        logger.info("Job %s completed (%d bytes)", job_id, len(glb_bytes))

    except BridgeError as e:
        logger.error("Job %s failed: %s", job_id, e)
        job_store.update(job_id, JobStatus.FAILED, error=str(e))
    except Exception as e:
        logger.error("Job %s unexpected error: %s", job_id, e)
        job_store.update(job_id, JobStatus.FAILED, error=str(e))


@app.get("/jobs/{job_id}", dependencies=[Depends(verify_token)])
async def get_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    return {
        "jobId": job.id,
        "status": job.status.value,
        "progress": job.progress,
        "step": job.step,
        "error": job.error,
    }


@app.get("/jobs/{job_id}/result.glb", dependencies=[Depends(verify_token)])
async def get_job_result(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status != JobStatus.DONE:
        raise HTTPException(409, f"Job not done (status: {job.status.value})")
    if not job.result_path or not Path(job.result_path).exists():
        raise HTTPException(500, "Result file missing")

    return FileResponse(
        job.result_path,
        media_type="application/octet-stream",
        filename=f"{job_id}.glb",
    )


@app.get("/ui", response_class=HTMLResponse)
async def ui():
    ui_path = Path(__file__).parent / "ui" / "index.html"
    if ui_path.exists():
        return HTMLResponse(ui_path.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>Bjorq 3D Worker</h1><p>UI file not found.</p>")


@app.get("/logs")
async def logs():
    return {"lines": LOG_LINES[-50:]}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "worker:app",
        host=WORKER_HOST,
        port=WORKER_PORT,
        log_level="info",
    )
