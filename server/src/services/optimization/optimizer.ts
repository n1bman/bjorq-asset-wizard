/**
 * Bjorq Asset Wizard — V1 Optimization Service
 *
 * Conservative cleanup of GLB/glTF models using @gltf-transform/functions.
 * No destructive operations: no decimation, no texture resize, no Draco.
 */

import { NodeIO, Document } from "@gltf-transform/core";
import { prune, dedup } from "@gltf-transform/functions";
import { analyzeModel } from "../analysis/analyzer.js";
import type { OptimizeRequestOptions, OptimizeResult, StatsSnapshot } from "../../types/optimize.js";
import type { AnalysisResult } from "../../types/analyze.js";
import type { FastifyBaseLogger } from "fastify";

// V1 options that are not yet implemented
const V1_SKIPPED: { key: keyof OptimizeRequestOptions; reason: string }[] = [
  { key: "normalizeScale", reason: "Not implemented in V1" },
  { key: "normalizeOrigin", reason: "Not implemented in V1" },
  { key: "setFloorToY0", reason: "Not implemented in V1" },
  { key: "maxTextureSize", reason: "Texture resize not implemented in V1" },
  { key: "optimizeBaseColorTextures", reason: "Texture optimization not implemented in V1" },
  { key: "textureQuality", reason: "Texture compression not implemented in V1" },
  { key: "generateThumbnail", reason: "Thumbnail generation not implemented in V1" },
  { key: "removeUnusedVertexAttributes", reason: "Not implemented in V1" },
];

/** Map skipped reason patterns to human-readable explanations */
const EXPLANATION_MAP: Record<string, string> = {
  "No cameras found": "No cameras present in the model",
  "No lights found": "No lights present in the model",
  "No animations found": "No animations present in the model",
  "No empty nodes found": "No empty nodes found — scene graph is clean",
};

function toSnapshot(analysis: AnalysisResult, sizeBytes: number): StatsSnapshot {
  const maxRes = analysis.textures.details.reduce((max, t) => {
    const w = t.width ?? 0;
    const h = t.height ?? 0;
    return Math.max(max, w, h);
  }, 0);

  return {
    fileSizeKB: Math.round(sizeBytes / 1024),
    triangles: analysis.geometry.triangleCount,
    materials: analysis.materials.count,
    textures: analysis.textures.count,
    maxTextureRes: maxRes,
  };
}

/** Generate human-readable explanations from skipped operations */
function generateExplanations(
  skipped: { operation: string; reason: string }[],
  reduction: { fileSizePercent: number; materialsRemoved: number; texturesRemoved: number },
): string[] {
  const explanations: string[] = [];

  // Explain low/zero reduction
  if (reduction.fileSizePercent <= 0) {
    explanations.push("No file size reduction achieved — model was already well-optimized");
  } else if (reduction.fileSizePercent < 5) {
    explanations.push(`Minimal file size reduction (${reduction.fileSizePercent}%) — model was nearly optimal`);
  }

  if (reduction.materialsRemoved === 0) {
    explanations.push("No duplicate materials detected");
  }

  if (reduction.texturesRemoved === 0) {
    explanations.push("No unused textures found");
  }

  // Map skipped operations (exclude user-disabled and V1-not-implemented)
  for (const entry of skipped) {
    if (entry.reason === "Disabled by user") continue;
    if (entry.reason.includes("Not implemented")) continue;
    if (entry.reason.includes("not implemented")) continue;

    const mapped = EXPLANATION_MAP[entry.reason];
    if (mapped) {
      explanations.push(mapped);
    }
  }

  return explanations;
}

export async function optimizeModel(
  buffer: Uint8Array,
  fileName: string,
  options: OptimizeRequestOptions,
  log: FastifyBaseLogger,
): Promise<OptimizeResult> {
  const applied: string[] = [];
  const skipped: { operation: string; reason: string }[] = [];
  const warnings: { operation: string; message: string }[] = [];

  // 1. Parse document
  const io = new NodeIO();
  const isGlb = fileName.toLowerCase().endsWith(".glb");

  let doc: Document;
  if (isGlb) {
    doc = await io.readBinary(buffer);
  } else {
    const jsonStr = new TextDecoder().decode(buffer);
    const jsonDoc = JSON.parse(jsonStr);
    doc = await io.readJSON({ json: jsonDoc, resources: {} });
  }

  // 2. Before analysis
  const analysisBefore = await analyzeModel(buffer, fileName);
  log.info({ before: toSnapshot(analysisBefore, buffer.byteLength) }, "Before analysis complete");

  // 3. Collect skipped V1 operations that user requested
  for (const entry of V1_SKIPPED) {
    const val = options[entry.key];
    if (val !== undefined && val !== false) {
      skipped.push({ operation: entry.key, reason: entry.reason });
    }
  }

  // 4. Apply transforms based on user options

  // Always-on: prune (remove unused resources)
  await doc.transform(prune());
  applied.push("prune");
  log.info("Applied: prune");

  // Always-on: dedup (deduplicate accessors/meshes/textures)
  await doc.transform(dedup());
  applied.push("dedup");
  log.info("Applied: dedup");

  // Deduplicate materials (explicit user toggle — dedup above handles accessors/meshes,
  // but we log it separately when the user explicitly requests material dedup)
  if (options.deduplicateMaterials !== false) {
    // dedup() already handles materials, so just log it
    applied.push("deduplicateMaterials");
    log.info("Applied: deduplicateMaterials (via dedup)");
  } else {
    skipped.push({ operation: "deduplicateMaterials", reason: "Disabled by user" });
  }

  // Remove cameras
  if (options.removeCameras !== false) {
    const cameras = doc.getRoot().listCameras();
    if (cameras.length > 0) {
      const count = cameras.length;
      cameras.forEach((c) => c.dispose());
      applied.push("removeCameras");
      log.info({ count }, "Applied: removeCameras");
    } else {
      skipped.push({ operation: "removeCameras", reason: "No cameras found" });
    }
  } else {
    skipped.push({ operation: "removeCameras", reason: "Disabled by user" });
  }

  // Remove lights (KHR_lights_punctual on nodes)
  if (options.removeLights !== false) {
    let lightCount = 0;
    for (const node of doc.getRoot().listNodes()) {
      const lightExt = node.getExtension("KHR_lights_punctual");
      if (lightExt) {
        node.setExtension("KHR_lights_punctual", null);
        lightCount++;
      }
    }
    if (lightCount > 0) {
      applied.push("removeLights");
      log.info({ count: lightCount }, "Applied: removeLights");
    } else {
      skipped.push({ operation: "removeLights", reason: "No lights found" });
    }
  } else {
    skipped.push({ operation: "removeLights", reason: "Disabled by user" });
  }

  // Remove animations
  if (options.removeAnimations !== false) {
    const animations = doc.getRoot().listAnimations();
    if (animations.length > 0) {
      const count = animations.length;
      animations.forEach((a) => a.dispose());
      applied.push("removeAnimations");
      log.info({ count }, "Applied: removeAnimations");
    } else {
      skipped.push({ operation: "removeAnimations", reason: "No animations found" });
    }
  } else {
    skipped.push({ operation: "removeAnimations", reason: "Disabled by user" });
  }

  // Remove empty nodes
  if (options.removeEmptyNodes !== false) {
    let removedCount = 0;
    // Iterate until no more empty leaf nodes
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of doc.getRoot().listNodes()) {
        const hasMesh = !!node.getMesh();
        const hasCamera = !!node.getCamera?.();
        const hasSkin = !!node.getSkin?.();
        const hasChildren = node.listChildren().length > 0;
        const hasExtensions = node.listExtensions?.().length > 0;
        if (!hasMesh && !hasCamera && !hasSkin && !hasChildren && !hasExtensions) {
          node.dispose();
          removedCount++;
          changed = true;
          break; // restart iteration since list changed
        }
      }
    }
    if (removedCount > 0) {
      applied.push("removeEmptyNodes");
      log.info({ count: removedCount }, "Applied: removeEmptyNodes");
    } else {
      skipped.push({ operation: "removeEmptyNodes", reason: "No empty nodes found" });
    }
  } else {
    skipped.push({ operation: "removeEmptyNodes", reason: "Disabled by user" });
  }

  // Remove unused nodes (nodes not contributing to scene)
  if (options.removeUnusedNodes !== false) {
    // prune() already handles this, log it
    applied.push("removeUnusedNodes");
    log.info("Applied: removeUnusedNodes (via prune)");
  } else {
    skipped.push({ operation: "removeUnusedNodes", reason: "Disabled by user" });
  }

  // 5. Write optimized GLB
  const optimizedBuffer = await io.writeBinary(doc);
  log.info({ sizeBytes: optimizedBuffer.byteLength }, "Optimized GLB written");

  // 6. After analysis
  const analysisAfter = await analyzeModel(optimizedBuffer, "optimized.glb");

  // 7. Compute stats
  const before = toSnapshot(analysisBefore, buffer.byteLength);
  const after = toSnapshot(analysisAfter, optimizedBuffer.byteLength);

  const reduction = {
    fileSizePercent: before.fileSizeKB > 0
      ? Math.round(((before.fileSizeKB - after.fileSizeKB) / before.fileSizeKB) * 100)
      : 0,
    materialsRemoved: Math.max(0, before.materials - after.materials),
    texturesRemoved: Math.max(0, before.textures - after.textures),
    texturesResized: 0, // V1: no texture resize
  };

  // 8. Generate explanations
  const explanations = generateExplanations(skipped, reduction);

  log.info({ before, after, reduction, explanations }, "Optimization complete");

  return {
    optimizedBuffer,
    before,
    after,
    reduction,
    applied,
    skipped,
    warnings,
    explanations,
    analysisBefore,
    analysisAfter,
  };
}
