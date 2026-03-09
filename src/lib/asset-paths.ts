/**
 * Ingress-safe asset URL resolver.
 *
 * Normalizes metadata paths (e.g., /jobs/..., /catalog/files/...) into
 * fetchable URLs relative to the API client's base URL.
 * Never hardcodes http://localhost:3500.
 */

import { apiClient } from "@/services/api-client";

/**
 * Resolve a model URL for a catalog asset by its ID.
 * Uses the dedicated model-serving endpoint.
 */
export function getAssetModelUrl(assetId: string): string {
  return `${apiClient.baseUrl}/catalog/asset/${assetId}/model`;
}

/**
 * Resolve a thumbnail URL for a catalog asset by its ID.
 * Uses the dedicated thumbnail-serving endpoint.
 */
export function getAssetThumbnailUrl(assetId: string): string {
  return `${apiClient.baseUrl}/catalog/asset/${assetId}/thumbnail`;
}

/**
 * Resolve a raw storage path (e.g. /jobs/<id>/optimized.glb) to a fetchable URL.
 * Prepends the API base URL to make it work through HA ingress.
 */
export function resolveStoragePath(path: string | null | undefined): string | null {
  if (!path) return null;
  // Already absolute URL
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Relative path — prepend API base
  return `${apiClient.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
