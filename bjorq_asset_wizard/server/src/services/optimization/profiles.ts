/**
 * Target profile derivation for optimized assets.
 *
 * Profiles help users decide where an asset is suitable
 * for deployment (mobile, tablet, wall display, desktop, heavy).
 */

export type TargetProfile = "mobile" | "tablet" | "wall" | "desktop" | "heavy";

export function deriveTargetProfile(
  triangles: number,
  fileSizeKB: number,
  placement?: string,
): TargetProfile {
  const sizeMB = fileSizeKB / 1024;

  // Wall-mounted assets have tighter limits
  if (placement === "wall" && triangles < 25000 && sizeMB < 5) return "wall";

  if (triangles < 10000 && sizeMB < 2) return "mobile";
  if (triangles < 50000 && sizeMB < 10) return "tablet";
  if (triangles < 100000 && sizeMB < 25) return "desktop";
  return "heavy";
}
