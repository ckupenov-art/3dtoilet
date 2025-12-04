// main_final.js — Desktop + Mobile (3-state bottom sheet, auto-collapse after Generate)
// LANE = X | CHANNEL = Z | LAYER = Y

import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js";

/* ------------------------------------------------------------
   ELEMENTS
------------------------------------------------------------ */
const container = document.getElementById("scene-container");

const rollsPerLaneEl    = document.getElementById("rollsPerLaneInput");
const rollsPerChannelEl = document.getElementById("rollsPerChannelInput");
const rollsPerLayerEl   = document.getElementById("rollsPerLayerInput");

const rollDiameterEl = document.getElementById("rollDiameterInput");
const coreDiameterEl = document.getElementById("coreDiameterInput");
const rollHeightEl   = document.getElementById("rollHeightInput");
const rollGapEl      = document.getElementById("rollGapInput");

const totalRollsEl = document.getElementById("total-rolls");
const countLabel   = document.getElementById("count-label");

const generateBtn    = document.getElementById("generateBtn");
const resetCameraBtn = document.getElementById("resetCameraBtn");
const exportPngBtn   = document.getElementById("exportPngBtn");

const mobileToggleBtn = document.getElementById("mobile-toggle-btn");
const controlPanel    = document.getElementById("control-panel");

const camDebugPanel = document.getElementById("camera-debug");
const camXEl  = document.getElementById("cam-x");
const camYEl  = document.getElementById("cam-y");
const camZEl  = document.getElementById("cam-z");
const camTxEl = document.getElementById("cam-tx");
const camTyEl = document.getElementById("cam-ty");
const camTzEl = document.getElementById("cam-tz");

/* ------------------------------------------------------------
   MOBILE BOTTOM SHEET LOGIC (S2: collapsed / half / full)
------------------------------------------------------------ */

const isMobile = window.matchMedia("(max-width: 800px)").matches;

const SheetState = {
  COLLAPSED: "collapsed",
  HALF: "half",
  FULL: "full"
};

let sheetState = SheetState.HALF;
let sheetOffsets = { collapsed: 0, half: 0, full: 0 };
let currentOffsetPx = 0;

/* Update vw/vh because iOS Safari lies about vh */
function updateViewportHeight() {
  const vh = window.innerHeight;
  document.documentElement.style.setProperty("--vh", vh + "px");

  sheetOffsets.full = 0;
  sheetOffsets.half = vh * 0.45;
  sheetOffsets.collapsed = vh - 56;

  applySheetState(sheetState, false);
}
updateViewportHeight();
window.addEventListener("resize", updateViewportHeight);
window.addEventListener("orientationchange", updateViewportHeight);

function applySheetState(state, animate = true) {
  sheetState = state;

  let offset =
    state === SheetState.FULL ? sheetOffsets.full :
    state === SheetState.HALF ? sheetOffsets.half :
    sheetOffsets.collapsed;

  currentOffsetPx = offset;
  document.documentElement.style.setProperty("--sheet-translateY", offset + "px");

  if (!animate) void document.body.offsetHeight;

  if (mobileToggleBtn) {
    if (state === SheetState.COLLAPSED) mobileToggleBtn.textContent = "Pack Settings";
    if (state === SheetState.HALF)      mobileToggleBtn.textContent = "Pack Settings ▲";
    if (state === SheetState.FULL)      mobileToggleBtn.textContent = "Close ▲";
  }
}

if (isMobile) {
  sheetState = window.innerHeight < 700 ? SheetState.COLLAPSED : SheetState.HALF;
  applySheetState(sheetState, false);

  // Toggle cycle
  mobileToggleBtn.addEventListener("click", () => {
    if (sheetState === SheetState.COLLAPSED) applySheetState(SheetState.HALF);
    else if (sheetState === SheetState.HALF) applySheetState(SheetState.FULL);
    else applySheetState(SheetState.HALF);
  });

  // Drag handling
  let dragging = false;
  let dragStartY = 0;
  let dragStartOffset = 0;

  function interactiveElement(el) {
    return el.closest("input, button, select, textarea");
  }

  controlPanel.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    if (interactiveElement(e.target)) return;
    dragging = true;
    dragStartY = e.touches[0].clientY;
    dragStartOffset = currentOffsetPx;
  });

  controlPanel.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - dragStartY;
    let newOffset = dragStartOffset + dy;
    newOffset = Math.min(sheetOffsets.collapsed, Math.max(sheetOffsets.full, newOffset));
    currentOffsetPx = newOffset;
    document.documentElement.style.setProperty("--sheet-translateY", newOffset + "px");
  });

  function snap() {
    dragging = false;
    const diffFull = Math.abs(currentOffsetPx - sheetOffsets.full);
    const diffHalf = Math.abs(currentOffsetPx - sheetOffsets.half);
    const diffCol  = Math.abs(currentOffsetPx - sheetOffsets.collapsed);

    let target = SheetState.HALF;
    let best = diffHalf;
    if (diffFull < best) { best = diffFull; target = SheetState.FULL; }
    if (diffCol  < best) { best = diffCol;  target = SheetState.COLLAPSED; }

    applySheetState(target);
  }

  controlPanel.addEventListener("touchend", snap);
  controlPanel.addEventListener("touchcancel", snap);

  // Tap canvas collapses panel
  renderer?.domElement?.addEventListener("pointerdown", () => {
    if (sheetState !== SheetState.COLLAPSED)
      applySheetState(SheetState.COLLAPSED);
  });
}

/* ------------------------------------------------------------
   THREE.JS SCENE
------------------------------------------------------------ */
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
renderer.domElement.style.background = "#e8e4da";
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

if (isMobile) {
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.35;
  controls.panSpeed = 0.35;
}

/* ------------------------------------------------------------
   LIGHTING
------------------------------------------------------------ */
scene.add(new THREE.AmbientLight(0xffffff, 0.08));

const key = new THREE.DirectionalLight(0xffffff, 2.1);
key.position.set(90, 120, 70);
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 1.0);
fill.position.set(-120, 60, -50);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 0.9);
rim.position.set(0, 160, -120);
scene.add(rim);

/* ------------------------------------------------------------
   CONSTANTS + GROUP
------------------------------------------------------------ */
const MM = 0.1;
const EPS = 0.01;
const packGroup = new THREE.Group();
scene.add(packGroup);

/* ------------------------------------------------------------
   HELPERS
------------------------------------------------------------ */
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
    rollsPerLane:    getInt(rollsPerLaneEl, 4),
    rollsPerChannel: getInt(rollsPerChannelEl, 3),
    rollsPerLayer:   getInt(rollsPerLayerEl, 2),

    rollDiameterMm: getFloat(rollDiameterEl, 120),
    coreDiameterMm: getFloat(coreDiameterEl, 45),
    rollHeightMm:   getFloat(rollHeightEl, 100),
    rollGapMm:      getFloat(rollGapEl, 7)
  };
}

/* ------------------------------------------------------------
   PAPER TEXTURE
------------------------------------------------------------ */
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
      const shade = 120 + Math.random() * 18 + (y / size) * 20;
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

/* ------------------------------------------------------------
   BUILD ROLL
------------------------------------------------------------ */
function buildRoll(R_outer, R_coreOuter, L) {
  const group = new THREE.Group();

  const paperSide = new THREE.MeshStandardMaterial({
    color: 0xf7f7ff,
    roughness: 0.55,
    bumpMap: paperBumpTex,
    bumpScale: 0.03
  });
  const paperEnd = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.65,
    bumpMap: paperBumpTex,
    bumpScale: 0.04,
    side: THREE.DoubleSide
  });
  const coreSide = new THREE.MeshStandardMaterial({
    color: 0xb8925d,
    roughness: 0.75
  });
  const coreInner = new THREE.MeshStandardMaterial({
    color: 0x7a7a7a,
    roughness: 0.85,
    side: THREE.BackSide
  });

  const coreThickness = 1.2 * MM;
  const R_coreInner = Math.max(0, R_coreOuter - coreThickness);
  const bevelDepth = 1.0 * MM;

  const sideGeom = new THREE.CylinderGeometry(
    R_outer, R_outer, L - bevelDepth * 2, 64, 1, true
  );
  sideGeom.rotateZ(Math.PI / 2);
  group.add(new THREE.Mesh(sideGeom, paperSide));

  const bevelGeom = new THREE.CylinderGeometry(R_outer, R_outer, bevelDepth, 48, 1, true);
  bevelGeom.rotateZ(Math.PI / 2);

  const bf = new THREE.Mesh(bevelGeom, paperSide);
  bf.position.x = L/2 - bevelDepth/2;
  group.add(bf);

  const bb = bf.clone();
  bb.position.x = -L/2 + bevelDepth/2;
  group.add(bb);

  const endGeom = new THREE.RingGeometry(R_coreOuter, R_outer, 64);
  const ef = new THREE.Mesh(endGeom, paperEnd);
  ef.position.x = L/2;
  ef.rotation.y = Math.PI/2;
  group.add(ef);

  const eb = ef.clone();
  eb.position.x = -L/2;
  eb.rotation.y = -Math.PI/2;
  group.add(eb);

  const coreOutGeom = new THREE.CylinderGeometry(R_coreOuter, R_coreOuter, L * 0.97, 48, 1, true);
  coreOutGeom.rotateZ(Math.PI/2);
  group.add(new THREE.Mesh(coreOutGeom, coreSide));

  const coreInGeom = new THREE.CylinderGeometry(R_coreInner, R_coreInner, L * 0.97, 48, 1, true);
  coreInGeom.rotateZ(Math.PI/2);
  group.add(new THREE.Mesh(coreInGeom, coreInner));

  return group;
}

/* ------------------------------------------------------------
   PACK GENERATION
------------------------------------------------------------ */
function clearPack() {
  while (packGroup.children.length) packGroup.remove(packGroup.children[0]);
}

function generatePack() {
  const p = readParams();

  const R_outer = p.rollDiameterMm * 0.5 * MM;
  const R_core  = p.coreDiameterMm * 0.5 * MM;
  const L       = p.rollHeightMm * MM;

  const D = p.rollDiameterMm * MM;
  const G = p.rollGapMm * MM;

  const spacingX = L + G + EPS;
  const spacingY = D + EPS;
  const spacingZ = D + EPS;

  const offX = -((p.rollsPerLane - 1) * spacingX) / 2;
  const offY = -((p.rollsPerLayer - 1) * spacingY) / 2;
  const offZ = -((p.rollsPerChannel - 1) * spacingZ) / 2;

  clearPack();

  for (let y = 0; y < p.rollsPerLayer; y++)
  for (let x = 0; x < p.rollsPerLane; x++)
  for (let z = 0; z < p.rollsPerChannel; z++) {
    const roll = buildRoll(R_outer, R_core, L);
    roll.position.set(
      offX + x * spacingX,
      offY + y * spacingY,
      offZ + z * spacingZ
    );
    packGroup.add(roll);
  }

  const total = p.rollsPerLane * p.rollsPerChannel * p.rollsPerLayer;
  totalRollsEl.textContent = total;
  countLabel.textContent = `${total} rolls`;

  // AUTO-COLLAPSE ON MOBILE
  if (isMobile) applySheetState(SheetState.COLLAPSED);
}

/* ------------------------------------------------------------
   CAMERA
------------------------------------------------------------ */
function setDefaultCamera() {
  camera.position.set(115, 46, -81);
  controls.target.set(0, 0, 0);
  controls.update();
}

/* ------------------------------------------------------------
   PNG EXPORT
------------------------------------------------------------ */
function exportPNG() {
  const prev = camDebugPanel.style.display;
  camDebugPanel.style.display = "none";

  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL("image/png");

  const p = readParams();
  const name = `toilet_pack_${p.rollsPerChannel}_${p.rollsPerLane}_${p.rollsPerLayer}.png`;

  const a = document.createElement("a");
  a.href = dataURL;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  camDebugPanel.style.display = prev;
}

/* ------------------------------------------------------------
   DEBUG (DESKTOP ONLY)
------------------------------------------------------------ */
function updateCameraDebug() {
  if (isMobile) return;
  camXEl.textContent  = camera.position.x.toFixed(1);
  camYEl.textContent  = camera.position.y.toFixed(1);
  camZEl.textContent  = camera.position.z.toFixed(1);
  camTxEl.textContent = controls.target.x.toFixed(1);
  camTyEl.textContent = controls.target.y.toFixed(1);
  camTzEl.textContent = controls.target.z.toFixed(1);
}

/* ------------------------------------------------------------
   INIT
------------------------------------------------------------ */
generateBtn.onclick = generatePack;
resetCameraBtn.onclick = setDefaultCamera;
exportPngBtn.onclick = exportPNG;

generatePack();
setDefaultCamera();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (isMobile) updateViewportHeight();
});

/* ------------------------------------------------------------
   LOOP
------------------------------------------------------------ */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateCameraDebug();
  renderer.render(scene, camera);
}
animate();
