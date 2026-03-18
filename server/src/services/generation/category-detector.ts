/**
 * Asset Category Detector (v2.3.0)
 *
 * Best-effort automatic classification of generated assets into
 * broad furniture categories using geometry heuristics.
 *
 * Never blocks the pipeline — returns "other" on uncertainty.
 */

import type { FastifyBaseLogger } from "fastify";

export type AssetCategory =
  | "chair"
  | "table"
  | "sofa"
  | "lamp"
  | "storage"
  | "decor"
  | "other";

interface BBox {
  width: number;
  height: number;
  depth: number;
}

interface CategorySignal {
  category: AssetCategory;
  confidence: number;
}

/**
 * Detect the most likely furniture category from a GLB buffer.
 * Uses bounding box proportions and geometry distribution heuristics.
 */
export async function detectCategory(
  glbBuffer: Uint8Array,
  log: FastifyBaseLogger,
): Promise<{ category: AssetCategory; confidence: number }> {
  try {
    const { NodeIO } = await import("@gltf-transform/core");
    const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");

    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const doc = await io.readBinary(glbBuffer);
    const root = doc.getRoot();

    const bbox = computeBBox(root);
    const triCount = countTriangles(root);
    const signal = classifyByProportions(bbox, triCount);

    log.info(
      { category: signal.category, confidence: signal.confidence.toFixed(2), bbox },
      "Category detection result",
    );

    return signal;
  } catch (err) {
    log.warn({ err }, "Category detection failed — defaulting to 'other'");
    return { category: "other", confidence: 0 };
  }
}

function computeBBox(root: import("@gltf-transform/core").Root): BBox {
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

  return {
    width: max[0] - min[0],
    height: max[1] - min[1],
    depth: max[2] - min[2],
  };
}

function countTriangles(root: import("@gltf-transform/core").Root): number {
  let count = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      if (indices) count += indices.getCount() / 3;
    }
  }
  return count;
}

/**
 * Heuristic classification based on bounding box aspect ratios.
 * These are rough rules of thumb for common furniture proportions.
 */
function classifyByProportions(bbox: BBox, _triCount: number): CategorySignal {
  const { width, height, depth } = bbox;
  if (width === 0 && height === 0 && depth === 0) {
    return { category: "other", confidence: 0 };
  }

  const aspectWH = width / Math.max(height, 0.001);
  const aspectWD = width / Math.max(depth, 0.001);
  const isFlat = height < width * 0.15 && height < depth * 0.15;
  const isTall = height > width * 2.5 && height > depth * 2.5;

  // Table: wide/deep, relatively short
  if (isFlat && width > 0.3 && depth > 0.3) {
    return { category: "table", confidence: 0.65 };
  }

  // Lamp: very tall and narrow
  if (isTall) {
    return { category: "lamp", confidence: 0.6 };
  }

  // Sofa: wide, medium height, deep
  if (aspectWH > 1.5 && aspectWH < 4 && aspectWD > 0.8 && aspectWD < 2) {
    return { category: "sofa", confidence: 0.55 };
  }

  // Chair: roughly cubic to slightly tall
  if (aspectWH > 0.5 && aspectWH < 1.5 && height > 0.3) {
    return { category: "chair", confidence: 0.5 };
  }

  // Storage: tall box-like
  if (height > width * 1.2 && height > depth * 1.2 && !isTall) {
    return { category: "storage", confidence: 0.45 };
  }

  // Small objects → decor
  if (Math.max(width, height, depth) < 0.3) {
    return { category: "decor", confidence: 0.4 };
  }

  return { category: "other", confidence: 0.3 };
}
