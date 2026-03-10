/**
 * ModelThumbnailCapture — renders a GLB in a hidden canvas and captures a WebP thumbnail.
 *
 * Uses @react-three/fiber + @react-three/drei to load and auto-frame the model,
 * then captures the canvas as a data URL after rendering.
 */

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, Center } from "@react-three/drei";
import * as THREE from "three";

interface ModelThumbnailCaptureProps {
  /** URL to the optimized GLB model */
  modelUrl: string;
  /** Called with the captured thumbnail as a data URL (image/webp or image/png) */
  onCapture: (dataUrl: string) => void;
  /** Canvas size in pixels (default 512) */
  size?: number;
}

function ModelScene({ modelUrl, onCapture }: { modelUrl: string; onCapture: (dataUrl: string) => void }) {
  const { scene } = useGLTF(modelUrl);
  const { gl, camera, scene: threeScene } = useThree();
  const captured = useRef(false);
  const frameCount = useRef(0);

  // Auto-frame: fit camera to model bounding box
  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const dist = maxDim / (2 * Math.tan(fov / 2)) * 1.5;

    camera.position.set(center.x + dist * 0.6, center.y + dist * 0.4, center.z + dist * 0.8);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [scene, camera]);

  // Capture after a few frames to ensure rendering is complete
  useFrame(() => {
    if (captured.current) return;
    frameCount.current++;
    if (frameCount.current >= 10) {
      captured.current = true;
      gl.render(threeScene, camera);
      try {
        const dataUrl = gl.domElement.toDataURL("image/webp", 0.85);
        // Fallback to PNG if webp not supported
        if (dataUrl === "data:,") {
          onCapture(gl.domElement.toDataURL("image/png"));
        } else {
          onCapture(dataUrl);
        }
      } catch {
        // Canvas tainted — try png
        try {
          onCapture(gl.domElement.toDataURL("image/png"));
        } catch {
          console.warn("[ModelThumbnailCapture] Could not capture thumbnail");
        }
      }
    }
  });

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

export function ModelThumbnailCapture({ modelUrl, onCapture, size = 512 }: ModelThumbnailCaptureProps) {
  const [error, setError] = useState(false);

  const handleCapture = useCallback((dataUrl: string) => {
    onCapture(dataUrl);
  }, [onCapture]);

  if (error) return null;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "absolute",
        left: -9999,
        top: -9999,
        overflow: "hidden",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
        camera={{ fov: 45, near: 0.01, far: 1000 }}
        style={{ width: size, height: size }}
        onError={() => setError(true)}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <ModelScene modelUrl={modelUrl} onCapture={handleCapture} />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </div>
  );
}

/**
 * Convert a data URL to a File/Blob suitable for FormData upload.
 */
export function dataUrlToFile(dataUrl: string, fileName = "thumb.webp"): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/webp";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new File([arr], fileName, { type: mime });
}
