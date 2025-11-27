// main.js – clean rolls (no artifacts) + paper bump + paper end caps + camera debug

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
const EPS = 0.01;  // small offset to avoid z-fighting

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
// Paper bump texture (S1 – subtle paper normal/bump)
// --------------------------------------

function createPaperBumpTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // simple noise between 110–145 (out of 255)
      const idx = (y * size + x) * 4;
      const val = 110 + Math.random() * 35; // subtle variation
      data[idx]     = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); // tile fine pattern
  return texture;
}

const paperBumpTexture = createPaperBumpTexture();

// --------------------------------------
// Geometries (shell + inner hollow + cardboard core + end caps)
// --------------------------------------

let paperOuterGeom = null;
let paperInnerGeom = null;
let paperCapGeom   = null;
let coreOuterGeom  = null;
let coreInnerGeom  = null;

const paperMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.5,
  metalness: 0.0,
  side: THREE.DoubleSide,
  bumpMap: paperBumpTexture,
  bumpScale: 0.02
});

const coreMaterial = new THREE.MeshStandardMaterial({
  color: 0x9a7b5f, // cardboard
  roughness: 0.8,
  metalness: 0.0,
  side: THREE.DoubleSide
});

function updateGeometries(p) {
  // Dispose old if exist
  if (paperOuterGeom) paperOuterGeom.dispose();
  if (paperInnerGeom) paperInnerGeom.dispose();
  if (paperCapGeom)   paperCapGeom.dispose();
  if (coreOuterGeom)  coreOuterGeom.dispose();
  if (coreInnerGeom)  coreInnerGeom.dispose();

  const R_outer     = (p.rollDiameterMm / 2) * MM;
  const R_coreOuter = (p.coreDiameterMm / 2) * MM;
  const length      = p.rollHeightMm * MM;

  // Small gap between paper inner and core outer to avoid z-fighting
  const gapPaperCore = 0.2 * MM; // 2 mm in real units
  const R_paperInner = R_coreOuter + gapPaperCore;

  // Cardboard tube thickness
  const tubeThickness = Math.min(R_coreOuter * 0.25, 0.8 * MM);
  const R_coreInner   = Math.max(R_coreOuter - tubeThickness, R_coreOuter * 0.6);

  // PAPER OUTER SHELL – open-ended cylinder
  paperOuterGeom = new THREE.CylinderGeometry(
    R_outer, R_outer, length, 64, 1, true
  );
  paperOuterGeom.rotateZ(Math.PI / 2);

  // PAPER INNER HOLE – slightly larger radius than core outer
  paperInnerGeom = new THREE.CylinderGeometry(
    R_paperInner, R_paperInner, length, 64, 1, true
  );
  paperInnerGeom.scale(1, 1, -1); // flip normals
  paperInnerGeom.rotateZ(Math.PI / 2);

  // PAPER END CAP RING (B1 – filled paper look)
  // Ring between paper inner radius and outer radius, in YZ-plane
  paperCapGeom = new THREE.RingGeometry(R_paperInner, R_outer, 64);
  paperCapGeom.rotateZ(Math.PI / 2);

  // CORE OUTER WALL
  coreOuterGeom = new THREE.CylinderGeometry(
    R_coreOuter, R_coreOuter, length, 48, 1, true
  );
  coreOuterGeom.rotateZ(Math.PI / 2);

  // CORE INNER WALL – inverted normals
  coreInnerGeom = new THREE.CylinderGeometry(
    R_coreInner, R_coreInner, length, 48, 1, true
  );
  coreInnerGeom.scale(1, 1, -1);
  coreInnerGeom.rotateZ(Math.PI / 2);
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

  const L = p.rollHeightMm * MM;   // length (X axis)
  const D = p.rollDiameterMm * MM; // diameter (Y,Z)
  const G = p.rollGapMm * MM;      // user gap along X

  const spacingX = L + G + EPS;
  const spacingY = D + EPS;
  const spacingZ = D + EPS;

  const offsetX = -((p.rollsPerRow  - 1) * spacingX) / 2;
  const offsetZ = -((p.rowsPerLayer - 1) * spacingZ) / 2;
  const baseY   = -((p.layers - 1) * spacingY) / 2;

  clearPack();

  for (let layer = 0; layer < p.layers; layer++) {
    for (let row = 0; row < p.rowsPerLayer; row++) {
      for (let col = 0; col < p.rollsPerRow; col++) {

        const px = offsetX + col * spacingX;
        const py = baseY   + layer * spacingY;
        const pz = offsetZ + row * spacingZ;

        // PAPER – outer shell
        const shell = new THREE.Mesh(paperOuterGeom, paperMaterial);
        shell.castShadow = true;
        shell.receiveShadow = true;
        shell.position.set(px, py, pz);

        // PAPER – inner wall
        const inner = new THREE.Mesh(paperInnerGeom, paperMaterial);
        inner.castShadow = false;
        inner.receiveShadow = false;
        inner.position.set(px, py, pz);

        // PAPER – end caps front/back (B1)
        const capFront = new THREE.Mesh(paperCapGeom, paperMaterial);
        capFront.position.set(px + L / 2, py, pz);

        const capBack = new THREE.Mesh(paperCapGeom, paperMaterial);
        capBack.position.set(px - L / 2, py, pz);

        // CORE – outer & inner walls
        const coreOuter = new THREE.Mesh(coreOuterGeom, coreMaterial);
        coreOuter.castShadow = false;
        coreOuter.receiveShadow = false;
        coreOuter.position.set(px, py, pz);

        const coreInner = new THREE.Mesh(coreInnerGeom, coreMaterial);
        coreInner.castShadow = false;
        coreInner.receiveShadow = false;
        coreInner.position.set(px, py, pz);

        packGroup.add(shell, inner, capFront, capBack, coreOuter, coreInner);
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
