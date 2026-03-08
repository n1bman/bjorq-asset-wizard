/**
 * Storage path helpers and initialization.
 *
 * Reads STORAGE_PATH and CATALOG_PATH from environment variables
 * and ensures all required directories exist on startup.
 */

import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const STORAGE_PATH = process.env.STORAGE_PATH || "./storage";
export const CATALOG_PATH = process.env.CATALOG_PATH || "./public/catalog";

/** All directories that must exist for the service to operate. */
const REQUIRED_DIRS = [
  join(STORAGE_PATH, "uploads"),
  join(STORAGE_PATH, "jobs"),
  join(STORAGE_PATH, "originals"),
  join(STORAGE_PATH, "optimized"),
  join(STORAGE_PATH, "thumbs"),
  join(STORAGE_PATH, "catalog"),
  CATALOG_PATH,
];

/** Create all required storage directories. Safe to call multiple times. */
export async function initStorage(): Promise<void> {
  for (const dir of REQUIRED_DIRS) {
    await mkdir(dir, { recursive: true });
  }
}

/** Resolve a path relative to the storage root. */
export function storagePath(...segments: string[]): string {
  return join(STORAGE_PATH, ...segments);
}

/** Resolve a path relative to the catalog root. */
export function catalogPath(...segments: string[]): string {
  return join(CATALOG_PATH, ...segments);
}
