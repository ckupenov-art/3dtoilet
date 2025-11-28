// main.js – new clean realistic roll geometry, no seams, no textures, no circles

import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "https://unpkg.com/three@0.165.0/examples/jsm/environments/RoomEnvironment.js";

// DOM references
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
// Scene
// ------------------------------------------------

const scene = new THREE.Scene();
scene.background = null; // PNG stays transparent

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

renderer.domElement.style.backgroundColor = "#e7e9ee"; // soft UI grey

container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;

// ------------------------------------------------
// Studio environment lighting
// ------------------------------------------------

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

scene.add(new THREE.AmbientLight(0xffffff, 0.65));

const keyLight = new THREE.DirectionalLight(0xffffff, 0.35);
keyLight.position.set(6, 10, 14);
scene.add(keyLight);

scene.add(new THREE.HemisphereLight(0xffffff, 0xdddddd, 0.22));

// ------------------------------------------------
const packGroup = new THREE.Group();
scene.add(packGroup);

// ------------------------------------------------
// Parameter helpers
// ------------------------------------------------

const MM  = 0.1; // 10mm = 1 unit
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

    rollGapMm: getFloat(rollGapEl, 1)
  };
}

// ------------------------------------------------
// BUILD REALISTIC 3D ROLL (NO TEXTURES)
// ------------------------------------------------

function buildRoll(R_outer, R_core, L) {

  const group = new THREE.Group();

  // Materials
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.0
  });

  const endMat = new THREE.MeshStandardMaterial({
    color: 0xf8f8f8,
    roughness: 0.88,
    metalness: 0.0
  });

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xdfd2b8,
    roughness: 0.85,
    metalness: 0.0
  });

  const holeMat = new THREE.MeshStandardMaterial({
    color: 0xd0d0d0,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  // ------------------------------------------------
  // Paper cylinder (side)
  // ------------------------------------------------
  const sideGeom = new THREE.CylinderGeometry(
    R_outer, R_outer, L,
    64, 1, true
  );
  sideGeom.rotateZ(Math.PI / 2);

  group.add(new THREE.Mesh(sideGeom, paperMat));

  // ------------------------------------------------
  // Paper end caps (simple bevel geometry)
  // ------------------------------------------------
  const bevel = 0.4 * MM;
  const endOuterR = R_outer - bevel;

  const endGeom = new THREE.CylinderGeometry(
    endOuterR, endOuterR, bevel * 2,
    64, 1, false
  );
  endGeom.rotateZ(Math.PI / 2);

  const endFront = new THREE.Mesh(endGeom, endMat);
  endFront.position.x = L / 2 + bevel;

  const endBack = new THREE.Mesh(endGeom, endMat);
  endBack.position.x = -L / 2 - bevel;

  group.add(endFront, endBack);

  // ------------------------------------------------
  // Core tube (outer)
  // ------------------------------------------------
  const coreThickness = 1.2 * MM;

  const coreOuterR = R_core;
  const coreInnerR = Math.max(0, R_core - coreThickness);

  const coreOuterGeom = new THREE.CylinderGeometry(
    coreOuterR, coreOuterR,
    L + bevel * 2,
    48, 1, true
  );
  coreOuterGeom.rotateZ(Math.PI / 2);

  group.add(new THREE.Mesh(coreOuterGeom, coreMat));

  // ------------------------------------------------
  // Core inner hole (actual geometry)
  // ------------------------------------------------
  const coreInnerGeom = new THREE.CylinderGeometry(
    coreInnerR, coreInnerR,
    L + bevel * 2,
    48, 1, true
  );
  coreInnerGeom.rotateZ(Math.PI / 2);

  group.add(new THREE.Mesh(coreInnerGeom, holeMat));

  return group;
}

// ------------------------------------------------
// Generation
// ------------------------------------------------

function clearPack() {
  while (packGroup.children.length)
    packGroup.remove(packGroup.children[0]);
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
// PNG Export
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
// Camera debug
// ------------------------------------------------

function updateCameraDebug() {
  camXEl.textContent  = camera.position.x.toFixed(2);
  camYEl.textContent  = camera.position.y.toFixed(2);
  camZEl.textContent  = camera.position.z.toFixed(2);

  camTxEl.textContent = controls.target.x.toFixed(2);
  camTyEl.textContent = controls.target.y.toFixed(2);
  camTzEl.textContent =
    controls.target.z.toFixed(2);
}

// ------------------------------------------------
// Init
// ------------------------------------------------

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
