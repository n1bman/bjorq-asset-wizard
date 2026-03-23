/**
 * Storage path helpers and initialization.
 *
 * Reads STORAGE_PATH and CATALOG_PATH from environment variables
 * and ensures all required directories exist on startup.
 */

import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

export const STORAGE_PATH = process.env.STORAGE_PATH || "/data/storage";
export const CATALOG_PATH = process.env.CATALOG_PATH || "/data/catalog";

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

/** Returns true when the catalog root has no user-facing content yet. */
export async function isCatalogEmpty(): Promise<boolean> {
  try {
    const entries = await readdir(CATALOG_PATH);
    return entries.filter(entry => entry !== "index.json").length === 0;
  } catch {
    return true;
  }
}

/** Seed the live catalog from a bundled read-only catalog when the live catalog is empty. */
export async function seedCatalogIfEmpty(seedPath?: string): Promise<boolean> {
  if (!seedPath) return false;
  if (!(await isCatalogEmpty())) return false;

  try {
    const seedEntries = await readdir(seedPath);
    if (seedEntries.length === 0) return false;

    for (const entry of seedEntries) {
      await cp(join(seedPath, entry), join(CATALOG_PATH, entry), {
        recursive: true,
        force: true,
      });
    }

    return true;
  } catch {
    return false;
  }
}
