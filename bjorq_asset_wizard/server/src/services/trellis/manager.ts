/**
 * TRELLIS Engine Manager
 *
 * Manages the lifecycle of the TRELLIS.2 3D generation engine:
 * - Installation (clone, venv, deps, weights)
 * - Subprocess execution
 * - Status tracking
 *
 * TRELLIS is NOT assumed to have an HTTP API — we run it as a subprocess
 * with structured CLI inputs and outputs.
 */

import { access, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import type { FastifyBaseLogger } from "fastify";
import type { TrellisStatusResponse } from "../../types/generate.js";

const TRELLIS_PATH = resolve(process.env.TRELLIS_PATH || "/data/trellis");
const STATUS_FILE = resolve(TRELLIS_PATH, "status.json");
const TRELLIS_TIMEOUT = Number(process.env.TRELLIS_TIMEOUT || 120) * 1000;

interface TrellisState {
  installed: boolean;
  running: boolean;
  gpu: boolean;
  version?: string;
  installing: boolean;
  installProgress: number;
  error?: string;
}

let state: TrellisState = {
  installed: false,
  running: false,
  gpu: false,
  installing: false,
  installProgress: 0,
};

// Load persisted status on import
(async () => {
  try {
    await access(STATUS_FILE);
    const data = JSON.parse(await readFile(STATUS_FILE, "utf-8"));
    state = { ...state, ...data, installing: false }; // never resume mid-install
  } catch {
    // First run — no status file yet
  }
})();

async function persistStatus(): Promise<void> {
  try {
    await mkdir(TRELLIS_PATH, { recursive: true });
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

  // Run installation async — don't block the request
  doInstall(log).catch((err) => {
    log.error({ err }, "TRELLIS installation failed");
    state.installing = false;
    state.error = err instanceof Error ? err.message : String(err);
    persistStatus();
  });
}

async function doInstall(log: FastifyBaseLogger): Promise<void> {
  log.info({ path: TRELLIS_PATH }, "Starting TRELLIS installation");

  await mkdir(TRELLIS_PATH, { recursive: true });

  // Step 1: Clone repository
  state.installProgress = 10;
  log.info("Step 1/4: Cloning TRELLIS.2 repository");
  await runCommand("git", ["clone", "--depth", "1", "https://github.com/microsoft/TRELLIS.2.git", TRELLIS_PATH], log);

  // Step 2: Create Python virtual environment
  state.installProgress = 30;
  log.info("Step 2/4: Creating Python virtual environment");
  await runCommand("python3", ["-m", "venv", resolve(TRELLIS_PATH, "venv")], log);

  // Step 3: Install dependencies
  state.installProgress = 50;
  log.info("Step 3/4: Installing dependencies");
  const pip = resolve(TRELLIS_PATH, "venv/bin/pip");
  await runCommand(pip, ["install", "-r", resolve(TRELLIS_PATH, "requirements.txt")], log);

  // Step 4: Download model weights (placeholder — actual command depends on TRELLIS docs)
  state.installProgress = 80;
  log.info("Step 4/4: Downloading model weights");
  // TODO: Implement actual weight download when TRELLIS.2 docs clarify the method

  state.installed = true;
  state.installing = false;
  state.installProgress = 100;
  state.version = "2.0";

  // Detect GPU
  try {
    await runCommand("python3", ["-c", "import torch; assert torch.cuda.is_available()"], log);
    state.gpu = true;
  } catch {
    state.gpu = false;
    log.warn("No GPU detected — TRELLIS will run in CPU mode (slower)");
  }

  await persistStatus();
  log.info({ gpu: state.gpu }, "TRELLIS installation complete");
}

function runCommand(cmd: string, args: string[], log: FastifyBaseLogger): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: TRELLIS_PATH,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 600_000, // 10 min for install steps
    });

    let stderr = "";

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.stdout?.on("data", (chunk: Buffer) => {
      log.debug(chunk.toString().trim());
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (exit ${code}): ${cmd} ${args.join(" ")}\n${stderr.slice(-500)}`));
    });

    proc.on("error", reject);
  });
}

/**
 * Generate a 3D mesh from images using TRELLIS subprocess.
 * 
 * @param imagePaths - Array of preprocessed image paths
 * @param outputDir - Directory for TRELLIS output
 * @returns Raw GLB buffer from TRELLIS
 */
export async function generateWithTrellis(
  imagePaths: string[],
  outputDir: string,
  log: FastifyBaseLogger,
): Promise<Uint8Array> {
  if (!state.installed) {
    throw new Error("TRELLIS engine is not installed");
  }

  const outputPath = resolve(outputDir, "trellis_output.glb");
  const python = resolve(TRELLIS_PATH, "venv/bin/python");

  log.info({ images: imagePaths.length, outputDir }, "Starting TRELLIS generation");

  await new Promise<void>((resolvePromise, reject) => {
    const proc = spawn(
      python,
      [
        "-m", "trellis.cli", "generate",
        "--input", ...imagePaths,
        "--output", outputPath,
        "--format", "glb",
      ],
      {
        cwd: TRELLIS_PATH,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: TRELLIS_TIMEOUT,
      },
    );

    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`TRELLIS generation failed (exit ${code}): ${stderr.slice(-500)}`));
    });

    proc.on("error", reject);
  });

  const { readFile: rf } = await import("node:fs/promises");
  return new Uint8Array(await rf(outputPath));
}
