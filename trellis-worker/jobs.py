"""
Bjorq 3D Worker — In-memory job store with auto-cleanup.
"""

import time
import threading
from enum import Enum
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


class JobStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


@dataclass
class Job:
    id: str
    status: JobStatus = JobStatus.QUEUED
    progress: int = 0
    step: str = "queued"
    error: Optional[str] = None
    result_path: Optional[str] = None
    image_paths: list[str] = field(default_factory=list)
    options: dict = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)


class JobStore:
    """Thread-safe in-memory job store."""

    def __init__(self, jobs_dir: Path):
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._jobs_dir = jobs_dir
        self._cleanup_thread: Optional[threading.Thread] = None
        self._cleanup_stop = threading.Event()

    def create(self, job_id: str, image_paths: list[str], options: dict) -> Job:
        job = Job(id=job_id, image_paths=image_paths, options=options)
        with self._lock:
            self._jobs[job_id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def get_latest(self) -> Optional[Job]:
        with self._lock:
            if not self._jobs:
                return None
            return max(self._jobs.values(), key=lambda j: j.updated_at)

    def update(
        self,
        job_id: str,
        status: Optional[JobStatus] = None,
        step: Optional[str] = None,
        progress: Optional[int] = None,
        error: Optional[str] = None,
        result_path: Optional[str] = None,
    ) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            if status is not None:
                job.status = status
            if step is not None:
                job.step = step
            if progress is not None:
                job.progress = progress
            if error is not None:
                job.error = error
            if result_path is not None:
                job.result_path = result_path
            job.updated_at = time.time()

    def start_cleanup(self, interval_seconds: int = 300, max_age_seconds: int = 3600) -> None:
        def _cleanup_loop():
            while not self._cleanup_stop.wait(interval_seconds):
                cutoff = time.time() - max_age_seconds
                to_remove = []
                with self._lock:
                    for job_id, job in self._jobs.items():
                        if job.status in (JobStatus.DONE, JobStatus.FAILED) and job.updated_at < cutoff:
                            to_remove.append(job_id)
                    for job_id in to_remove:
                        job = self._jobs.pop(job_id, None)
                        if job and job.result_path:
                            # Clean up result files
                            import shutil
                            job_dir = self._jobs_dir / job_id
                            if job_dir.exists():
                                shutil.rmtree(job_dir, ignore_errors=True)

        self._cleanup_thread = threading.Thread(target=_cleanup_loop, daemon=True)
        self._cleanup_thread.start()

    def stop_cleanup(self) -> None:
        self._cleanup_stop.set()
