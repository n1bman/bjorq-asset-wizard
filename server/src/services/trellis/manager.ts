/**
 * TRELLIS Engine Manager (v2.4.0)
 *
 * Supports two modes:
 *   - "local"    — install TRELLIS.2 inside the container (original behavior)
 *   - "external" — proxy to a remote Bjorq 3D Worker running on a GPU machine
 *
 * Mode is selected via TRELLIS_MODE env var (default: "local").
 *
 * Directory layout under TRELLIS_ROOT (/data/trellis) — local mode only:
 *   status.json   — persisted state
 *   repo/         — git clone --recursive of TRELLIS.2 source
 *   venv/         — Python virtual environment
 *   workspace/    — scratch space for generation runs
 *   weights/      — pretrained model weights
 */

import { access, readFile, writeFile, mkdir, stat, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { FastifyBaseLogger } from "fastify";
import type { TrellisStatusResponse, TrellisEnvironment } from "../../types/generate.js";

/* ================================================================== */
/*  External worker mode                                               */
/* ================================================================== */

const TRELLIS_MODE = (process.env.TRELLIS_MODE || "local") as "local" | "external";
const TRELLIS_WORKER_URL = process.env.TRELLIS_WORKER_URL || "";
const TRELLIS_WORKER_TOKEN = process.env.TRELLIS_WORKER_TOKEN || "";

/** Build Authorization header if token is configured. */
function workerHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (TRELLIS_WORKER_TOKEN) {
    h["Authorization"] = `Bearer ${TRELLIS_WORKER_TOKEN}`;
  }
  return h;
}

/**
 * Ping the external worker and translate response to TrellisStatusResponse.
 */
async function getExternalWorkerStatus(): Promise<TrellisStatusResponse> {
  if (!TRELLIS_WORKER_URL) {
    return {
      installed: false,
      running: false,
      gpu: false,
      mode: "external",
      workerUrl: "",
      lastError: "TRELLIS_WORKER_URL is not configured",
    };
  }

  try {
    const res = await fetch(`${TRELLIS_WORKER_URL}/status`, {
      headers: workerHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return {
        installed: false,
        running: false,
        gpu: false,
        mode: "external",
        workerUrl: TRELLIS_WORKER_URL,
        lastError: `Worker returned HTTP ${res.status}`,
      };
    }

    const data = await res.json() as Record<string, unknown>;

    return {
      installed: true,
      running: data.ok === true,
      gpu: data.gpu === true,
      version: (data.version as string) || undefined,
      mode: "external",
      workerUrl: TRELLIS_WORKER_URL,
      environment: {
        platform: data.gpu ? "cuda" : "cpu-only",
        gpu: (data.gpuName as string) || null,
        cudaVersion: (data.cudaRuntime as string) || null,
        meetsRequirements: data.gpu === true,
        missingRequirements: data.gpu ? [] : ["NVIDIA GPU not detected on worker"],
      },
      lastError: (data.lastError as string) || undefined,
    };
  } catch (err) {
    return {
      installed: false,
      running: false,
      gpu: false,
      mode: "external",
      workerUrl: TRELLIS_WORKER_URL,
      lastError: err instanceof Error ? err.message : "Worker not reachable",
    };
  }
}

/**
 * Test connection to the external worker.
 * Returns a structured result suitable for the /trellis/test-connection endpoint.
 */
export async function testWorkerConnection(): Promise<{
  ok: boolean;
  workerUrl: string;
  version?: string;
  gpu?: boolean;
  gpuName?: string;
  error?: string;
}> {
  if (!TRELLIS_WORKER_URL) {
    return { ok: false, workerUrl: "", error: "TRELLIS_WORKER_URL is not configured" };
  }

  try {
    const res = await fetch(`${TRELLIS_WORKER_URL}/status`, {
      headers: workerHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return { ok: false, workerUrl: TRELLIS_WORKER_URL, error: `HTTP ${res.status}` };
    }

    const data = await res.json() as Record<string, unknown>;
    return {
      ok: data.ok === true,
      workerUrl: TRELLIS_WORKER_URL,
      version: data.version as string,
      gpu: data.gpu as boolean,
      gpuName: data.gpuName as string,
    };
  } catch (err) {
    return {
      ok: false,
      workerUrl: TRELLIS_WORKER_URL,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

/**
 * Generate via external worker: submit job, poll until done, fetch GLB.
 */
async function generateViaExternalWorker(
  imagePaths: string[],
  log: FastifyBaseLogger,
): Promise<Uint8Array> {
  if (!TRELLIS_WORKER_URL) {
    throw new Error("TRELLIS_WORKER_URL is not configured");
  }

  // Build multipart form
  const formData = new FormData();
  for (const imgPath of imagePaths) {
    const fileData = await readFile(imgPath);
    const fileName = imgPath.split("/").pop() || "image.png";
    formData.append("images", new Blob([fileData]), fileName);
  }
  formData.append("options", JSON.stringify({ style: "bjorq-cozy", target: "dashboard-safe" }));

  // Submit job
  log.info({ workerUrl: TRELLIS_WORKER_URL, imageCount: imagePaths.length }, "Submitting job to external worker");
  const submitRes = await fetch(`${TRELLIS_WORKER_URL}/jobs`, {
    method: "POST",
    headers: workerHeaders(),
    body: formData,
    signal: AbortSignal.timeout(60_000),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => "");
    throw new Error(`Worker job submission failed: HTTP ${submitRes.status} — ${text}`);
  }

  const { jobId } = await submitRes.json() as { jobId: string };
  log.info({ jobId }, "External worker job submitted");

  // Poll for completion
  const MAX_POLLS = 600; // 10 min at 1s interval
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, 1000));

    const pollRes = await fetch(`${TRELLIS_WORKER_URL}/jobs/${jobId}`, {
      headers: workerHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!pollRes.ok) continue;

    const job = await pollRes.json() as { status: string; error?: string; progress?: number };

    if (job.status === "done") {
      log.info({ jobId }, "External worker job completed — fetching result");

      const resultRes = await fetch(`${TRELLIS_WORKER_URL}/jobs/${jobId}/result.glb`, {
        headers: workerHeaders(),
        signal: AbortSignal.timeout(120_000),
      });

      if (!resultRes.ok) {
        throw new Error(`Failed to fetch GLB result: HTTP ${resultRes.status}`);
      }

      const buffer = await resultRes.arrayBuffer();
      return new Uint8Array(buffer);
    }

    if (job.status === "failed") {
      throw new Error(`External worker job failed: ${job.error || "Unknown error"}`);
    }

    if (i % 10 === 0) {
      log.info({ jobId, status: job.status, progress: job.progress }, "Polling external worker job");
    }
  }

  throw new Error("External worker job timed out after 10 minutes");
}


/* ================================================================== */
/*  Local mode (original TRELLIS-in-container logic)                   */
/* ================================================================== */

/** Root directory for all TRELLIS data (state, repo, venv, workspace). */
const TRELLIS_ROOT = resolve(process.env.TRELLIS_PATH || "/data/trellis");

/** Sub-paths under TRELLIS_ROOT */
const REPO_PATH = resolve(TRELLIS_ROOT, "repo");
const VENV_PATH = resolve(TRELLIS_ROOT, "venv");
const WORKSPACE_PATH = resolve(TRELLIS_ROOT, "workspace");
const WEIGHTS_PATH = resolve(TRELLIS_ROOT, "weights");
const STATUS_FILE = resolve(TRELLIS_ROOT, "status.json");
const SHELL_PATH = "/bin/sh";

const TRELLIS_TIMEOUT = Number(process.env.TRELLIS_TIMEOUT || 300) * 1000;
const TRELLIS_MAX_RETRIES = Number(process.env.TRELLIS_MAX_RETRIES || 2);
const RUNTIME_BINARY_NAMES = ["git", "python3", "pip3"] as const;

type RuntimeBinaryName = (typeof RUNTIME_BINARY_NAMES)[number];
type RuntimeDependencyState = Record<RuntimeBinaryName, string | undefined>;

interface CudaExtensionDef {
  name: string;
  install: string;
  requiresCuda: boolean;
  gitRepo?: string;
  subdir?: string;
}

const CUDA_EXTENSIONS: CudaExtensionDef[] = [
  { name: "flash-attn", install: "flash-attn==2.7.3", requiresCuda: true },
  { name: "nvdiffrast", install: "nvdiffrast", requiresCuda: true, gitRepo: "https://github.com/NVlabs/nvdiffrast.git" },
  { name: "nvdiffrec", install: "nvdiffrec", requiresCuda: true, gitRepo: "https://github.com/JeffreyXiang/nvdiffrec.git" },
  { name: "CuMesh", install: "cumesh", requiresCuda: true, gitRepo: "https://github.com/JeffreyXiang/CuMesh.git" },
  { name: "FlexGEMM", install: "flexgemm", requiresCuda: true, gitRepo: "https://github.com/JeffreyXiang/FlexGEMM.git" },
  { name: "o-voxel", install: "o-voxel", requiresCuda: true, subdir: "extensions/o-voxel" },
];

interface TrellisState {
  installed: boolean;
  running: boolean;
  gpu: boolean;
  version?: string;
  installing: boolean;
  installProgress: number;
  error?: string;
  runtimeDependencies: RuntimeDependencyState;
  environment: TrellisEnvironment;
  extensions: Record<string, boolean>;
  weightsDownloaded: boolean;
}

const DEFAULT_ENVIRONMENT: TrellisEnvironment = {
  platform: "cpu-only",
  gpu: null,
  cudaVersion: null,
  meetsRequirements: false,
  missingRequirements: [],
};

let state: TrellisState = {
  installed: false,
  running: false,
  gpu: false,
  installing: false,
  installProgress: 0,
  runtimeDependencies: {
    git: undefined,
    python3: undefined,
    pip3: undefined,
  },
  environment: { ...DEFAULT_ENVIRONMENT },
  extensions: {},
  weightsDownloaded: false,
};

// Only initialize local state if in local mode
const startupInitialization = TRELLIS_MODE === "local" ? initializeTrellisState() : Promise.resolve();

async function initializeTrellisState(): Promise<void> {
  try {
    await access(STATUS_FILE);
    const data = JSON.parse(await readFile(STATUS_FILE, "utf-8"));
    state = {
      ...state,
      ...data,
      installing: false,
      runtimeDependencies: {
        ...state.runtimeDependencies,
        ...(data.runtimeDependencies ?? {}),
      },
      environment: {
        ...DEFAULT_ENVIRONMENT,
        ...(data.environment ?? {}),
      },
      extensions: data.extensions ?? {},
      weightsDownloaded: data.weightsDownloaded ?? false,
    };
  } catch {
    // First run — no status file yet
  }

  await refreshRuntimeDependencies().catch(() => undefined);
  await detectEnvironmentCapabilities().catch(() => undefined);
}

async function persistStatus(): Promise<void> {
  try {
    await mkdir(TRELLIS_ROOT, { recursive: true });
    await writeFile(STATUS_FILE, JSON.stringify(state, null, 2));
  } catch {
    // non-critical
  }
}

/* ================================================================== */
/*  Public API (mode-aware)                                            */
/* ================================================================== */

export function getTrellisMode(): "local" | "external" {
  return TRELLIS_MODE;
}

export function getTrellisStatus(): TrellisStatusResponse | Promise<TrellisStatusResponse> {
  if (TRELLIS_MODE === "external") {
    return getExternalWorkerStatus();
  }

  return {
    installed: state.installed,
    running: state.running,
    gpu: state.gpu,
    version: state.version,
    installing: state.installing,
    installProgress: state.installProgress,
    environment: state.environment,
    extensions: state.extensions,
    weightsDownloaded: state.weightsDownloaded,
    mode: "local",
  };
}

export function startTrellisInstall(log: FastifyBaseLogger): void {
  if (TRELLIS_MODE === "external") {
    log.info("External worker mode — skipping local install. Run the installer on your GPU machine.");
    return;
  }

  if (state.installing) return;

  state.installing = true;
  state.installProgress = 0;
  state.error = undefined;

  doInstall(log).catch((err) => {
    log.error({ err }, "TRELLIS installation failed");
    state.installing = false;
    state.error = err instanceof Error ? err.message : String(err);
    persistStatus();
  });
}

export async function generateWithTrellis(
  imagePaths: string[],
  outputDir: string,
  log: FastifyBaseLogger,
): Promise<Uint8Array> {
  if (TRELLIS_MODE === "external") {
    return generateViaExternalWorker(imagePaths, log);
  }

  // --- Local mode ---
  await startupInitialization;

  if (!state.installed) {
    throw new Error("TRELLIS engine is not installed. Please install it first via the UI.");
  }

  if (!state.environment.meetsRequirements) {
    log.warn(
      { missingRequirements: state.environment.missingRequirements },
      "Environment does not meet full TRELLIS.2 requirements — generation may fail",
    );
  }

  const outputPath = resolve(outputDir, "trellis_output.glb");
  const python = await requireExecutable(resolve(VENV_PATH, "bin/python"), "TRELLIS virtual environment python");
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= TRELLIS_MAX_RETRIES; attempt++) {
    log.info({ images: imagePaths.length, outputDir, attempt, pythonPath: python }, "Starting TRELLIS generation");

    try {
      await runCommand(
        python,
        [
          "-m", "trellis.cli", "generate",
          "--input", ...imagePaths,
          "--output", outputPath,
          "--format", "glb",
        ],
        log,
        TRELLIS_TIMEOUT,
        REPO_PATH,
      );

      const outputStat = await stat(outputPath).catch(() => null);
      if (!outputStat || outputStat.size < 100) {
        throw new Error(`TRELLIS produced empty or invalid output (${outputStat?.size ?? 0} bytes)`);
      }

      const buffer = new Uint8Array(await readFile(outputPath));

      if (buffer.length >= 4) {
        const magic = buffer[0] | (buffer[1] << 8) | (buffer[2] << 16) | (buffer[3] << 24);
        if (magic !== 0x46546C67) {
          throw new Error("TRELLIS output is not a valid GLB file");
        }
      }

      log.info(
        { attempt, size: buffer.byteLength, gpu: state.gpu },
        "TRELLIS generation succeeded",
      );
      return buffer;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      log.warn(
        { err: lastError.message, attempt, maxRetries: TRELLIS_MAX_RETRIES },
        "TRELLIS generation attempt failed",
      );

      if (attempt < TRELLIS_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  throw new Error(
    `TRELLIS generation failed after ${TRELLIS_MAX_RETRIES} attempts: ${lastError?.message ?? "Unknown error"}`,
  );
}

/* ================================================================== */
/*  Environment capability detection (local mode)                      */
/* ================================================================== */

async function detectEnvironmentCapabilities(log?: FastifyBaseLogger): Promise<void> {
  const env: TrellisEnvironment = {
    platform: "cpu-only",
    gpu: null,
    cudaVersion: null,
    meetsRequirements: false,
    missingRequirements: [],
  };

  try {
    const gpuInfo = await runCommandCapture(
      "nvidia-smi",
      ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
      log,
    );
    const line = gpuInfo.trim().split("\n")[0];
    if (line) {
      const [name, vramMB] = line.split(",").map((s) => s.trim());
      const vramGB = Math.round(Number(vramMB) / 1024);
      env.gpu = `${name} (${vramGB}GB)`;
      env.platform = "cuda";
      if (vramGB < 24) {
        env.missingRequirements.push(`GPU VRAM too low: ${vramGB}GB detected, 24GB+ required`);
      }
      log?.info({ gpu: env.gpu, vramGB }, "GPU detected");
    }
  } catch {
    env.gpu = null;
    env.missingRequirements.push("NVIDIA GPU with 24GB+ VRAM");
    log?.info("No NVIDIA GPU detected (nvidia-smi not available)");
  }

  try {
    const nvccOutput = await runCommandCapture("nvcc", ["--version"], log);
    const match = nvccOutput.match(/release (\d+\.\d+)/);
    if (match) {
      env.cudaVersion = match[1];
      log?.info({ cudaVersion: env.cudaVersion }, "CUDA Toolkit detected");
    }
  } catch {
    env.cudaVersion = null;
    env.missingRequirements.push("CUDA Toolkit (recommended 12.4)");
    log?.info("No CUDA Toolkit detected (nvcc not available)");
  }

  try {
    const dfOutput = await runCommandCapture(SHELL_PATH, ["-c", `df -BG "${TRELLIS_ROOT}" 2>/dev/null | tail -1 | awk '{print $4}'`], log);
    const availGB = parseInt(dfOutput.replace("G", ""), 10);
    if (!isNaN(availGB) && availGB < 20) {
      env.missingRequirements.push(`Low disk space: ${availGB}GB available, 20GB+ recommended`);
    }
  } catch {
    // non-critical
  }

  env.meetsRequirements = env.missingRequirements.length === 0;
  state.environment = env;
  state.gpu = env.platform === "cuda";

  await persistStatus();
}

/* ================================================================== */
/*  Installation pipeline (local mode)                                 */
/* ================================================================== */

async function isValidRepo(path: string): Promise<boolean> {
  try {
    const gitDir = await stat(resolve(path, ".git"));
    return gitDir.isDirectory();
  } catch {
    return false;
  }
}

async function doInstall(log: FastifyBaseLogger): Promise<void> {
  await startupInitialization;
  await refreshRuntimeDependencies(log);
  await detectEnvironmentCapabilities(log);

  const gitPath = await requireRuntimeBinary("git", log);
  const python3Path = await requireRuntimeBinary("python3", log);
  await requireRuntimeBinary("pip3", log);

  log.info(
    {
      root: TRELLIS_ROOT,
      runtimeDependencies: state.runtimeDependencies,
      environment: state.environment,
    },
    "Starting TRELLIS installation",
  );

  if (!state.environment.meetsRequirements) {
    log.warn(
      { missingRequirements: state.environment.missingRequirements },
      "⚠ Environment does NOT meet full TRELLIS.2 requirements — " +
      "installation will proceed with best-effort but generation may not work. " +
      "Full runtime requires: Linux + NVIDIA GPU (24GB+ VRAM) + CUDA Toolkit 12.4",
    );
  }

  await mkdir(TRELLIS_ROOT, { recursive: true });
  await mkdir(WORKSPACE_PATH, { recursive: true });
  await mkdir(WEIGHTS_PATH, { recursive: true });

  // Step 1/6: Clone
  state.installProgress = 5;
  await persistStatus();
  if (await isValidRepo(REPO_PATH)) {
    log.info("Step 1/6: Repository already exists — skipping clone");
  } else {
    try {
      const repoStat = await stat(REPO_PATH).catch(() => null);
      if (repoStat) {
        log.warn("Step 1/6: Invalid repo directory found — removing and re-cloning");
        await rm(REPO_PATH, { recursive: true, force: true });
      }
    } catch { /* ignore */ }

    log.info({ gitPath }, "Step 1/6: Cloning TRELLIS.2 repository (--recursive for submodules)");
    await runCommand(
      gitPath,
      ["clone", "--recursive", "--depth", "1", "https://github.com/microsoft/TRELLIS.2.git", REPO_PATH],
      log,
      TRELLIS_TIMEOUT,
      TRELLIS_ROOT,
    );
  }

  // Step 2/6: Create venv
  state.installProgress = 15;
  await persistStatus();
  const venvPython = resolve(VENV_PATH, "bin/python");
  const venvExists = await stat(venvPython).catch(() => null);
  if (venvExists) {
    log.info("Step 2/6: Virtual environment already exists — skipping");
  } else {
    log.info({ python3Path }, "Step 2/6: Creating Python virtual environment");
    await runCommand(python3Path, ["-m", "venv", VENV_PATH], log, TRELLIS_TIMEOUT, TRELLIS_ROOT);
  }

  const venvPip = await requireExecutable(resolve(VENV_PATH, "bin/pip"), "TRELLIS virtual environment pip");

  // Step 3/6: PyTorch
  state.installProgress = 25;
  await persistStatus();
  log.info("Step 3/6: Installing PyTorch");
  await installPyTorch(venvPip, log);

  // Step 4/6: Basic deps
  state.installProgress = 45;
  await persistStatus();
  log.info("Step 4/6: Installing basic dependencies (setup.sh --basic)");
  await installBasicDependencies(venvPip, REPO_PATH, log);

  // Step 5/6: CUDA extensions
  state.installProgress = 65;
  await persistStatus();
  log.info("Step 5/6: Installing CUDA extensions");
  await installCudaExtensions(venvPip, gitPath, REPO_PATH, log);

  // Step 6/6: Weights
  state.installProgress = 85;
  await persistStatus();
  log.info("Step 6/6: Downloading pretrained model weights");
  await downloadWeights(venvPip, log);

  // Finalize
  const runtimePython = await requireExecutable(venvPython, "TRELLIS virtual environment python");
  state.installed = true;
  state.installing = false;
  state.installProgress = 100;
  state.version = "2.0";
  state.error = undefined;
  state.gpu = await detectGpuViaPyTorch(log, runtimePython);

  await persistStatus();
  log.info(
    {
      gpu: state.gpu,
      environment: state.environment,
      extensions: state.extensions,
      weightsDownloaded: state.weightsDownloaded,
    },
    "TRELLIS installation complete",
  );
}

/* ------------------------------------------------------------------ */
/*  PyTorch                                                            */
/* ------------------------------------------------------------------ */

async function installPyTorch(pipPath: string, log: FastifyBaseLogger): Promise<void> {
  const platform = state.environment.platform;
  const args = ["install", "torch==2.6.0", "torchvision==0.21.0"];

  if (platform === "cuda") {
    args.push("--index-url", "https://download.pytorch.org/whl/cu124");
    log.info("Installing PyTorch with CUDA 12.4 support");
  } else {
    args.push("--index-url", "https://download.pytorch.org/whl/cpu");
    log.info("Installing PyTorch CPU-only build (no CUDA detected)");
  }

  await runCommand(pipPath, args, log, TRELLIS_TIMEOUT, TRELLIS_ROOT);
}

/* ------------------------------------------------------------------ */
/*  Basic dependencies                                                 */
/* ------------------------------------------------------------------ */

const TRELLIS_BASIC_DEPS: string[][] = [
  ["imageio", "imageio-ffmpeg", "tqdm", "easydict", "ninja", "trimesh", "zstandard"],
  ["opencv-python-headless", "transformers", "pandas", "lpips"],
  ["gradio==6.0.1", "tensorboard"],
  ["kornia", "timm"],
  ["git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4e43e41e0e0b75c4cdfea1de66bbab1f"],
];

async function installBasicDependencies(pipPath: string, repoPath: string, log: FastifyBaseLogger): Promise<void> {
  try {
    await runCommand(pipPath, ["install", "--upgrade", "pip"], log, TRELLIS_TIMEOUT, repoPath);
  } catch {
    log.warn("pip upgrade failed — continuing with existing version");
  }

  for (let i = 0; i < TRELLIS_BASIC_DEPS.length; i++) {
    const batch = TRELLIS_BASIC_DEPS[i];
    log.info({ batch: i + 1, total: TRELLIS_BASIC_DEPS.length, packages: batch }, "Installing basic dependency batch");
    await runCommand(pipPath, ["install", ...batch], log, TRELLIS_TIMEOUT, repoPath);
  }

  try {
    log.info("Attempting pillow-simd install (performance optimization)");
    await runCommand(pipPath, ["install", "pillow-simd"], log, TRELLIS_TIMEOUT, repoPath);
  } catch {
    log.info("pillow-simd not available — standard Pillow will be used");
  }

  if (await fileExists(resolve(repoPath, "pyproject.toml"))) {
    log.info("Installing TRELLIS repo as editable package (pyproject.toml found)");
    await runCommand(pipPath, ["install", "-e", "."], log, TRELLIS_TIMEOUT, repoPath);
  }
}

/* ------------------------------------------------------------------ */
/*  CUDA extensions                                                    */
/* ------------------------------------------------------------------ */

async function installCudaExtensions(
  pipPath: string,
  gitPath: string,
  repoPath: string,
  log: FastifyBaseLogger,
): Promise<void> {
  const hasCuda = state.environment.platform === "cuda" && state.environment.cudaVersion !== null;

  if (!hasCuda) {
    log.warn(
      "Skipping ALL CUDA extensions — no CUDA toolkit detected. " +
      "Generation will NOT work without these.",
    );
    for (const ext of CUDA_EXTENSIONS) {
      state.extensions[ext.name] = false;
    }
    await persistStatus();
    return;
  }

  const extBuildDir = resolve(TRELLIS_ROOT, "_ext_build");
  await mkdir(extBuildDir, { recursive: true });

  for (const ext of CUDA_EXTENSIONS) {
    try {
      log.info({ extension: ext.name }, "Installing CUDA extension");

      if (ext.subdir) {
        const subPath = resolve(repoPath, ext.subdir);
        if (await fileExists(resolve(subPath, "setup.py")) || await fileExists(resolve(subPath, "pyproject.toml"))) {
          await runCommand(pipPath, ["install", "."], log, TRELLIS_TIMEOUT, subPath);
        } else {
          throw new Error(`No setup.py or pyproject.toml found in ${ext.subdir}`);
        }
      } else if (ext.gitRepo) {
        const extDir = resolve(extBuildDir, ext.name);
        if (!(await isValidRepo(extDir))) {
          await rm(extDir, { recursive: true, force: true }).catch(() => undefined);
          await runCommand(gitPath, ["clone", "--depth", "1", ext.gitRepo, extDir], log, TRELLIS_TIMEOUT, extBuildDir);
        }
        await runCommand(pipPath, ["install", "."], log, TRELLIS_TIMEOUT, extDir);
      } else {
        await runCommand(pipPath, ["install", ext.install], log, TRELLIS_TIMEOUT, TRELLIS_ROOT);
      }

      state.extensions[ext.name] = true;
      log.info({ extension: ext.name }, "CUDA extension installed successfully");
    } catch (err) {
      state.extensions[ext.name] = false;
      log.warn(
        { extension: ext.name, error: err instanceof Error ? err.message : String(err) },
        "CUDA extension install failed — skipping",
      );
    }

    await persistStatus();
  }
}

/* ------------------------------------------------------------------ */
/*  Weights                                                            */
/* ------------------------------------------------------------------ */

async function downloadWeights(pipPath: string, log: FastifyBaseLogger): Promise<void> {
  try {
    await runCommand(pipPath, ["install", "huggingface-hub"], log, TRELLIS_TIMEOUT, TRELLIS_ROOT);

    const venvPython = resolve(VENV_PATH, "bin/python");
    const downloadScript = `
import os
from huggingface_hub import snapshot_download
target = os.environ.get("TRELLIS_WEIGHTS_PATH", "${WEIGHTS_PATH}")
print(f"Downloading TRELLIS.2-4B weights to {target}")
snapshot_download(
    repo_id="microsoft/TRELLIS.2-4B",
    local_dir=target,
    ignore_patterns=["*.md", "*.txt", ".gitattributes"],
)
print("Weight download complete")
`;

    await runCommand(
      venvPython,
      ["-c", downloadScript],
      log,
      TRELLIS_TIMEOUT * 5,
      TRELLIS_ROOT,
    );

    state.weightsDownloaded = true;
    log.info({ path: WEIGHTS_PATH }, "Pretrained weights downloaded successfully");
  } catch (err) {
    state.weightsDownloaded = false;
    log.warn(
      { error: err instanceof Error ? err.message : String(err) },
      "Failed to download pretrained weights",
    );
  }

  await persistStatus();
}

/* ------------------------------------------------------------------ */
/*  Runtime binary resolution                                          */
/* ------------------------------------------------------------------ */

async function refreshRuntimeDependencies(log?: FastifyBaseLogger): Promise<void> {
  for (const binary of RUNTIME_BINARY_NAMES) {
    try {
      const path = await resolveRuntimeBinary(binary);
      state.runtimeDependencies[binary] = path;
      log?.info({ binary, path }, "Resolved TRELLIS runtime binary");
    } catch (err) {
      state.runtimeDependencies[binary] = undefined;
      log?.warn(
        { binary, error: err instanceof Error ? err.message : String(err) },
        "Failed to resolve TRELLIS runtime binary",
      );
    }
  }
  await persistStatus();
}

async function resolveRuntimeBinary(binary: RuntimeBinaryName): Promise<string> {
  return new Promise((resolvePath, reject) => {
    let proc: ChildProcess;
    let stdout = "";
    let stderr = "";
    let killed = false;

    try {
      proc = spawn(SHELL_PATH, ["-lc", `command -v ${binary} || which ${binary}`], {
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      reject(new Error(`Failed to resolve binary path for ${binary}: ${err instanceof Error ? err.message : String(err)}`));
      return;
    }

    proc.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 5000);
      reject(new Error(`Timed out while resolving binary path for ${binary}`));
    }, 10_000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) return;
      const resolvedPath = stdout.trim().split("\n").find(Boolean);
      if (code === 0 && resolvedPath?.startsWith("/")) {
        resolvePath(resolvedPath);
        return;
      }
      reject(new Error(`Unable to resolve binary path for ${binary}${stderr.trim() ? `: ${stderr.trim()}` : ""}`));
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Binary path resolution failed for ${binary}: ${err.message}`));
    });
  });
}

async function requireRuntimeBinary(binary: RuntimeBinaryName, log: FastifyBaseLogger): Promise<string> {
  const resolvedPath = state.runtimeDependencies[binary];
  if (resolvedPath) return resolvedPath;

  await refreshRuntimeDependencies(log);
  const refreshedPath = state.runtimeDependencies[binary];
  if (refreshedPath) return refreshedPath;

  throw new Error(
    `TRELLIS runtime dependency could not be resolved: ${binary}.`,
  );
}

async function requireExecutable(path: string, label: string): Promise<string> {
  const executable = await stat(path).catch(() => null);
  if (!executable) {
    throw new Error(`${label} not found at expected path: ${path}`);
  }
  return path;
}

async function detectGpuViaPyTorch(log: FastifyBaseLogger, pythonPath: string): Promise<boolean> {
  try {
    await runCommand(pythonPath, ["-c", "import torch; assert torch.cuda.is_available()"], log, TRELLIS_TIMEOUT, TRELLIS_ROOT);
    log.info("GPU detected via PyTorch — TRELLIS will use CUDA acceleration");
    return true;
  } catch {
    log.warn("No GPU detected via PyTorch — TRELLIS will run in CPU mode (slower)");
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

function runCommandCapture(
  commandPath: string,
  args: string[],
  log?: FastifyBaseLogger,
  timeout = 15_000,
): Promise<string> {
  return new Promise((resolveP, reject) => {
    let proc: ChildProcess;
    let stdout = "";
    let killed = false;

    try {
      proc = spawn(commandPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      reject(new Error(`Failed to spawn: ${commandPath} — ${err instanceof Error ? err.message : String(err)}`));
      return;
    }

    proc.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr?.on("data", () => { /* discard */ });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      reject(new Error(`Command timed out: ${commandPath}`));
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code === 0) resolveP(stdout);
      else reject(new Error(`Command failed (exit ${code}): ${commandPath}`));
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Command error: ${commandPath} — ${err.message}`));
    });
  });
}

function runCommand(
  commandPath: string,
  args: string[],
  log: FastifyBaseLogger,
  timeout = 600_000,
  cwd = REPO_PATH,
): Promise<void> {
  return new Promise((resolveP, reject) => {
    let proc: ChildProcess;
    let killed = false;

    log.info({ commandPath, args, cwd }, "Running TRELLIS command");

    try {
      proc = spawn(commandPath, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      reject(new Error(`Failed to spawn command: ${commandPath} (cwd: ${cwd}) — ${err instanceof Error ? err.message : String(err)}`));
      return;
    }

    let stderr = "";

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 10_000) stderr = stderr.slice(-5_000);
    });

    proc.stdout?.on("data", (chunk: Buffer) => {
      const output = chunk.toString().trim();
      if (output) {
        log.debug({ commandPath, output }, "TRELLIS command stdout");
      }
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 5000);
      reject(new Error(`Command timed out after ${timeout / 1000}s: ${commandPath}`));
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (killed) return;
      if (code === 0) resolveP();
      else reject(new Error(`Command failed (exit ${code}): ${commandPath} ${args.join(" ")}\n${stderr.slice(-500)}`));
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Command error: ${commandPath} (cwd: ${cwd}) — ${err.message}`));
    });
  });
}
