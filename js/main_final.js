// main_final.js — FINAL CLEAN VERSION WITH AXIS FIX
// LANE = X  |  CHANNEL = Z  |  LAYER = Y

import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js";

// ---------------------------------------------------------
// DOM
// ---------------------------------------------------------

const container = document.getElementById("scene-container");
const countLabel = document.getElementById("count-label");

// IDs (matching index.html labels)
const rollsPerLaneEl      = document.getElementById("rollsPerLaneInput");     // X
const rollsPerChannelEl   = document.getElementById("rollsPerChannelInput");  // Z
const rollsPerLayerEl     = document.getElementById("rollsPerLayerInput");    // Y

const rollDiameterEl = document.getElementById("rollDiameterInput");
const coreDiameterEl = document.getElementById("coreDiameterInput");
const rollHeightEl   = document.getElementById("rollHeightInput");
const rollGapEl      = document.getElementById("rollGapInput");

const totalRollsEl = document.getElementById("total-rolls");

const generateBtn    = document.getElementById("generateBtn");
const resetCameraBtn = document.getElementById("resetCameraBtn");
const exportPngBtn   = document.getElementById("exportPngBtn");

const camXEl  = document.getElementById("cam-x");
const camYEl  = document.getElementById("cam-y");
const camZEl  = document.getElementById("cam-z");
const camTxEl = document.getElementById("cam-tx");
const camTyEl = document.getElementById("cam-ty");
const camTzEl = document.getElementById("cam-tz");
const camDebugPanel = document.getElementById("camera-debug");

// ---------------------------------------------------------
// Scene + Renderer
// ---------------------------------------------------------

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(
  35,
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
renderer.domElement.style.backgroundColor = "#e8e4da";
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ---------------------------------------------------------
// Lighting — strong studio lighting
// ---------------------------------------------------------

scene.add(new THREE.AmbientLight(0xffffff, 0.05));

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(90, 120, 70);
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 1.1);
fill.position.set(-120, 60, -50);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 0.9);
rim.position.set(0, 160, -120);
scene.add(rim);

// ---------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------

const MM  = 0.1;
const EPS = 0.01;

const packGroup = new THREE.Group();
scene.add(packGroup);

// ---------------------------------------------------------
// Helper functions
// ---------------------------------------------------------

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
    rollsPerLane:      getInt(rollsPerLaneEl, 4),     // X
    rollsPerChannel:   getInt(rollsPerChannelEl, 3),  // Z
    rollsPerLayer:     getInt(rollsPerLayerEl, 2),    // Y

    rollDiameterMm: getFloat(rollDiameterEl, 120),
    coreDiameterMm: getFloat(coreDiameterEl, 45),
    rollHeightMm:   getFloat(rollHeightEl, 100),

    rollGapMm: getFloat(rollGapEl, 7)
  };
}

// ---------------------------------------------------------
// Paper bump texture
// ---------------------------------------------------------

function createPaperBumpTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const base = 125 + Math.random() * 20;
      const gradient = (y / size) * 25;
      const shade = base + gradient;
      d[i] = d[i+1] = d[i+2] = shade;
      d[i+3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const paperBumpTex = createPaperBumpTexture();

// ---------------------------------------------------------
// Roll builder (with correct materials)
// ---------------------------------------------------------

function buildRoll(R_outer, R_coreOuter, L) {
  const group = new THREE.Group();

  // Paper — white-purple tint
  const paperSideMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.96, 0.94, 1.0),
    roughness: 0.55,
    metalness: 0.0,
    bumpMap: paperBumpTex,
    bumpScale: 0.03,
    emissive: new THREE.Color(0.06, 0.06, 0.08),
    emissiveIntensity: 0.45
  });

  const paperEndMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.97, 0.95, 1.0),
    roughness: 0.65,
    metalness: 0.0,
    bumpMap: paperBumpTex,
    bumpScale: 0.04,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0.06, 0.06, 0.09),
    emissiveIntensity: 0.45
  });

  // Cardboard core
  const coreSideMat = new THREE.MeshStandardMaterial({
    color: 0xb8925d,
    roughness: 0.75,
    metalness: 0.0
  });

  const coreInnerMat = new THREE.MeshStandardMaterial({
    color: 0x7a7a7a,
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.BackSide,
    emissive: new THREE.Color(0.28, 0.22, 0.15),
    emissiveIntensity: 0.55
  });

  const coreEndMat = coreSideMat;

  const coreThickness = 1.2 * MM;
  const R_coreInner = Math.max(0, R_coreOuter - coreThickness);
  const bevelDepth = 0.9 * MM;

  // SIDE
  const sideGeom = new THREE.CylinderGeometry(
    R_outer, R_outer,
    L - bevelDepth * 2,
    64, 1, true
  );
  sideGeom.rotateZ(Math.PI / 2);
  group.add(new THREE.Mesh(sideGeom, paperSideMat));

  // BEVELS
  const bevelGeom = new THREE.CylinderGeometry(
    R_outer, R_outer,
    bevelDepth,
    48, 1, true
  );
  bevelGeom.rotateZ(Math.PI / 2);

  const bevelFront = new THREE.Mesh(bevelGeom, paperSideMat);
  bevelFront.position.x = L/2 - bevelDepth/2;
  group.add(bevelFront);

  const bevelBack = bevelFront.clone();
  bevelBack.position.x = -L/2 + bevelDepth/2;
  group.add(bevelBack);

  // PAPER ENDS
  const endRingGeom = new THREE.RingGeometry(R_coreOuter, R_outer, 64);

  const endFront = new THREE.Mesh(endRingGeom, paperEndMat);
  endFront.position.x = L/2;
  endFront.rotation.y = Math.PI / 2;
  group.add(endFront);

  const endBack = endFront.clone();
  endBack.position.x = -L/2;
  endBack.rotation.y = -Math.PI / 2;
  group.add(endBack);

  // CORE OUTER
  const coreOuterGeom = new THREE.CylinderGeometry(
    R_coreOuter, R_coreOuter,
    L * 0.97,
    48, 1, true
  );
  coreOuterGeom.rotateZ(Math.PI / 2);
  group.add(new THREE.Mesh(coreOuterGeom, coreSideMat));

  // CORE INNER
  const coreInnerGeom = new THREE.CylinderGeometry(
    R_coreInner, R_coreInner,
    L * 0.97,
    48, 1, true
  );
  coreInnerGeom.rotateZ(Math.PI / 2);
  group.add(new THREE.Mesh(coreInnerGeom, coreInnerMat));

  // CORE END RINGS
  const coreEndRingGeom = new THREE.RingGeometry(R_coreInner, R_coreOuter, 48);

  const coreFront = new THREE.Mesh(coreEndRingGeom, coreEndMat);
  coreFront.position.x = L/2;
  coreFront.rotation.y = Math.PI / 2;
  group.add(coreFront);

  const coreBack = coreFront.clone();
  coreBack.position.x = -L/2;
  coreBack.rotation.y = -Math.PI / 2;
  group.add(coreBack);

  return group;
}

// ---------------------------------------------------------
// Pack generation (FIXED AXIS)
// ---------------------------------------------------------

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

  const spacingX = L + G + EPS;  // LANE → X
  const spacingY = D + EPS;      // LAYER → Y
  const spacingZ = D + EPS;      // CHANNEL → Z

  const offsetX = -((p.rollsPerLane    - 1) * spacingX) / 2;
  const offsetY = -((p.rollsPerLayer   - 1) * spacingY) / 2;
  const offsetZ = -((p.rollsPerChannel - 1) * spacingZ) / 2;

  clearPack();

  for (let layer = 0; layer < p.rollsPerLayer; layer++) {      // Y
    for (let lane = 0; lane < p.rollsPerLane; lane++) {        // X
      for (let channel = 0; channel < p.rollsPerChannel; channel++) {  // Z

        const x = offsetX + lane    * spacingX;
        const y = offsetY + layer   * spacingY;
        const z = offsetZ + channel * spacingZ;

        const roll = buildRoll(R_outer, R_core, L);
        roll.position.set(x, y, z);
        packGroup.add(roll);
      }
    }
  }

  const total = p.rollsPerLane * p.rollsPerChannel * p.rollsPerLayer;
  totalRollsEl.textContent = total;
  countLabel.textContent   = `${total} rolls`;
}

// ---------------------------------------------------------
// Camera
// ---------------------------------------------------------

function setDefaultCamera() {
  camera.position.set(115.72, 46.43, -81.27);
  controls.target.set(1.40, -7.93, 7.26);
  controls.update();
}

function resetCamera() {
  setDefaultCamera();
}

// ---------------------------------------------------------
// Export PNG
// ---------------------------------------------------------

function exportPNG() {
  // hide debug overlay so it doesn't appear in PNG
  const prev = camDebugPanel.style.display;
  camDebugPanel.style.display = "none";

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");

  // build filename: toilet_pack_X_Y_Z
  // X - Rolls per Channel /  Y - Rolls per Lane / Z - Rolls per Layer
  const p = readParams();
  const filename = `toilet_pack_${p.rollsPerChannel}_${p.rollsPerLane}_${p.rollsPerLayer}.png`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  camDebugPanel.style.display = prev;
}

// ---------------------------------------------------------
// Camera debug
// ---------------------------------------------------------

function updateCameraDebug() {
  camXEl.textContent  = camera.position.x.toFixed(2);
  camYEl.textContent  = camera.position.y.toFixed(2);
  camZEl.textContent  = camera.position.z.toFixed(2);

  camTxEl.textContent = controls.target.x.toFixed(2);
  camTyEl.textContent = controls.target.y.toFixed(2);
  camTzEl.textContent = controls.target.z.toFixed(2);
}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// Loop
// ---------------------------------------------------------

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateCameraDebug();
  renderer.render(scene, camera);
}
animate();
