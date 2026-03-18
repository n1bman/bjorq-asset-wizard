/**
 * Scene Compatibility Checker (v2.3.0)
 *
 * Ensures generated assets are immediately usable in 3D scenes:
 * - Scale sanity
 * - Pivot point centered
 * - Floor-aligned (Y=0)
 * - Orientation consistency
 * - Bounding box sanity
 *
 * Auto-fixes issues when possible.
 */

import type { FastifyBaseLogger } from "fastify";

export interface SceneCompatResult {
  compatible: boolean;
  fixes: string[];
  warnings: string[];
  boundingBox: { min: number[]; max: number[]; size: number[] };
}

// Reasonable furniture scale range in meters
const MIN_SIZE = 0.05; // 5cm
const MAX_SIZE = 5.0; // 5m

/**
 * Validate and auto-fix scene compatibility issues.
 * Returns a corrected GLB buffer.
 */
export async function ensureSceneCompatibility(
  glbBuffer: Uint8Array,
  log: FastifyBaseLogger,
): Promise<{ buffer: Uint8Array; result: SceneCompatResult }> {
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.readBinary(glbBuffer);
  const root = doc.getRoot();

  const fixes: string[] = [];
  const warnings: string[] = [];

  // Compute bounding box
  const bbox = computeBBox(root);
  const size = [
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2],
  ];

  // --- Fix 1: Center pivot (XZ) ---
  const centerX = (bbox.min[0] + bbox.max[0]) / 2;
  const centerZ = (bbox.min[2] + bbox.max[2]) / 2;
  if (Math.abs(centerX) > 0.01 || Math.abs(centerZ) > 0.01) {
    for (const node of root.listNodes()) {
      const t = node.getTranslation();
      node.setTranslation([t[0] - centerX, t[1], t[2] - centerZ]);
    }
    fixes.push(`Centered pivot (shifted X:${centerX.toFixed(3)}, Z:${centerZ.toFixed(3)})`);
  }

  // --- Fix 2: Floor alignment (Y=0) ---
  if (Math.abs(bbox.min[1]) > 0.005) {
    const yShift = -bbox.min[1];
    for (const node of root.listNodes()) {
      const t = node.getTranslation();
      node.setTranslation([t[0], t[1] + yShift, t[2]]);
    }
    fixes.push(`Floor-aligned (shifted Y:${yShift.toFixed(3)})`);
  }

  // --- Fix 3: Scale sanity ---
  const maxDim = Math.max(...size);
  if (maxDim > 0 && (maxDim < MIN_SIZE || maxDim > MAX_SIZE)) {
    // Scale to 1m max dimension as reasonable default
    const targetSize = 1.0;
    const scaleFactor = targetSize / maxDim;
    for (const node of root.listNodes()) {
      if (node.getParentNode() === null) {
        const s = node.getScale();
        node.setScale([s[0] * scaleFactor, s[1] * scaleFactor, s[2] * scaleFactor]);
      }
    }
    fixes.push(`Rescaled (factor: ${scaleFactor.toFixed(3)}, was ${maxDim.toFixed(3)}m)`);
  }

  // --- Check: Orientation consistency ---
  // Expect Y-up (glTF standard)
  if (size[1] > 0 && size[1] < size[0] * 0.05 && size[1] < size[2] * 0.05) {
    warnings.push("Asset appears extremely flat — may be oriented incorrectly");
  }

  // --- Check: Extreme aspect ratios ---
  const sorted = [...size].sort((a, b) => b - a);
  if (sorted[0] > 0 && sorted[2] > 0 && sorted[0] / sorted[2] > 20) {
    warnings.push("Extreme aspect ratio detected — asset may look unusual in scene");
  }

  const compatible = fixes.length === 0 && warnings.length === 0;

  if (fixes.length > 0) {
    log.info({ fixes }, "Scene compatibility: auto-fixes applied");
  }
  if (warnings.length > 0) {
    log.warn({ warnings }, "Scene compatibility: warnings");
  }

  const outputBuffer = await io.writeBinary(doc);

  return {
    buffer: outputBuffer,
    result: {
      compatible,
      fixes,
      warnings,
      boundingBox: { min: bbox.min, max: bbox.max, size },
    },
  };
}

function computeBBox(root: import("@gltf-transform/core").Root) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      for (let i = 0; i < pos.getCount(); i++) {
        const v = pos.getElement(i, [0, 0, 0]);
        for (let j = 0; j < 3; j++) {
          if (v[j] < min[j]) min[j] = v[j];
          if (v[j] > max[j]) max[j] = v[j];
        }
      }
    }
  }

  return { min, max };
}
