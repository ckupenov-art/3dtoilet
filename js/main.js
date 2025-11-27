import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';

const container = document.getElementById('scene-container');
const countLabel = document.getElementById('count-label');
const regenButton = document.getElementById('regenerate-btn');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020617);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(10, 10, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.04;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
scene.add(dirLight);

const groundGeo = new THREE.PlaneGeometry(60, 60);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x020617,
  roughness: 0.9,
  metalness: 0.1
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -6;
ground.receiveShadow = true;
scene.add(ground);

const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

function randomColor() {
  const palette = [
    0x38bdf8,
    0xa855f7,
    0xf97316,
    0x22c55e,
    0xfacc15,
    0xec4899
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}

function clearCubes() {
  while (cubeGroup.children.length > 0) {
    const obj = cubeGroup.children[0];
    cubeGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }
}

function generateRandomCubes(count = 80) {
  clearCubes();

  const sizeMin = 0.3;
  const sizeMax = 1.6;
  const spread = 10;

  for (let i = 0; i < count; i++) {
    const size = sizeMin + Math.random() * (sizeMax - sizeMin);

    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({
      color: randomColor(),
      roughness: 0.4,
      metalness: 0.6
    });

    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;

    cube.position.set(
      (Math.random() - 0.5) * spread * 2,
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread * 2
    );

    cube.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    cubeGroup.add(cube);
  }

  countLabel.textContent = `${count} cubes`;
}

let cubeCount = 80;
generateRandomCubes(cubeCount);

regenButton.addEventListener('click', () => {
  const jitter = Math.floor(Math.random() * 21) - 10;
  cubeCount = Math.max(20, cubeCount + jitter);
  generateRandomCubes(cubeCount);
});

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

function animate() {
  requestAnimationFrame(animate);

  cubeGroup.rotation.y += 0.0016;
  cubeGroup.rotation.x += 0.0007;

  controls.update();
  renderer.render(scene, camera);
}

animate();
