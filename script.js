// IMPORTANT: this file is an ES module. Modern browsers required.

import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

// MediaPipe Hands (non-module build exposes window.Hands, window.Camera etc.)
const MEDIAPIPE_HANDS = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
const MEDIAPIPE_CAMERA = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';

// DOM
const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d', { alpha: true });
const statusEl = document.getElementById('status');
const threeContainer = document.getElementById('three-container');
const btnCube = document.getElementById('shape-cube');
const btnSphere = document.getElementById('shape-sphere');
const btnTorus = document.getElementById('shape-torus');
const btnReset = document.getElementById('reset');
const toggleVideo = document.getElementById('toggle-video');

let hands = null;
let cameraUtils = null;
let cameraReady = false;
let lastPinchDistance = null;
let currentGesture = null;

// THREE.JS scene
let renderer, scene, camera, object3d, light;
initThree();
createObject('cube');
updateActiveButton('cube');
animateThree();

// responsive overlay
function resizeCanvases() {
  const rect = threeContainer.getBoundingClientRect();
  overlay.width = rect.width;
  overlay.height = rect.height;
  // Ensure Three renderer matches container
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resizeCanvases);

// Setup Three.js
function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  threeContainer.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = null; // transparent background

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 0, 6);

  // Enhanced lighting setup
  light = new THREE.DirectionalLight(0x4dd0e1, 1.5);
  light.position.set(5, 10, 10);
  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 50;
  scene.add(light);

  const ambient = new THREE.AmbientLight(0x4dd0e1, 0.3);
  scene.add(ambient);

  // Add point lights for better illumination
  const pointLight1 = new THREE.PointLight(0x06b6d4, 0.8, 20);
  pointLight1.position.set(-5, 5, 5);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x67e8f9, 0.6, 20);
  pointLight2.position.set(5, -5, 5);
  scene.add(pointLight2);

  // Enhanced ground plane with better grid
  const grid = new THREE.GridHelper(20, 20, 0x06b6d4, 0x0a4d5a);
  grid.material.opacity = 0.1;
  grid.material.transparent = true;
  scene.add(grid);

  // Add a subtle fog effect
  scene.fog = new THREE.Fog(0x071024, 15, 25);

  // initial size
  const rect = threeContainer.getBoundingClientRect();
  renderer.setSize(Math.max(600, rect.width), Math.max(400, rect.height));
  resizeCanvases();
}

function createObject(type) {
  // remove previous
  if (object3d) scene.remove(object3d);

  let geo;
  if (type === 'cube') geo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
  else if (type === 'sphere') geo = new THREE.SphereGeometry(0.9, 32, 32);
  else geo = new THREE.TorusKnotGeometry(0.6, 0.18, 120, 16);

  // Enhanced materials with better visual properties
  const mat = new THREE.MeshStandardMaterial({
    color: 0x4dd0e1,
    metalness: 0.4,
    roughness: 0.2,
    envMapIntensity: 1.0,
    transparent: true,
    opacity: 0.9
  });

  object3d = new THREE.Mesh(geo, mat);
  object3d.castShadow = true;
  object3d.receiveShadow = true;
  scene.add(object3d);
  object3d.position.set(0, 0, 0);
  object3d.rotation.set(0.2, 0.4, 0);

  // Add subtle animation
  object3d.userData.rotationSpeed = 0.005;

  // store default
  object3d.userData.default = {
    scale: object3d.scale.clone(),
    rotation: object3d.rotation.clone(),
    position: object3d.position.clone()
  };
}

// animation loop
function animateThree() {
  requestAnimationFrame(animateThree);
  renderer.render(scene, camera);
}

// UI
function updateActiveButton(type) {
  [btnCube, btnSphere, btnTorus].forEach(btn => btn.classList.remove('active'));
  if (type === 'cube') btnCube.classList.add('active');
  else if (type === 'sphere') btnSphere.classList.add('active');
  else if (type === 'torus') btnTorus.classList.add('active');
}

btnCube.addEventListener('click', () => {
  createObject('cube');
  updateActiveButton('cube');
});
btnSphere.addEventListener('click', () => {
  createObject('sphere');
  updateActiveButton('sphere');
});
btnTorus.addEventListener('click', () => {
  createObject('torus');
  updateActiveButton('torus');
});
btnReset.addEventListener('click', () => {
  if (!object3d) return;
  const d = object3d.userData.default;
  object3d.position.copy(d.position);
  object3d.rotation.copy(d.rotation);
  object3d.scale.copy(d.scale);
});

toggleVideo.addEventListener('change', (e) => {
  video.style.display = e.target.checked ? 'block' : 'none';
  // Also adjust opacity for better integration
  if (e.target.checked) {
    video.style.opacity = '0.8';
    video.style.filter = 'blur(0.5px)';
  }
});

// load MediaPipe script(s)
async function loadMediaPipe() {
  await loadScript(MEDIAPIPE_HANDS);
  await loadScript(MEDIAPIPE_CAMERA);
  // create Hands instance (global Hands is available)
  hands = new window.Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
  });

  hands.onResults(onHandsResults);
  cameraUtils = window.Camera;
}

// tiny script loader
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res();
    s.onerror = (e) => rej(e);
    document.head.appendChild(s);
  });
}

// start webcam and feed into MediaPipe
async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusEl.textContent = 'Status: Camera not available in this browser';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' }, audio: false });
    video.srcObject = stream;
    await video.play();
    video.style.transform = 'scaleX(-1)'; // mirror
    cameraReady = true;

    // Hook MediaPipe camera util to feed video frames
    const mpCamera = new cameraUtils(video, {
      onFrame: async () => {
        if (hands) await hands.send({ image: video });
      },
      width: video.videoWidth || 1280,
      height: video.videoHeight || 720
    });
    mpCamera.start();

    statusEl.textContent = 'Status: Camera started — show your palm';
    toggleVideo.checked = true;
    video.style.display = 'block';
    video.style.opacity = '0.8';
    video.style.filter = 'blur(0.5px)';
    resizeCanvases();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Status: Camera permission denied or error';
  }
}

// map normalized point (x: 0..1 left->right from Mediapipe) to three.js world coords
function normalizedToWorld(nx, ny) {
  // overlay canvas coords to world: center at 0, y up
  const w = overlay.width;
  const h = overlay.height;
  const xpx = nx * w;
  const ypx = ny * h;
  // map to -aspect..aspect horizontally and -1..1 vertically, then scale by camera distance
  const aspect = (w / h) * 1.0;
  const x = ((xpx / w) - 0.5) * 2 * aspect * 1.2;
  const y = -((ypx / h) - 0.5) * 2 * 1.2;
  return new THREE.Vector3(x, y, 0);
}

// draw skeleton lines on overlay
function drawSkeleton(landmarks) {
  const w = overlay.width;
  const h = overlay.height;
  overlayCtx.clearRect(0, 0, w, h);

  if (!landmarks) return;

  overlayCtx.lineWidth = 2.6;
  overlayCtx.strokeStyle = 'white';
  overlayCtx.fillStyle = 'rgba(255,255,255,0.02)';

  // draw joints
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const x = (1 - lm.x) * w; // mirror horizontally: mediapipe coordinates origin is left but video is mirrored
    const y = lm.y * h;
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, 3.2, 0, Math.PI * 2);
    overlayCtx.fill();
  }

  // finger connections by index sets (MediaPipe topology)
  const connections = [
    [0, 1, 2, 3, 4],    // thumb
    [0, 5, 6, 7, 8],    // index
    [0, 9, 10, 11, 12], // middle
    [0, 13, 14, 15, 16],// ring
    [0, 17, 18, 19, 20] // pinky
  ];

  overlayCtx.lineJoin = 'round';
  overlayCtx.lineCap = 'round';

  for (const chain of connections) {
    overlayCtx.beginPath();
    for (let i = 0; i < chain.length; i++) {
      const lm = landmarks[chain[i]];
      const x = (1 - lm.x) * w;
      const y = lm.y * h;
      if (i === 0) overlayCtx.moveTo(x, y);
      else overlayCtx.lineTo(x, y);
    }
    overlayCtx.stroke();
  }
}

// compute palm center (average of palm base landmarks)
function palmCenter(landmarks) {
  // use wrist (0) + mcp joints (5,9,13,17)
  const inds = [0, 5, 9, 13, 17];
  let ax = 0, ay = 0;
  for (const i of inds) {
    ax += landmarks[i].x; ay += landmarks[i].y;
  }
  return { x: ax / inds.length, y: ay / inds.length };
}

// calculate rotation angle of the palm using vector between index_mcp (5) and pinky_mcp (17)
function palmAngle(landmarks) {
  const a = landmarks[5];
  const b = landmarks[17];
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  return Math.atan2(vy, vx); // radians
}

// handle MediaPipe results
function onHandsResults(results) {
  if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    statusEl.textContent = 'Status: No hand detected';
    lastPinchDistance = null;
    return;
  }
  statusEl.textContent = 'Status: Hand detected';
  const lm = results.multiHandLandmarks[0];

  drawSkeleton(lm);

  // palm center -> move object
  const pcenter = palmCenter(lm);
  const worldPos = normalizedToWorld(pcenter.x, pcenter.y);
  if (object3d) {
    // smooth follow
    object3d.position.lerp(worldPos, 0.18);
  }

  // pinch detection (thumb tip 4, index tip 8)
  const thumb = lm[4], index = lm[8];
  const dx = thumb.x - index.x;
  const dy = thumb.y - index.y;
  const pinchDist = Math.hypot(dx, dy); // normalized

  // map pinch to scale: choose a comfortable baseline
  if (lastPinchDistance === null) lastPinchDistance = pinchDist;
  const pinchDelta = pinchDist - lastPinchDistance;

  // if fingers are close enough -> "pinch active"
  const PINCH_THRESHOLD = 0.05;
  if (pinchDist < 0.08) {
    // small distance => tight pinch — start scaling based on movement
    currentGesture = 'pinch';
  } else {
    currentGesture = null;
  }

  // scale object while pinch active: compare distance changes across frames (use absolute distance mapping)
  if (object3d) {
    // compute scaling factor from thumb-index absolute distance (invert: bigger distance => larger scale)
    const scaleBase = THREE.MathUtils.clamp((pinchDist * 6.0), 0.3, 3.5);
    // smooth scale
    const targetScale = new THREE.Vector3(scaleBase, scaleBase, scaleBase);
    object3d.scale.lerp(targetScale, 0.18);
  }

  // rotation by palm angle
  const angle = palmAngle(lm);
  if (object3d) {
    // use angle to set rotation around Z and a small Y rotation
    object3d.rotation.z = -angle; // invert to match visual
    // tilt from difference between wrist and middle finger tip height
    const wrist = lm[0];
    const midTip = lm[12];
    const tilt = (midTip.y - wrist.y) * 3.5;
    object3d.rotation.x = THREE.MathUtils.lerp(object3d.rotation.x, tilt, 0.12);
  }

  // update last pinch
  lastPinchDistance = pinchDist;
}

// start
(async function main() {
  try {
    await loadMediaPipe();
    await startCamera();
  } catch (e) {
    console.error(e);
    statusEl.textContent = 'Status: Failed to load MediaPipe. See console for details.';
  }
})();
