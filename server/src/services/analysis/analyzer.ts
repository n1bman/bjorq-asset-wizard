/**
 * Bjorq Asset Wizard — Model Analysis Service
 *
 * Pure in-memory analysis of GLB/glTF files using @gltf-transform/core.
 * No temp files written — buffer in, structured result out.
 * Emits stage-level log messages for HA add-on diagnostics.
 */

import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import type {
  AnalysisResult,
  AnalysisStatus,
  PerformanceRating,
  Recommendation,
  TextureDetail,
} from "../../types/analyze.js";

// ---------------------------------------------------------------------------
// Performance thresholds (triangle count)
// ---------------------------------------------------------------------------

const THRESHOLDS = {
  desktop:  { ok: 500_000, recommended: 1_000_000 },
  tablet:   { ok: 200_000, recommended: 500_000 },
  lowPower: { ok: 100_000, recommended: 200_000 },
} as const;

function ratePerformance(triangles: number, tier: keyof typeof THRESHOLDS): PerformanceRating {
  const t = THRESHOLDS[tier];
  if (triangles < t.ok) return "ok";
  if (triangles < t.recommended) return "optimization_recommended";
  return "optimization_strongly_recommended";
}

// ---------------------------------------------------------------------------
// Bounding box helpers
// ---------------------------------------------------------------------------

type Vec3 = [number, number, number];

function computeBoundingBox(doc: Document): { min: Vec3; max: Vec3 } {
  const globalMin: Vec3 = [Infinity, Infinity, Infinity];
  const globalMax: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const posAccessor = prim.getAttribute("POSITION");
      if (!posAccessor) continue;

      const min = posAccessor.getMin(new Array(3) as number[]);
      const max = posAccessor.getMax(new Array(3) as number[]);

      for (let i = 0; i < 3; i++) {
        if (min[i] < globalMin[i]) globalMin[i] = min[i];
        if (max[i] > globalMax[i]) globalMax[i] = max[i];
      }
    }
  }

  // If no geometry found, zero out
  if (globalMin[0] === Infinity) {
    return { min: [0, 0, 0], max: [0, 0, 0] };
  }

  return {
    min: globalMin,
    max: globalMax,
  };
}

// ---------------------------------------------------------------------------
// Geometry counting
// ---------------------------------------------------------------------------

function countGeometry(doc: Document) {
  let triangleCount = 0;
  let vertexCount = 0;
  let meshCount = 0;

  for (const mesh of doc.getRoot().listMeshes()) {
    meshCount++;
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const position = prim.getAttribute("POSITION");

      if (indices) {
        triangleCount += indices.getCount() / 3;
      } else if (position) {
        triangleCount += position.getCount() / 3;
      }

      if (position) {
        vertexCount += position.getCount();
      }
    }
  }

  return { triangleCount: Math.floor(triangleCount), meshCount, vertexCount };
}

// ---------------------------------------------------------------------------
// Texture extraction (best-effort)
// ---------------------------------------------------------------------------

function extractTextures(doc: Document): TextureDetail[] {
  const details: TextureDetail[] = [];

  for (const texture of doc.getRoot().listTextures()) {
    try {
      const name = texture.getName() || texture.getURI() || `texture_${details.length}`;
      const mimeType = texture.getMimeType() || null;
      const size = texture.getSize();
      const image = texture.getImage();

      details.push({
        name,
        width: size ? size[0] : null,
        height: size ? size[1] : null,
        format: mimeType,
        sizeBytes: image ? image.byteLength : null,
        type: "unknown", // V1: we don't resolve slot type
      });
    } catch {
      // Best-effort: skip this texture's details but still count it
      details.push({
        name: `texture_${details.length}`,
        width: null,
        height: null,
        format: null,
        sizeBytes: null,
        type: "unknown",
      });
    }
  }

  return details;
}

// ---------------------------------------------------------------------------
// Extras detection
// ---------------------------------------------------------------------------

function detectExtras(doc: Document) {
  const root = doc.getRoot();
  const cameras = root.listCameras?.() ?? [];
  const animations = root.listAnimations?.() ?? [];

  // Lights are typically in extensions — count nodes with light extension
  let lightCount = 0;
  let emptyNodeCount = 0;

  for (const node of root.listNodes()) {
    // A node is "empty" if it has no mesh, camera, or children with content
    const hasMesh = !!node.getMesh();
    const hasCamera = !!node.getCamera?.();
    const hasSkin = !!node.getSkin?.();
    const hasChildren = node.listChildren().length > 0;

    if (!hasMesh && !hasCamera && !hasSkin && !hasChildren) {
      emptyNodeCount++;
    }

    // Check for light extensions (KHR_lights_punctual)
    const lightExt = node.getExtension("KHR_lights_punctual");
    if (lightExt) lightCount++;
  }

  return {
    hasCameras: cameras.length > 0,
    hasLights: lightCount > 0,
    hasAnimations: animations.length > 0,
    lightCount,
    cameraCount: cameras.length,
    animationCount: animations.length,
    emptyNodeCount,
  };
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

function generateRecommendations(
  geometry: ReturnType<typeof countGeometry>,
  textures: TextureDetail[],
  materialCount: number,
  extras: ReturnType<typeof detectExtras>,
): Recommendation[] {
  const recs: Recommendation[] = [];

  // High triangle count
  if (geometry.triangleCount >= 200_000) {
    recs.push({
      code: "HIGH_TRIANGLE_COUNT",
      severity: geometry.triangleCount >= 500_000 ? "warning" : "info",
      message: `${geometry.triangleCount.toLocaleString()} triangles — may impact performance on lower-power devices`,
      target: null,
    });
  }

  // Large textures
  for (const tex of textures) {
    if (tex.width && tex.height && (tex.width > 2048 || tex.height > 2048)) {
      recs.push({
        code: "TEXTURE_TOO_LARGE",
        severity: "warning",
        message: `Texture '${tex.name}' is ${tex.width}x${tex.height} — recommend max 2048x2048`,
        target: tex.name,
      });
    }
  }

  // Too many materials
  if (materialCount > 10) {
    recs.push({
      code: "TOO_MANY_MATERIALS",
      severity: "warning",
      message: `${materialCount} materials found — consider merging to reduce draw calls`,
      target: null,
    });
  }

  // Cameras
  if (extras.hasCameras) {
    recs.push({
      code: "CONTAINS_CAMERAS",
      severity: "info",
      message: `${extras.cameraCount} camera(s) found — typically not needed for asset usage`,
      target: null,
    });
  }

  // Lights
  if (extras.hasLights) {
    recs.push({
      code: "CONTAINS_LIGHTS",
      severity: "info",
      message: `${extras.lightCount} light(s) found — typically not needed for asset usage`,
      target: null,
    });
  }

  // Animations
  if (extras.hasAnimations) {
    recs.push({
      code: "CONTAINS_ANIMATIONS",
      severity: "info",
      message: `${extras.animationCount} animation(s) found — may not be needed for static assets`,
      target: null,
    });
  }

  // Empty nodes
  if (extras.emptyNodeCount > 0) {
    const isMany = extras.emptyNodeCount > 10;
    recs.push({
      code: isMany ? "MANY_EMPTY_NODES" : "EMPTY_NODES",
      severity: isMany ? "warning" : "info",
      message: `${extras.emptyNodeCount} empty node(s) found — can be safely removed`,
      target: null,
    });
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

export async function analyzeModel(
  buffer: Uint8Array,
  fileName: string,
): Promise<AnalysisResult> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

  const isGlb = fileName.toLowerCase().endsWith(".glb");
  const format: "glb" | "gltf" = isGlb ? "glb" : "gltf";

  // --- Stage: GLB parse ---
  console.log("[ANALYZE] Parsing GLB");
  let doc: Document;
  try {
    if (isGlb) {
      doc = await io.readBinary(buffer);
    } else {
      const jsonStr = new TextDecoder().decode(buffer);
      const jsonDoc = JSON.parse(jsonStr);
      doc = await io.readJSON({
        json: jsonDoc,
        resources: {},
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Analyze failed at GLB parse: ${msg}`);
  }

  // --- Stage: geometry scan ---
  console.log("[ANALYZE] Geometry scan");
  let geometry: ReturnType<typeof countGeometry>;
  try {
    geometry = countGeometry(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Analyze failed at geometry scan: ${msg}`);
  }

  // --- Stage: material scan ---
  const materials = doc.getRoot().listMaterials();

  // --- Stage: texture scan ---
  console.log("[ANALYZE] Texture scan");
  let textureDetails: TextureDetail[];
  try {
    textureDetails = extractTextures(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Analyze failed at texture extraction: ${msg}`);
  }

  // --- Stage: bounding box ---
  console.log("[ANALYZE] Bounding box calculation");
  let bb: { min: Vec3; max: Vec3 };
  try {
    bb = computeBoundingBox(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Analyze failed at bounding box computation: ${msg}`);
  }

  // --- Stage: extras detection ---
  const extras = detectExtras(doc);

  // Dimensions from bounding box
  const width = Math.abs(bb.max[0] - bb.min[0]);
  const depth = Math.abs(bb.max[2] - bb.min[2]);
  const height = Math.abs(bb.max[1] - bb.min[1]);

  // Round to 4 decimals
  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  // Performance ratings
  const desktop = ratePerformance(geometry.triangleCount, "desktop");
  const tablet = ratePerformance(geometry.triangleCount, "tablet");
  const lowPower = ratePerformance(geometry.triangleCount, "lowPower");

  // Recommendations
  const recommendations = generateRecommendations(
    geometry,
    textureDetails,
    materials.length,
    extras,
  );

  // Overall status = worst rating
  const ratings: PerformanceRating[] = [desktop, tablet, lowPower];
  let status: AnalysisStatus = "ok";
  if (ratings.includes("optimization_strongly_recommended")) {
    status = "optimization_strongly_recommended";
  } else if (ratings.includes("optimization_recommended")) {
    status = "optimization_recommended";
  }

  const fileSizeBytes = buffer.byteLength;

  console.log("[ANALYZE] Analysis complete");

  return {
    fileName,
    fileFormat: format,
    fileSizeBytes,
    fileSizeKB: Math.round(fileSizeBytes / 1024),
    fileSizeMB: Math.round((fileSizeBytes / (1024 * 1024)) * 100) / 100,
    geometry,
    materials: {
      count: materials.length,
      names: materials.map((m) => m.getName() || "unnamed"),
    },
    textures: {
      count: textureDetails.length,
      details: textureDetails,
    },
    dimensions: {
      width: round4(width),
      depth: round4(depth),
      height: round4(height),
      unit: "meter",
    },
    boundingBox: {
      min: [round4(bb.min[0]), round4(bb.min[1]), round4(bb.min[2])],
      max: [round4(bb.max[0]), round4(bb.max[1]), round4(bb.max[2])],
    },
    estimatedScale: {
      unit: "m",
      confidence: "unknown",
      note: "Scale estimation not yet implemented in V1",
    },
    placement: {
      candidate: "unknown",
      confidence: "unknown",
    },
    extras,
    performance: { desktop, tablet, lowPower },
    status,
    recommendations,
  };
}
