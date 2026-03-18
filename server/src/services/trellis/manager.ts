/**
 * TRELLIS Engine Manager (v2.3.6)
 *
 * Manages the lifecycle of the TRELLIS.2 3D generation engine:
 * - Installation (clone, venv, deps, weights)
 * - Subprocess execution with retry and timeout safety
 * - Status tracking with GPU detection
 *
 * Directory layout under TRELLIS_ROOT (/data/trellis):
 *   status.json   — persisted state (always safe to write)
 *   repo/         — git clone of TRELLIS.2 source
 *   venv/         — Python virtual environment
 *   workspace/    — scratch space for generation runs
 *
 * TRELLIS is NOT assumed to have an HTTP API — we run it as a subprocess
 * with structured CLI inputs and outputs.
 */

import { access, readFile, writeFile, mkdir, stat, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { FastifyBaseLogger } from "fastify";
import type { TrellisStatusResponse } from "../../types/generate.js";

/** Root directory for all TRELLIS data (state, repo, venv, workspace). */
const TRELLIS_ROOT = resolve(process.env.TRELLIS_PATH || "/data/trellis");

/** Sub-paths under TRELLIS_ROOT */
const REPO_PATH = resolve(TRELLIS_ROOT, "repo");
const VENV_PATH = resolve(TRELLIS_ROOT, "venv");
const WORKSPACE_PATH = resolve(TRELLIS_ROOT, "workspace");
const STATUS_FILE = resolve(TRELLIS_ROOT, "status.json");
const SHELL_PATH = "/bin/sh";

const TRELLIS_TIMEOUT = Number(process.env.TRELLIS_TIMEOUT || 120) * 1000;
const TRELLIS_MAX_RETRIES = Number(process.env.TRELLIS_MAX_RETRIES || 2);
const RUNTIME_BINARY_NAMES = ["git", "python3", "pip3"] as const;

type RuntimeBinaryName = (typeof RUNTIME_BINARY_NAMES)[number];
type RuntimeDependencyState = Record<RuntimeBinaryName, string | undefined>;

interface TrellisState {
  installed: boolean;
  running: boolean;
  gpu: boolean;
  version?: string;
  installing: boolean;
  installProgress: number;
  error?: string;
  runtimeDependencies: RuntimeDependencyState;
}

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
    };
  } catch {
    // First run — no status file yet
  }

  await refreshRuntimeDependencies().catch(() => undefined);
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

/**
 * Check whether a directory looks like a valid TRELLIS git repo.
 */
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

  const gitPath = await requireRuntimeBinary("git", log);
  const python3Path = await requireRuntimeBinary("python3", log);
  await requireRuntimeBinary("pip3", log);

  log.info({ root: TRELLIS_ROOT, runtimeDependencies: state.runtimeDependencies }, "Starting TRELLIS installation");

  await mkdir(TRELLIS_ROOT, { recursive: true });
  await mkdir(WORKSPACE_PATH, { recursive: true });

  state.installProgress = 10;
  if (await isValidRepo(REPO_PATH)) {
    log.info("Step 1/4: Repository already exists — skipping clone");
  } else {
    try {
      const repoStat = await stat(REPO_PATH).catch(() => null);
      if (repoStat) {
        log.warn("Step 1/4: Invalid repo directory found — removing and re-cloning");
        await rm(REPO_PATH, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup errors
    }

    log.info({ gitPath }, "Step 1/4: Cloning TRELLIS.2 repository");
    await runCommand(
      gitPath,
      ["clone", "--depth", "1", "https://github.com/microsoft/TRELLIS.2.git", REPO_PATH],
      log,
      TRELLIS_TIMEOUT,
      TRELLIS_ROOT,
    );
  }

  state.installProgress = 30;
  const venvPython = resolve(VENV_PATH, "bin/python");
  const venvExists = await stat(venvPython).catch(() => null);
  if (venvExists) {
    log.info("Step 2/4: Virtual environment already exists — skipping");
  } else {
    log.info({ python3Path }, "Step 2/4: Creating Python virtual environment");
    await runCommand(python3Path, ["-m", "venv", VENV_PATH], log, TRELLIS_TIMEOUT, TRELLIS_ROOT);
  }

  state.installProgress = 50;
  log.info("Step 3/5: Installing basic dependencies");
  const venvPip = await requireExecutable(resolve(VENV_PATH, "bin/pip"), "TRELLIS virtual environment pip");
  await installRepoDependencies(venvPip, REPO_PATH, log);

  state.installProgress = 70;
  log.info("Step 4/5: Attempting GPU extensions");
  await installGpuExtensions(venvPip, log);

  state.installProgress = 90;
  log.info("Step 5/5: Downloading model weights");
  // TODO: Implement actual weight download when TRELLIS.2 docs clarify the method

  const runtimePython = await requireExecutable(resolve(VENV_PATH, "bin/python"), "TRELLIS virtual environment python");
  state.installed = true;
  state.installing = false;
  state.installProgress = 100;
  state.version = "2.0";
  state.error = undefined;
  state.gpu = await detectGpu(log, runtimePython);

  await persistStatus();
  log.info({ gpu: state.gpu, runtimeDependencies: state.runtimeDependencies }, "TRELLIS installation complete");
}

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
async function detectGpu(log: FastifyBaseLogger, pythonPath: string): Promise<boolean> {
  try {
    await runCommand(pythonPath, ["-c", "import torch; assert torch.cuda.is_available()"], log, TRELLIS_TIMEOUT, TRELLIS_ROOT);
    log.info("GPU detected — TRELLIS will use CUDA acceleration");
    return true;
  } catch {
    log.warn("No GPU detected — TRELLIS will run in CPU mode (slower)");
    return false;
  }
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
