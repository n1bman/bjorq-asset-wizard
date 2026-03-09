/**
 * Job cleanup service — removes stale temporary job data.
 *
 * Runs on server startup and periodically to prevent
 * unbounded growth of /data/storage/jobs.
 *
 * Rules:
 *   - Jobs older than maxAgeDays are removed
 *   - Failed jobs (no result.json) older than 1 day are removed
 *   - Catalog assets are never touched
 */

import { readdir, stat, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { storagePath } from "../../lib/storage.js";

const JOBS_DIR = storagePath("jobs");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CleanupResult {
  scanned: number;
  removed: number;
  errors: number;
  freedBytes: number;
}

/**
 * Clean stale job directories.
 * @param maxAgeDays Remove jobs older than this (default 7)
 * @param failedMaxAgeDays Remove failed jobs (no result.json) older than this (default 1)
 * @param logger Optional logger for per-job removal details
 */
export async function cleanStaleJobs(
  maxAgeDays = 7,
  failedMaxAgeDays = 1,
  logger?: { info: (obj: object, msg: string) => void },
): Promise<CleanupResult> {
  const result: CleanupResult = { scanned: 0, removed: 0, errors: 0, freedBytes: 0 };

  let entries: string[];
  try {
    entries = await readdir(JOBS_DIR);
  } catch {
    return result; // jobs dir doesn't exist yet
  }

  const now = Date.now();

  for (const entry of entries) {
    result.scanned++;
    const jobDir = join(JOBS_DIR, entry);

    try {
      const s = await stat(jobDir);
      if (!s.isDirectory()) continue;

      const ageMs = now - s.mtimeMs;
      const ageDays = ageMs / MS_PER_DAY;

      // Check if job completed (has result.json)
      let hasResult = false;
      try {
        await access(join(jobDir, "result.json"));
        hasResult = true;
      } catch {
        // no result.json — failed or incomplete job
      }

      const shouldRemove = hasResult
        ? ageDays > maxAgeDays
        : ageDays > failedMaxAgeDays;

      if (shouldRemove) {
        // Calculate size before removal
        const dirSize = await getDirSize(jobDir);
        await rm(jobDir, { recursive: true, force: true });
        result.removed++;
        result.freedBytes += dirSize;

        // Log per-job removal details
        if (logger) {
          logger.info(
            {
              jobId: entry,
              ageDays: +ageDays.toFixed(1),
              reason: hasResult ? "expired" : "failed/incomplete",
              freedMB: +(dirSize / (1024 * 1024)).toFixed(2),
            },
            "Removed stale job",
          );
        }
      }
    } catch {
      result.errors++;
    }
  }

  return result;
}

/** Recursively calculate directory size */
async function getDirSize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirSize(fullPath);
      } else {
        try {
          const s = await stat(fullPath);
          total += s.size;
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
  return total;
}

/** Start periodic cleanup. Returns a stop function. */
export function startJobCleanup(
  intervalMs = 6 * 60 * 60 * 1000, // 6 hours
  maxAgeDays = 7,
  failedMaxAgeDays = 1,
  logger?: { info: (obj: object, msg: string) => void },
): () => void {
  const run = async () => {
    const result = await cleanStaleJobs(maxAgeDays, failedMaxAgeDays, logger);
    if (logger) {
      logger.info(
        {
          scanned: result.scanned,
          removed: result.removed,
          errors: result.errors,
          freedMB: +(result.freedBytes / (1024 * 1024)).toFixed(1),
        },
        result.removed > 0 ? "Job cleanup completed" : "Job cleanup scan — nothing to remove",
      );
    }
  };

  // Run immediately on startup
  run().catch(() => { /* ignore startup cleanup errors */ });

  const timer = setInterval(() => {
    run().catch(() => { /* ignore periodic cleanup errors */ });
  }, intervalMs);

  return () => clearInterval(timer);
}
