
// main.js – clean subtle style (no "eyes"), transparent background

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

// Debug
const camXEl  = document.getElementById("cam-x");
const camYEl  = document.getElementById("cam-y");
const camZEl  = document.getElementById("cam-z");
const camTxEl = document.getElementById("cam-tx");
const camTyEl = document.getElementById("cam-ty");
const camTzEl = document.getElementById("cam-tz");
const camDebugPanel = document.getElementById("camera-debug");

// -----------------------------
// Scene
// -----------------------------

const scene = new THREE.Scene();
scene.background = null; // transparent render

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;

// -----------------------------
// Soft Lighting (no “eyes”)
// -----------------------------

// Global soft fill light
scene.add(new THREE.AmbientLight(0xffffff, 0.68));

// Key light (soft)
const keyLight = new THREE.DirectionalLight(0xffffff, 0.35);
keyLight.position.set(6, 10, 14);
keyLight.castShadow = true;
keyLight.shadow.radius = 8;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

// Faux AO for roll ends
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xdddddd, 0.22);
scene.add(hemiLight);

// -----------------------------
const packGroup = new THREE.Group();
scene.add(packGroup);

// -----------------------------
// Helpers
// -----------------------------

const MM  = 0.1;  // 10mm = 1 unit
const EPS = 0.01;

function getInt(el, fb) {
  const v = parseInt(el.value, 10);
  return Number.isFinite(v) && v > 0 ? v : fb;
}

function getFloat(el, fb) {
  const v = parseFloat(el.value);
  return Number.isFinite(v) && v >= 0 ? v : fb;
}

function readParams() {
  return {
    rollsPerRow:  getInt(rollsPerRowEl, 4),
    rowsPerLayer: getInt(rowsPerLayerEl, 3),
    layers:       getInt(layersEl, 2),

    rollDiameterMm: getFloat(rollDiameterEl, 120),
    coreDiameterMm: getFloat(coreDiameterEl, 45),
    rollHeightMm:   getFloat(rollHeightEl, 100),

    rollGapMm:      getFloat(rollGapEl, 1)
  };
}

// --------------------------------------------------
// Paper side noise (very soft: 2–4 brightness range)
// --------------------------------------------------

function createPaperSideTexture() {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    const n = 244 + Math.random() * 8;
    d[i] = d[i+1] = d[i+2] = n;
    d[i+3] = 255;
  }

  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  return tex;
}
const paperSideTexture = createPaperSideTexture();

// --------------------------------------------------
// Roll Ends — clean, subtle, no “eye”
// --------------------------------------------------

let endTexture = null;

function createRollEndTexture(R_outer, R_core) {
  if (endTexture) endTexture.dispose();

  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  const cx = size / 2;
  const cy = size / 2;

  const outerPix = size * 0.45;
  const corePix  = outerPix * (R_core / R_outer);
  const holePix  = corePix * 0.55;

  // Base paper
  ctx.fillStyle = "#f5f5f5";
  ctx.beginPath();
  ctx.arc(cx, cy, outerPix, 0, Math.PI * 2);
  ctx.fill();

  // Very soft radial AO
  let g = ctx.createRadialGradient(cx, cy, outerPix * 0.3, cx, cy, outerPix);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.035)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, outerPix, 0, Math.PI * 2);
  ctx.fill();

  // Light compression ring
  ctx.strokeStyle = "rgba(200,200,200,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, (outerPix + corePix) * 0.52, 0, Math.PI * 2);
  ctx.stroke();

  // Core (beige paperboard)
  ctx.fillStyle = "#e8dbc9";
  ctx.beginPath();
  ctx.arc(cx, cy, corePix, 0, Math.PI * 2);
  ctx.fill();

  // Darken inner core just slightly
  g = ctx.createRadialGradient(cx, cy, holePix, cx, cy, corePix);
  g.addColorStop(0, "rgba(0,0,0,0.035)");
  g.addColorStop(1, "rgba(0,0,0,0.0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, corePix, 0, Math.PI * 2);
  ctx.fill();

  // Hole
  ctx.fillStyle = "#d6d6d6";
  ctx.beginPath();
  ctx.arc(cx, cy, holePix, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  endTexture = tex;

  return tex;
}

// --------------------------------------------------
// Materials
// --------------------------------------------------

let paperSideGeom = null;
let seamGeom      = null;
let endGeom       = null;

const paperSideMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.78,
  metalness: 0.0,
  map: paperSideTexture,
  mapIntensity: 0.3
});

const seamMaterial = new THREE.MeshStandardMaterial({
  color: 0xe5e5e5,
  roughness: 0.8,
  metalness: 0.0
});

const endMaterial = new THREE.MeshBasicMaterial({
  map: null,
  transparent: false
});

// --------------------------------------------------
// Geometries
// --------------------------------------------------

function updateGeometries(p) {
  if (paperSideGeom) paperSideGeom.dispose();
  if (seamGeom)      seamGeom.dispose();
  if (endGeom)       endGeom.dispose();

  const R_outer = (p.rollDiameterMm / 2) * MM;
  const R_core  = (p.coreDiameterMm / 2) * MM;
  const L       = p.rollHeightMm * MM;

  // Side tube
  paperSideGeom = new THREE.CylinderGeometry(R_outer, R_outer, L, 48, 1, true);
  paperSideGeom.rotateZ(Math.PI / 2);

  // Slightly smoother seam tube
  const seamThickness = 0.4 * MM;
  seamGeom = new THREE.CylinderGeometry(
    R_outer * 1.01,
    R_outer * 1.01,
    seamThickness,
    48, 1, true
  );
  seamGeom.rotateZ(Math.PI / 2);

  // Flat end discs
  endGeom = new THREE.CircleGeometry(R_outer, 64);
  endGeom.rotateY(Math.PI / 2);

  const texEnd = createRollEndTexture(R_outer, R_core);
  endMaterial.map = texEnd;
  endMaterial.needsUpdate = true;
}

// --------------------------------------------------
// Pack generation
// --------------------------------------------------

function clearPack() {
  while (packGroup.children.length)
    packGroup.remove(packGroup.children[0]);
}

function generatePack() {
  const p = readParams();
  updateGeometries(p);

  const L = p.rollHeightMm * MM;
  const D = p.rollDiameterMm * MM;
  const G = p.rollGapMm * MM;

  const spacingX = L + G + EPS;
  const spacingY = D + EPS;
  const spacingZ = D + EPS;

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

        const side = new THREE.Mesh(paperSideGeom, paperSideMaterial);
        side.position.set(px, py, pz);

        const seamOffset = (L / 2) - (1 * MM);
        const seamFront = new THREE.Mesh(seamGeom, seamMaterial);
        const seamBack  = new THREE.Mesh(seamGeom, seamMaterial);
        seamFront.position.set(px + seamOffset, py, pz);
        seamBack.position.set(px - seamOffset, py, pz);

        const endFront = new THREE.Mesh(endGeom, endMaterial);
        endFront.position.set(px + L / 2 + 0.0001, py, pz);

        const endBack = new THREE.Mesh(endGeom, endMaterial);
        endBack.position.set(px - L / 2 - 0.0001, py, pz);
        endBack.rotation.y = Math.PI;

        packGroup.add(side, seamFront, seamBack, endFront, endBack);
      }
    }
  }

  const total = p.rollsPerRow * p.rowsPerLayer * p.layers;
  totalRollsEl.textContent = total;
  countLabel.textContent   = `${total} rolls`;
}

// --------------------------------------------------
// Camera
// --------------------------------------------------

function setDefaultCamera() {
  camera.position.set(115.72, 46.43, -81.27);
  controls.target.set(1.40, -7.93, 7.26);
  controls.update();
}

function resetCamera() {
  setDefaultCamera();
}

// --------------------------------------------------
// Export PNG
// --------------------------------------------------

function exportPNG() {
  const prev = camDebugPanel.style.display;
  camDebugPanel.style.display = "none";

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = url;
  a.download = "toilet-pack.png";
  a.click();

  camDebugPanel.style.display = prev;
}

// --------------------------------------------------
// Debug update
// --------------------------------------------------

function updateCameraDebug() {
  camXEl.textContent = camera.position.x.toFixed(2);
  camYEl.textContent = camera.position.y.toFixed(2);
  camZEl.textContent = camera.position.z.toFixed(2);

  camTxEl.textContent = controls.target.x.toFixed(2);
  camTyEl.textContent = controls.target.y.toFixed(2);
  camTzEl.textContent = controls.target.z.toFixed(2);
}

// --------------------------------------------------
// Init
// --------------------------------------------------

generateBtn.onclick    = generatePack;
resetCameraBtn.onclick = resetCamera;
exportPngBtn.onclick   = exportPNG;

generatePack();
setDefaultCamera();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateCameraDebug();
  renderer.render(scene, camera);
}
animate();
