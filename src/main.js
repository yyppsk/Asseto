import './styles.css';
import * as THREE from 'three';
import { loadSpaTrack, makeTrackCurve } from './trackData.js';
import { CONTACT_START, SOCIAL_START, TRACK_HEIGHT } from './scene/constants.js';
import { loadRaceCarModel, updateCompanionCars, updateRaceCar } from './scene/cars.jsx';
import { createCircuitEnvironment } from './scene/environment.jsx';
import {
  createExhaustSmoke,
  createTrackDetails,
  updateExhaustSmoke,
  updateSceneDetails,
} from './scene/effects.jsx';
import { createGroundGrid, getGridCellFromPosition } from './scene/groundGrid.jsx';
import { loadRealTrackModel } from './scene/realTrack.jsx';
import { buildTrack, getSpaElevation } from './scene/track.jsx';
import { addBackdrop, addLighting, addTerrain } from './scene/world.jsx';

const canvas = document.querySelector('#race-canvas');
const segmentName = document.querySelector('#segment-name');
const lapProgress = document.querySelector('#lap-progress');
const gridCell = document.querySelector('#grid-cell');
const gridPosition = document.querySelector('#grid-position');
const trackVersionLabel = document.querySelector('#track-version-label');
const trackVersionDetail = document.querySelector('#track-version-detail');
const versionOneLink = document.querySelector('#version-one-link');
const versionTwoLink = document.querySelector('#version-two-link');

const trackVersion = getTrackVersion();

let renderer;
let scene;
let camera;
let trackCurve;
let car;
let smokeState;
let companionCars = [];
let curbs = [];
let tireStacks = [];
let sparks = [];
let trackSource = 'fallback';
let progress = 0;
let easedProgress = 0;
let viewport = { width: window.innerWidth, height: window.innerHeight };
let lastFrameTime = performance.now();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-4, -4);
const pointerGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pointerGroundPoint = new THREE.Vector3();

init();

async function init() {
  document.body.dataset.trackVersion = trackVersion;
  updateVersionNav();
  updateTrackVersionStatus('loading');

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(viewport.width, viewport.height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x0b0f13, 1);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0f13, 0.018);

  camera = new THREE.PerspectiveCamera(40, viewport.width / viewport.height, 0.1, 500);
  camera.position.set(0, 26, 56);

  addLighting(scene);
  addTerrain(scene);
  scene.add(createGroundGrid());
  addBackdrop(scene);

  const track = await loadSpaTrack();
  trackSource = track.source;
  trackCurve = makeTrackCurve(track.drivePoints);
  const { trackGroup } = buildTrack({
    scene,
    track,
    trackCurve,
    curbs,
    variant: 'procedural',
  });

  if (trackVersion === 'real-model') {
    const realTrack = await loadRealTrackModel({ scene });
    trackGroup.visible = true;
    updateTrackVersionStatus(realTrack.loaded ? 'real-loaded' : 'real-missing');
  } else {
    updateTrackVersionStatus('procedural');
  }

  createCircuitEnvironment({ scene, trackCurve });

  car = new THREE.Group();
  car.name = 'race-car';
  scene.add(car);
  loadRaceCarModel({ car, scene, companionCars });

  createTrackDetails({ scene, trackCurve, tireStacks, sparks });
  smokeState = createExhaustSmoke({ scene });
  updateScrollState();
  updatePanels(progress);

  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', updateScrollState, { passive: true });
  window.addEventListener('pointermove', handlePointerMove, { passive: true });

  requestAnimationFrame(animate);
}

function getTrackVersion() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('version') ?? params.get('track');
  const path = window.location.pathname.toLowerCase();

  if (requested === '2' || requested === 'real' || path.includes('version-2') || path.includes('real-track')) {
    return 'real-model';
  }

  return 'procedural';
}

function updateVersionNav() {
  versionOneLink?.setAttribute('aria-current', trackVersion === 'procedural' ? 'page' : 'false');
  versionTwoLink?.setAttribute('aria-current', trackVersion === 'real-model' ? 'page' : 'false');
}

function updateTrackVersionStatus(state) {
  if (!trackVersionLabel || !trackVersionDetail) {
    return;
  }

  if (state === 'procedural') {
    trackVersionLabel.textContent = 'Version 1';
    trackVersionDetail.textContent = 'Enhanced procedural asphalt, elevation, banking, curbs, and tire marks';
    return;
  }

  if (state === 'real-loaded') {
    trackVersionLabel.textContent = 'Version 2';
    trackVersionDetail.textContent = 'Loaded real GLB; cars use the smooth Spa drive path until matching route data is added';
    return;
  }

  if (state === 'real-missing') {
    trackVersionLabel.textContent = 'Version 2';
    trackVersionDetail.textContent = 'Waiting for a real track GLB. See real-track-model-notes.md';
    return;
  }

  trackVersionLabel.textContent = trackVersion === 'real-model' ? 'Version 2' : 'Version 1';
  trackVersionDetail.textContent = 'Loading track variation';
}

function animate() {
  const now = performance.now();
  const delta = Math.min((now - lastFrameTime) / 1000, 0.04);
  lastFrameTime = now;
  easedProgress = THREE.MathUtils.damp(easedProgress, progress, 7.5, delta);

  updateRaceCar({
    trackCurve,
    car,
    t: easedProgress,
    delta,
    progress,
    easedProgress,
    sparks,
    camera,
    smokeState,
  });
  updateCompanionCars({ trackCurve, companionCars, t: easedProgress, delta });
  updateCamera(easedProgress, delta);
  updateSceneDetails({ curbs, tireStacks, raycaster, pointer, camera, delta });
  updateExhaustSmoke(smokeState, delta);
  updateHud(progress);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function updateCamera(t, delta) {
  const point = trackCurve.getPointAt(t % 1);
  point.y = TRACK_HEIGHT + getSpaElevation(t % 1);
  const tangent = trackCurve.getTangentAt(t % 1).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  const sideDrift = viewport.width < 720 ? 3.4 : 5.2;
  const cinematicOffset = normal.multiplyScalar(Math.sin(t * Math.PI * 2.3) * sideDrift);
  const height = viewport.width < 720 ? 17 : 11;
  const distance = viewport.width < 720 ? 24 : 21.5;

  const targetPosition = point
    .clone()
    .sub(tangent.clone().multiplyScalar(distance))
    .add(cinematicOffset)
    .add(new THREE.Vector3(0, height, 0));

  camera.position.lerp(targetPosition, 1 - Math.exp(-delta * 3.6));

  const lookAhead = point.clone().add(tangent.multiplyScalar(2.6));
  lookAhead.y = point.y + 0.9;
  camera.lookAt(lookAhead);
}

function updateHud(t) {
  lapProgress.style.transform = `scaleX(${THREE.MathUtils.clamp(t, 0, 1)})`;

  const segment = getSegmentName(t);
  if (segmentName.textContent !== segment) {
    segmentName.textContent = segment;
  }
}

function getSegmentName(t) {
  if (t >= CONTACT_START) return 'Chicane Exit';
  if (t >= SOCIAL_START) return 'First Chicane';
  if (t >= 0.55) return 'Blanchimont';
  if (t >= 0.35) return 'Les Combes';
  if (t >= 0.16) return 'Kemmel';
  if (t >= 0.07) return 'Raidillon';
  return trackSource === 'fallback' ? 'Spa Loop' : 'La Source';
}

function updateScrollState() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  progress = THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 0.995);
  updatePanels(progress);
}

function updatePanels(t) {
  document.body.dataset.stage = t >= CONTACT_START ? 'contact' : t >= SOCIAL_START ? 'social' : t >= 0.32 ? 'pace' : 'intro';
}

function handleResize() {
  viewport = { width: window.innerWidth, height: window.innerHeight };
  renderer.setSize(viewport.width, viewport.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  camera.aspect = viewport.width / viewport.height;
  camera.updateProjectionMatrix();
}

function handlePointerMove(event) {
  pointer.x = (event.clientX / viewport.width) * 2 - 1;
  pointer.y = -(event.clientY / viewport.height) * 2 + 1;
  updateGridReadout();
}

function updateGridReadout() {
  if (!camera || !gridCell || !gridPosition) {
    return;
  }

  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectPlane(pointerGroundPlane, pointerGroundPoint)) {
    return;
  }

  const { cell, x, z } = getGridCellFromPosition(pointerGroundPoint);
  gridCell.textContent = cell;
  gridPosition.textContent = `X ${x} / Z ${z}`;
}
