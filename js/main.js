// main.js – clean realistic rolls with visible inner core, no textures, no outlines

import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "https://unpkg.com/three@0.165.0/examples/jsm/environments/RoomEnvironment.js";

// ------------------------------------------------
// DOM
// ------------------------------------------------
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

const camXEl  = document.getElementById("cam-x");
const camYEl  = document.getElementById("cam-y");
const camZEl  = document.getElementById("cam-z");
const camTxEl = document.getElementById("cam-tx");
const camTyEl = document.getElementById("cam-ty");
const camTzEl = document.getElementById("cam-tz");
const camDebugPanel = document.getElementById("camera-debug");

// ------------------------------------------------
// Scene / Renderer
// ------------------------------------------------
const scene = new THREE.Scene();
scene.background = null; // keep PNG transparent

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
renderer.setClearColor(0x000000, 0); // fully transparent

// UI background color (does not affect PNG)
renderer.domElement.style.backgroundColor = "#b8beca"; // medium cool grey for contrast

container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;

// ------------------------------------------------
// Lighting – soft studio look
// ------------------------------------------------
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

scene.add(new THREE.AmbientLight(0xffffff, 0.55)); // global fill

const keyLight = new THREE.DirectionalLight(0xffffff, 0.45);
keyLight.position.set(6, 10, 14);
scene.add(keyLight);

const hemi = new THREE.HemisphereLight(0xffffff, 0xdddddd, 0.25);
scene.add(hemi);

// ------------------------------------------------
const packGroup = new THREE.Group();
scene.add(packGroup);

// ------------------------------------------------
// Helpers / parameters
// ------------------------------------------------
const MM  = 0.1; // 10 mm = 1 world unit
const EPS = 0.01;

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

    // default roll spacing: 7 mm (you asked for 1 → 7)
    rollGapMm: getFloat(rollGapEl, 7)
  };
}

// ------------------------------------------------
// REALISTIC 3D ROLL (geometry-only, no textures)
// - clear inner core
// - no overlapping geometry
// - no dark outlines
// ------------------------------------------------
function buildRoll(R_outer, R_coreOuter, L) {
  const group = new THREE.Group();

  // ---- Materials ----
  const paperSideMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.0
  });

  const paperEndMat = new THREE.MeshStandardMaterial({
    color: 0xf7f7f7,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  const coreSideMat = new THREE.MeshStandardMaterial({
    color: 0xdfd2b8, // beige paperboard
    roughness: 0.85,
    metalness: 0.0
  });

  const coreEndMat = new THREE.MeshStandardMaterial({
    color: 0xdfd2b8,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  const holeMat = new THREE.MeshStandardMaterial({
    color: 0xd0d0d0,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  // ---- Dimensions ----
  const bevel     = 0.4 * MM;     // soft edge of paper
  const coreThick = 1.2 * MM;     // core wall thickness

  const R_coreInner = Math.max(0, R_coreOuter - coreThick);

  // ---- Paper side cylinder ----
  const sideGeom = new THREE.CylinderGeometry(
    R_outer, R_outer, L,
    64, 1, true
  );
  sideGeom.rotateZ(Math.PI / 2);

  const sideMesh = new THREE.Mesh(sideGeom, paperSideMat);
  group.add(sideMesh);

  // ---- Paper end faces (front/back) ----
  const paperEndRingGeom = new THREE.RingGeometry(
    R_coreOuter, R_outer, 64
  );

  const paperEndFront = new THREE.Mesh(paperEndRingGeom, paperEndMat);
  paperEndFront.rotation.y = Math.PI / 2;
  paperEndFront.position.x = L / 2;

  const paperEndBack = paperEndFront.clone();
  paperEndBack.position.x = -L / 2;
  paperEndBack.rotation.y = -Math.PI / 2;

  group.add(paperEndFront, paperEndBack);

  // ---- Core side (outer tube) ----
  const coreSideGeom = new THREE.CylinderGeometry(
    R_coreOuter, R_coreOuter, L * 0.98,
    48, 1, true
  );
  coreSideGeom.rotateZ(Math.PI / 2);
  const coreSideMesh = new THREE.Mesh(coreSideGeom, coreSideMat);
  group.add(coreSideMesh);

  // ---- Core inner wall (hole wall) using inner cylinder with flipped normals ----
  const coreInnerGeom = new THREE.CylinderGeometry(
    R_coreInner, R_coreInner, L * 0.98,
    48, 1, true
  );
  coreInnerGeom.rotateZ(Math.PI / 2);
  coreInnerGeom.scale(-1, 1, 1); // flip normals for inside

  const coreInnerMesh = new THREE.Mesh(coreInnerGeom, holeMat);
  group.add(coreInnerMesh);

  // ---- Core end rings (front/back) ----
  const coreEndRingGeom = new THREE.RingGeometry(
    R_coreInner, R_coreOuter, 48
  );

  const coreEndFront = new THREE.Mesh(coreEndRingGeom, coreEndMat);
  coreEndFront.rotation.y = Math.PI / 2;
  coreEndFront.position.x = L / 2;

  const coreEndBack = coreEndFront.clone();
  coreEndBack.position.x = -L / 2;
  coreEndBack.rotation.y = -Math.PI / 2;

  group.add(coreEndFront, coreEndBack);

  // ---- Hole face discs (front/back) ----
  const holeDiscGeom = new THREE.CircleGeometry(R_coreInner, 32);

  const holeFront = new THREE.Mesh(holeDiscGeom, holeMat);
  holeFront.rotation.y = Math.PI / 2;
  holeFront.position.x = L / 2 + 0.0001;

  const holeBack = holeFront.clone();
  holeBack.position.x = -L / 2 - 0.0001;
  holeBack.rotation.y = -Math.PI / 2;

  group.add(holeFront, holeBack);

  return group;
}

// ------------------------------------------------
// Pack generation
// ------------------------------------------------
function clearPack() {
  while (packGroup.children.length) {
    packGroup.remove(packGroup.children[0]);
  }
}

function generatePack() {
  const p = readParams();

  const R_outer = (p.rollDiameterMm / 2) * MM;
  const R_core  = (p.coreDiameterMm / 2) * MM;
  const L       = p.rollHeightMm * MM;

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

        const x = offsetX + col * spacingX;
        const y = baseY   + layer * spacingY;
        const z = offsetZ + row * spacingZ;

        const roll = buildRoll(R_outer, R_core, L);
        roll.position.set(x, y, z);
        packGroup.add(roll);
      }
    }
  }

  const total = p.rollsPerRow * p.rowsPerLayer * p.layers;
  totalRollsEl.textContent = total;
  countLabel.textContent   = `${total} rolls`;
}

// ------------------------------------------------
// Camera
// ------------------------------------------------
function setDefaultCamera() {
  camera.position.set(115.72, 46.43, -81.27);
  controls.target.set(1.40, -7.93, 7.26);
  controls.update();
}

function resetCamera() {
  setDefaultCamera();
}

// ------------------------------------------------
// PNG Export (transparent)
// ------------------------------------------------
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

// ------------------------------------------------
// Camera debug panel
// ------------------------------------------------
function updateCameraDebug() {
  camXEl.textContent  = camera.position.x.toFixed(2);
  camYEl.textContent  = camera.position.y.toFixed(2);
  camZEl.textContent  = camera.position.z.toFixed(2);

  camTxEl.textContent = controls.target.x.toFixed(2);
  camTyEl.textContent = controls.target.y.toFixed(2);
  camTzEl.textContent = controls.target.z.toFixed(2);
}

// ------------------------------------------------
// Init & animate
// ------------------------------------------------
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

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateCameraDebug();
  renderer.render(scene, camera);
}
animate();
