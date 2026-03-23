import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const params = new URLSearchParams(window.location.search);
const modelUrl = params.get("model");
const size = Number(params.get("size") || "192");
const bg = params.get("bg") || "#111827";

const setStatus = (value, detail = "") => {
  document.body.dataset.status = value;
  document.body.dataset.detail = detail;
  document.title = `${value}${detail ? `:${detail}` : ""}`;
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.textContent = `${value}${detail ? `: ${detail}` : ""}`;
    statusEl.style.display = value === "ready" ? "none" : "block";
  }
};

if (!modelUrl) {
  setStatus("error", "missing-model");
  throw new Error("Missing ?model=/catalog-seed/... parameter");
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(size, size);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.setClearColor(new THREE.Color(bg), bg === "transparent" ? 0 : 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xfff5e6, 1.4);
key.position.set(3, 6, 4);
scene.add(key);

const fill = new THREE.DirectionalLight(0xe6f0ff, 0.5);
fill.position.set(-4, 3, 2);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 0.35);
rim.position.set(0, 4, -5);
scene.add(rim);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(5, 48),
  new THREE.MeshBasicMaterial({ color: 0x0b1220, transparent: true, opacity: 0.25 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.001;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 500);
const loader = new GLTFLoader();

function focusCamera(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  const boxSize = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(boxSize);

  const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z) || 1;

  object.position.x -= center.x;
  object.position.y -= box.min.y;
  object.position.z -= center.z;
  object.updateMatrixWorld(true);

  const focusedBox = new THREE.Box3().setFromObject(object);
  const focusedCenter = new THREE.Vector3();
  const focusedSize = new THREE.Vector3();
  focusedBox.getCenter(focusedCenter);
  focusedBox.getSize(focusedSize);

  const radius = focusedSize.length() * 0.5 || maxDim * 0.5;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distance = (radius / Math.sin(fov / 2)) * 1.18;
  const direction = new THREE.Vector3(1, 0.72, 1).normalize();
  const target = focusedCenter.clone().add(new THREE.Vector3(0, focusedSize.y * 0.12, 0));

  camera.position.set(
    target.x + direction.x * distance,
    target.y + direction.y * distance,
    target.z + direction.z * distance
  );
  camera.lookAt(target);
}

setStatus("loading");

loader.load(
  modelUrl,
  (gltf) => {
    const group = gltf.scene;
    scene.add(group);
    focusCamera(group);
    renderer.render(scene, camera);
    setStatus("ready");
  },
  undefined,
  (error) => {
    setStatus("error", error?.message || "load-failed");
    console.error(error);
  }
);
