// main.js – robust version: clean rolls, no artifacts, simple core, seam rings, camera debug

import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js";

// DOM elements
const container       = document.getElementById("scene-container");
const countLabel      = document.getElementById("count-label");

const rollsPerRowEl   = document.getElementById("rollsPerRowInput");
const rowsPerLayerEl  = document.getElementById("rowsPerLayerInput");
const layersEl        = document.getElementById("layersInput");
const rollDiameterEl  = document.getElementById("rollDiameterInput");
const coreDiameterEl  = document.getElementById("coreDiameterInput");
const rollHeightEl    = document.getElementById("rollHeightInput");
const rollGapEl       = document.getElementById("rollGapInput");
const totalRollsEl    = document.getElementById("total-rolls");

const generateBtn     = document.getElementById("generateBtn");
const resetCameraBtn  = document.getElementById("resetCameraBtn");
const exportPngBtn    = document.getElementById("exportPngBtn");

// Camera debug UI
const camXEl  = document.getElementById("cam-x");
const camYEl  = document.getElementById("cam-y");
const camZEl  = document.getElementById("cam-z");
const camTxEl = document.getElementById("cam-tx");
const camTyEl = document.getElementById("cam-ty");
const camTzEl = document.getElementById("cam-tz");
const camDebugPanel = document.getElementById("camera-debug");

// --------------------------------------
// Scene Setup
// --------------------------------------

const scene = new THREE.Scene();
scene.background = null; // transparent

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(10, 20, 12);
dirLight.castShadow = true;
scene.add(dirLight);

const packGroup = new THREE.Group();
scene.add(packGroup);

// --------------------------------------
// Helpers
// --------------------------------------

const MM  = 0.1;   // 10 mm = 1 unit
const EPS = 0.01;  // tiny offset

function getInt(el, fallback) {
  const v = parseInt(el.value, 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function getFloat(el, fallback) {
  const v = parseFloat(el.value);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

function readParams() {
  return {
    rollsPerRow:  getInt(rollsPerRowEl, 4),
    rowsPerLayer: getInt(rowsPerLayerEl, 3),
    layers:       getInt(layersEl, 2),

    rollDiameterMm: getFloat(rollDiameterEl, 120),
    coreDiameterMm: getFloat(coreDiameterEl, 45),
    rollHeightMm:   getFloat(rollHeightEl, 100),

    rollGapMm:      getFloat(rollGapEl, 1.0)   // visual gap along length
  };
}

// --------------------------------------
// Paper “texture” (subtle bump to soften shading)
// --------------------------------------

function createPaperBumpTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const val = 210 + Math.random() * 20; // very subtle variation
      data[idx]     = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

const paperBumpTexture = createPaperBumpTexture();

// --------------------------------------
// Geometries
// --------------------------------------

let paperGeom   = null;
let coreGeom    = null;
let seamGeom    = null;

const paperMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.45,
  metalness: 0.0,
  bumpMap: paperBumpTexture,
  bumpScale: 0.015
});

const coreMaterial = new THREE.MeshStandardMaterial({
  color: 0x9a7b5f,
  roughness: 0.8,
  metalness: 0.0
});

const seamMaterial = new THREE.MeshStandardMaterial({
  color: 0xd4d4d4,
  roughness: 0.6,
  metalness: 0.0
});

function updateGeometries(p) {
  if (paperGeom) paperGeom.dispose();
  if (coreGeom)  coreGeom.dispose();
  if (seamGeom)  seamGeom.dispose();

  const R_outer = (p.rollDiameterMm / 2) * MM;
  const R_core  = (p.coreDiameterMm / 2) * MM;
  const L       = p.rollHeightMm * MM;

  // Outer paper cylinder (closed ends)
  paperGeom = new THREE.CylinderGeometry(R_outer, R_outer, L, 64, 1, false);
  paperGeom.rotateZ(Math.PI / 2);

  // Solid cardboard core cylinder (slightly shorter, so it looks "inside")
  const coreLength = L * 0.85;
  coreGeom = new THREE.CylinderGeometry(R_core, R_core, coreLength, 32, 1, false);
  coreGeom.rotateZ(Math.PI / 2);

  // Thin seam ring (R2) – small cylinder to create a line near each end
  const seamThickness = 0.4 * MM; // 4 mm
  seamGeom = new THREE.CylinderGeometry(
    R_outer * 1.001,
    R_outer * 1.001,
    seamThickness,
    64,
    1,
    false
  );
  seamGeom.rotateZ(Math.PI / 2);
}

// --------------------------------------
// Pack generation
// --------------------------------------

function clearPack() {
  while (packGroup.children.length) {
    packGroup.remove(packGroup.children[0]);
  }
}

function generatePack() {
  const p = readParams();
  updateGeometries(p);

  const L = p.rollHeightMm * MM;
  const D = p.rollDiameterMm * MM;
  const G = p.rollGapMm * MM;

  const spacingX = L + G + EPS; // along length
  const spacingY = D + EPS;     // vertical
  const spacingZ = D + EPS;     // depth

  const offsetX = -((p.rollsPerRow  - 1) * spacingX) / 2;
  const offsetZ = -((p.rowsPerLayer - 1) * spacingZ) / 2;
  const baseY   = -((p.layers       - 1) * spacingY) / 2;

  clearPack();

  for (let layer = 0; layer < p.layers; layer++) {
    for (let row = 0; row < p.rowsPerLayer; row++) {
      for (let col = 0; col < p.rollsPerRow; col++) {

        const px = offsetX + col * spacingX;
        const py = baseY   + layer * spacingY;
        const pz = offsetZ + row * spacingZ;

        // Paper cylinder
        const paper = new THREE.Mesh(paperGeom, paperMaterial);
        paper.castShadow = true;
        paper.receiveShadow = true;
        paper.position.set(px, py, pz);

        // Cardboard core (solid cylinder, visually a core)
        const core = new THREE.Mesh(coreGeom, coreMaterial);
        core.castShadow = false;
        core.receiveShadow = false;
        core.position.set(px, py, pz);

        // Seam rings near each end (R2 visual detail)
        const seamOffset = (L / 2) - (0.8 * MM);

        const seamFront = new THREE.Mesh(seamGeom, seamMaterial);
        seamFront.position.set(px + seamOffset, py, pz);

        const seamBack = new THREE.Mesh(seamGeom, seamMaterial);
        seamBack.position.set(px - seamOffset, py, pz);

        packGroup.add(paper, core, seamFront, seamBack);
      }
    }
  }

  const total = p.rollsPerRow * p.rowsPerLayer * p.layers;
  totalRollsEl.textContent = total;
  countLabel.textContent   = `${total} rolls`;
}

// --------------------------------------
// Camera defaults (your values)
// --------------------------------------

function setDefaultCamera() {
  camera.position.set(115.72, 46.43, -81.27);
  controls.target.set(1.40, -7.93, 7.26);
  controls.update();
}

function resetCamera() {
  setDefaultCamera();
}

// --------------------------------------
// PNG Export (hide debug panel for clean image)
// --------------------------------------

function exportPNG() {
  const prevDisplay = camDebugPanel.style.display || "";
  camDebugPanel.style.display = "none";

  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = dataURL;
  a.download = "toilet-pack.png";
  a.click();

  camDebugPanel.style.display = prevDisplay;
}

// --------------------------------------
// Camera debug panel update
// --------------------------------------

function updateCameraDebug() {
  camXEl.textContent  = camera.position.x.toFixed(2);
  camYEl.textContent  = camera.position.y.toFixed(2);
  camZEl.textContent  = camera.position.z.toFixed(2);

  camTxEl.textContent = controls.target.x.toFixed(2);
  camTyEl.textContent = controls.target.y.toFixed(2);
  camTzEl.textContent = controls.target.z.toFixed(2);
}

// --------------------------------------
// Events & init
// --------------------------------------

generateBtn.onclick    = () => generatePack();
resetCameraBtn.onclick = () => resetCamera();
exportPngBtn.onclick   = () => exportPNG();

generatePack();
setDefaultCamera();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --------------------------------------
// Render loop
// --------------------------------------

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateCameraDebug();
  renderer.render(scene, camera);
}

animate();
