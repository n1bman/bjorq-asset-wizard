/**
 * TRELLIS Engine Manager (v2.3.9)
 *
 * Manages the lifecycle of the TRELLIS.2 3D generation engine:
 * - Environment capability detection (GPU, CUDA, disk)
 * - Installation (clone --recursive, venv, deps matching official setup.sh, weights)
 * - Subprocess execution with retry and timeout safety
 * - Honest status reporting of what the environment can/cannot support
 *
 * Directory layout under TRELLIS_ROOT (/data/trellis):
 *   status.json   — persisted state (always safe to write)
 *   repo/         — git clone --recursive of TRELLIS.2 source
 *   venv/         — Python virtual environment
 *   workspace/    — scratch space for generation runs
 *   weights/      — pretrained model weights
 *
 * IMPORTANT: Full TRELLIS.2 runtime requires:
 *   - Linux + NVIDIA GPU with 24GB+ VRAM
 *   - CUDA Toolkit 12.4 for compiling native extensions
 *   - ~15GB+ disk for model weights
 * The addon container may NOT satisfy these requirements.
 */

import { access, readFile, writeFile, mkdir, stat, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { FastifyBaseLogger } from "fastify";
import type { TrellisStatusResponse, TrellisEnvironment } from "../../types/generate.js";

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

/**
 * CUDA extension definitions — mirrors the official TRELLIS.2 setup.sh.
 * Each extension has a name, pip install method, and whether it strictly requires CUDA.
 */
interface CudaExtensionDef {
  name: string;
  /** pip install argument (package name, URL, or path) */
  install: string;
  /** If true, requires CUDA toolkit (nvcc) to compile */
  requiresCuda: boolean;
  /** If true, clone a separate git repo first */
  gitRepo?: string;
  /** Subdirectory within cloned repo to install from */
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

const startupInitialization = initializeTrellisState();

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

export function getTrellisStatus(): TrellisStatusResponse {
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
  };
}

export function startTrellisInstall(log: FastifyBaseLogger): void {
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

/* ------------------------------------------------------------------ */
/*  Environment capability detection                                   */
/* ------------------------------------------------------------------ */

async function detectEnvironmentCapabilities(log?: FastifyBaseLogger): Promise<void> {
  const env: TrellisEnvironment = {
    platform: "cpu-only",
    gpu: null,
    cudaVersion: null,
    meetsRequirements: false,
    missingRequirements: [],
  };

  // Check nvidia-smi for GPU info
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

  // Check CUDA toolkit (nvcc)
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

  // Check disk space on TRELLIS_ROOT parent
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

/* ------------------------------------------------------------------ */
/*  Installation pipeline                                              */
/* ------------------------------------------------------------------ */

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

  // Step 1/6: Clone with --recursive (required for submodules like o-voxel)
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
    } catch {
      // ignore cleanup errors
    }

    log.info({ gitPath }, "Step 1/6: Cloning TRELLIS.2 repository (--recursive for submodules)");
    await runCommand(
      gitPath,
      ["clone", "--recursive", "--depth", "1", "https://github.com/microsoft/TRELLIS.2.git", REPO_PATH],
      log,
      TRELLIS_TIMEOUT,
      TRELLIS_ROOT,
    );
  }

  // Step 2/6: Create virtual environment
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

  // Step 3/6: Install PyTorch with correct index URL
  state.installProgress = 25;
  await persistStatus();
  log.info("Step 3/6: Installing PyTorch");
  await installPyTorch(venvPip, log);

  // Step 4/6: Install basic dependencies (mirrors setup.sh --basic)
  state.installProgress = 45;
  await persistStatus();
  log.info("Step 4/6: Installing basic dependencies (setup.sh --basic)");
  await installBasicDependencies(venvPip, REPO_PATH, log);

  // Step 5/6: Install CUDA extensions (each may fail gracefully)
  state.installProgress = 65;
  await persistStatus();
  log.info("Step 5/6: Installing CUDA extensions");
  await installCudaExtensions(venvPip, gitPath, REPO_PATH, log);

  // Step 6/6: Download pretrained weights
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

  // Re-check GPU via PyTorch
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
/*  PyTorch installation                                               */
/* ------------------------------------------------------------------ */

async function installPyTorch(pipPath: string, log: FastifyBaseLogger): Promise<void> {
  const platform = state.environment.platform;
  const args = ["install", "torch==2.6.0", "torchvision==0.21.0"];

  if (platform === "cuda") {
    // Use CUDA 12.4 index
    args.push("--index-url", "https://download.pytorch.org/whl/cu124");
    log.info("Installing PyTorch with CUDA 12.4 support");
  } else {
    // CPU-only build (much smaller download)
    args.push("--index-url", "https://download.pytorch.org/whl/cpu");
    log.info("Installing PyTorch CPU-only build (no CUDA detected)");
  }

  await runCommand(pipPath, args, log, TRELLIS_TIMEOUT, TRELLIS_ROOT);
}

/* ------------------------------------------------------------------ */
/*  Basic dependency installation (mirrors setup.sh --basic)           */
/* ------------------------------------------------------------------ */

/**
 * Basic dependencies from the official TRELLIS.2 setup.sh --basic target.
 * Split into batches to isolate failures and provide clear logging.
 */
const TRELLIS_BASIC_DEPS: string[][] = [
  // Batch 1: core utilities
  ["imageio", "imageio-ffmpeg", "tqdm", "easydict", "ninja", "trimesh", "zstandard"],
  // Batch 2: ML/vision
  ["opencv-python-headless", "transformers", "pandas", "lpips"],
  // Batch 3: web UI (pinned version from setup.sh)
  ["gradio==6.0.1", "tensorboard"],
  // Batch 4: deep learning utilities
  ["kornia", "timm"],
  // Batch 5: utils3d from git (pinned commit from setup.sh)
  ["git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4e43e41e0e0b75c4cdfea1de66bbab1f"],
];

async function installBasicDependencies(pipPath: string, repoPath: string, log: FastifyBaseLogger): Promise<void> {
  // First upgrade pip itself
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

  // Try to install pillow-simd for performance (falls back to pillow)
  try {
    log.info("Attempting pillow-simd install (performance optimization)");
    await runCommand(pipPath, ["install", "pillow-simd"], log, TRELLIS_TIMEOUT, repoPath);
  } catch {
    log.info("pillow-simd not available — standard Pillow will be used");
  }

  // Install the TRELLIS repo itself if it has a pyproject.toml
  if (await fileExists(resolve(repoPath, "pyproject.toml"))) {
    log.info("Installing TRELLIS repo as editable package (pyproject.toml found)");
    await runCommand(pipPath, ["install", "-e", "."], log, TRELLIS_TIMEOUT, repoPath);
  }
}

/* ------------------------------------------------------------------ */
/*  CUDA extensions (each may fail gracefully)                         */
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
      "TRELLIS.2 requires nvdiffrast, nvdiffrec, CuMesh, FlexGEMM, o-voxel, and flash-attn " +
      "which all need CUDA to compile. Generation will NOT work without these.",
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
      log.info({ extension: ext.name, requiresCuda: ext.requiresCuda }, "Installing CUDA extension");

      if (ext.subdir) {
        // Build from repo submodule (e.g. o-voxel)
        const subPath = resolve(repoPath, ext.subdir);
        if (await fileExists(resolve(subPath, "setup.py")) || await fileExists(resolve(subPath, "pyproject.toml"))) {
          await runCommand(pipPath, ["install", "."], log, TRELLIS_TIMEOUT, subPath);
        } else {
          throw new Error(`No setup.py or pyproject.toml found in ${ext.subdir}`);
        }
      } else if (ext.gitRepo) {
        // Clone and build from external git repo
        const extDir = resolve(extBuildDir, ext.name);
        if (!(await isValidRepo(extDir))) {
          await rm(extDir, { recursive: true, force: true }).catch(() => undefined);
          await runCommand(gitPath, ["clone", "--depth", "1", ext.gitRepo, extDir], log, TRELLIS_TIMEOUT, extBuildDir);
        }
        await runCommand(pipPath, ["install", "."], log, TRELLIS_TIMEOUT, extDir);
      } else {
        // Direct pip install (e.g. flash-attn)
        await runCommand(pipPath, ["install", ext.install], log, TRELLIS_TIMEOUT, TRELLIS_ROOT);
      }

      state.extensions[ext.name] = true;
      log.info({ extension: ext.name }, "CUDA extension installed successfully");
    } catch (err) {
      state.extensions[ext.name] = false;
      log.warn(
        { extension: ext.name, error: err instanceof Error ? err.message : String(err) },
        "CUDA extension install failed — skipping (generation may not work)",
      );
    }

    await persistStatus();
  }
}

/* ------------------------------------------------------------------ */
/*  Pretrained model weights                                           */
/* ------------------------------------------------------------------ */

async function downloadWeights(pipPath: string, log: FastifyBaseLogger): Promise<void> {
  try {
    // Ensure huggingface-hub is installed
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
      TRELLIS_TIMEOUT * 5, // weights can be very large — allow 25 min
      TRELLIS_ROOT,
    );

    state.weightsDownloaded = true;
    log.info({ path: WEIGHTS_PATH }, "Pretrained weights downloaded successfully");
  } catch (err) {
    state.weightsDownloaded = false;
    log.warn(
      { error: err instanceof Error ? err.message : String(err) },
      "Failed to download pretrained weights — model will not be able to generate. " +
      "You may need to download weights manually or ensure network access to huggingface.co",
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
        {
          binary,
          error: err instanceof Error ? err.message : String(err),
        },
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

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

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

      reject(
        new Error(
          `Unable to resolve binary path for ${binary}${stderr.trim() ? `: ${stderr.trim()}` : ""}`,
        ),
      );
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Binary path resolution failed for ${binary}: ${err.message}`));
    });
  });
}

async function requireRuntimeBinary(binary: RuntimeBinaryName, log: FastifyBaseLogger): Promise<string> {
  const resolvedPath = state.runtimeDependencies[binary];
  if (resolvedPath) {
    return resolvedPath;
  }

  await refreshRuntimeDependencies(log);
  const refreshedPath = state.runtimeDependencies[binary];
  if (refreshedPath) {
    return refreshedPath;
  }

  throw new Error(
    `TRELLIS runtime dependency could not be resolved to an absolute path: ${binary}. ` +
      `Startup checks may pass, but child_process.spawn() requires a concrete executable path for TRELLIS commands.`,
  );
}

async function requireExecutable(path: string, label: string): Promise<string> {
  const executable = await stat(path).catch(() => null);
  if (!executable) {
    throw new Error(`${label} not found at expected path: ${path}`);
  }

  return path;
}

/**
 * Detect GPU availability via PyTorch CUDA check.
 */
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

/**
 * Run a shell command and capture stdout (for detection/probing).
 */
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

/**
 * Run a shell command with timeout safety.
 * Never throws unhandled — always returns a controlled error.
 */
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
      reject(
        new Error(
          `Failed to spawn command: ${commandPath} (cwd: ${cwd}) — ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
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

/**
 * Generate a 3D mesh from images using TRELLIS subprocess.
 * Includes automatic retry on failure and output validation.
 */
export async function generateWithTrellis(
  imagePaths: string[],
  outputDir: string,
  log: FastifyBaseLogger,
): Promise<Uint8Array> {
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
