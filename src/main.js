import './styles.css';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadSpaTrack, makeTrackCurve } from './trackData.js';

const canvas = document.querySelector('#race-canvas');
const segmentName = document.querySelector('#segment-name');
const lapProgress = document.querySelector('#lap-progress');

const SOCIAL_START = 0.58;
const CONTACT_START = 0.86;
const CHICANE_START = 0.62;
const TRACK_HEIGHT = 1.35;
const CAR_RIDE_HEIGHT = 0.06;
const ROAD_COLUMNS = 7;
const SMOKE_PARTICLE_COUNT = 42;

let renderer;
let scene;
let camera;
let trackCurve;
let car;
let trackRibbon;
let curbs = [];
let tireStacks = [];
let sparks = [];
let smokeParticles = [];
let trackSource = 'fallback';
let progress = 0;
let easedProgress = 0;
let smokeAccumulator = 0;
let smokeCursor = 0;
let viewport = { width: window.innerWidth, height: window.innerHeight };
let lastFrameTime = performance.now();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-4, -4);

init();

async function init() {
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

  addLighting();
  addTerrain();
  addBackdrop();

  const track = await loadSpaTrack();
  trackSource = track.source;
  trackCurve = makeTrackCurve(track.drivePoints);
  buildTrack(track);

  car = new THREE.Group();
  car.name = 'race-car';
  scene.add(car);
  loadRaceCarModel();

  createTrackDetails();
  createExhaustSmoke();
  updateScrollState();
  updatePanels(progress);

  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', updateScrollState, { passive: true });
  window.addEventListener('pointermove', handlePointerMove, { passive: true });

  requestAnimationFrame(animate);
}

function addLighting() {
  scene.add(new THREE.HemisphereLight(0xbcd7ff, 0x142013, 1.65));

  const sun = new THREE.DirectionalLight(0xffe5c2, 3.5);
  sun.position.set(-28, 48, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  scene.add(sun);

  const trackGlow = new THREE.PointLight(0xff365e, 45, 52, 2.2);
  trackGlow.position.set(-11, 8, 22);
  scene.add(trackGlow);
}

function addTerrain() {
  const groundGeometry = new THREE.PlaneGeometry(280, 280, 120, 120);
  const positions = groundGeometry.attributes.position;

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const height = -1.35 + Math.sin(x * 0.045) * 0.34 + Math.cos(y * 0.035) * 0.28;
    positions.setZ(i, height);
  }

  groundGeometry.rotateX(-Math.PI / 2);
  groundGeometry.computeVertexNormals();

  const ground = new THREE.Mesh(
    groundGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x23332a,
      roughness: 0.92,
      metalness: 0.02,
    }),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(240, 48, 0x3f5346, 0x2e3a33);
  grid.position.y = -1.12;
  grid.material.opacity = 0.12;
  grid.material.transparent = true;
  scene.add(grid);
}

function addBackdrop() {
  const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x17251b, roughness: 0.88 });
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2d22, roughness: 0.8 });
  const coneGeometry = new THREE.ConeGeometry(1.6, 8, 7);
  const trunkGeometry = new THREE.CylinderGeometry(0.16, 0.26, 2.2, 6);

  for (let i = 0; i < 140; i += 1) {
    const angle = (i / 140) * Math.PI * 2;
    const radius = 62 + Math.sin(i * 1.91) * 16 + Math.random() * 20;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const tree = new THREE.Mesh(coneGeometry, treeMaterial);
    tree.position.set(x, 5.2, z);
    tree.scale.setScalar(0.8 + Math.random() * 0.9);
    tree.castShadow = true;
    scene.add(tree);
  }
}

function buildTrack(track) {
  const roadGeometry = createRoadGeometry(track.centerPoints, track.widths);
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x191b1c,
    roughness: 0.76,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  trackRibbon = new THREE.Mesh(roadGeometry, roadMaterial);
  trackRibbon.receiveShadow = true;
  trackRibbon.castShadow = true;
  scene.add(trackRibbon);

  const racingLineGeometry = new THREE.TubeGeometry(trackCurve, 900, 0.08, 6, true);
  const racingLine = new THREE.Mesh(
    racingLineGeometry,
    new THREE.MeshBasicMaterial({ color: 0xf7f0d0, transparent: true, opacity: 0.32 }),
  );
  racingLine.position.y = TRACK_HEIGHT + 0.08;
  scene.add(racingLine);

  const barrierMaterial = new THREE.MeshStandardMaterial({
    color: 0xcfd4cc,
    roughness: 0.78,
    metalness: 0.12,
  });

  for (const side of ['left', 'right']) {
    const railCurve = createBoundaryCurve(track.centerPoints, track.widths, side, 0.34);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 1200, 0.09, 8, true), barrierMaterial);
    rail.position.y = TRACK_HEIGHT + 0.17;
    rail.castShadow = true;
    scene.add(rail);
  }

  const curbMaterial = new THREE.MeshStandardMaterial({
    color: 0xd41f3d,
    roughness: 0.56,
    metalness: 0.02,
  });
  const curbGeometry = new THREE.BoxGeometry(1.1, 0.18, 0.36);

  for (let i = 0; i < 76; i += 1) {
    const index = Math.floor((i / 76) * track.centerPoints.length);
    const t = index / track.centerPoints.length;
    if (t > 0.2 && t < 0.48) {
      continue;
    }

    const { point, tangent, normal } = getTrackFrame(track.centerPoints, index);
    const side = i % 2 === 0 ? 'left' : 'right';
    const sideWidth = track.widths[index]?.[side] ?? 2.2;
    const curb = new THREE.Mesh(curbGeometry, curbMaterial);
    curb.position.copy(point).add(normal.multiplyScalar(side === 'left' ? sideWidth - 0.32 : -sideWidth + 0.32));
    curb.position.y = TRACK_HEIGHT + 0.18;
    curb.rotation.y = Math.atan2(tangent.x, tangent.z);
    curb.castShadow = true;
    curbs.push(curb);
    scene.add(curb);
  }
}

function createRoadGeometry(points, widths) {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= points.length; i += 1) {
    const index = i % points.length;
    const t = i / points.length;
    const { point, normal } = getTrackFrame(points, index);
    const width = widths[index] ?? { left: 2.2, right: 2.2 };
    const totalWidth = width.left + width.right;

    for (let column = 0; column < ROAD_COLUMNS; column += 1) {
      const u = column / (ROAD_COLUMNS - 1);
      const offset = width.left - totalWidth * u;
      const crown = Math.sin(Math.PI * u) * 0.055;
      const edgeDrop = (Math.abs(u - 0.5) * 2) ** 2 * -0.025;
      const vertex = point.clone().add(normal.clone().multiplyScalar(offset));
      vertex.y = TRACK_HEIGHT + crown + edgeDrop;

      vertices.push(vertex.x, vertex.y, vertex.z);
      normals.push(0, 1, 0);
      uvs.push(u, t * 22);
    }

    if (i < points.length) {
      const rowStart = i * ROAD_COLUMNS;
      const nextRowStart = (i + 1) * ROAD_COLUMNS;

      for (let column = 0; column < ROAD_COLUMNS - 1; column += 1) {
        indices.push(
          rowStart + column,
          rowStart + column + 1,
          nextRowStart + column,
          rowStart + column + 1,
          nextRowStart + column + 1,
          nextRowStart + column,
        );
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createBoundaryCurve(points, widths, side, margin = 0) {
  const boundaryPoints = points.map((point, index) => {
    const { normal } = getTrackFrame(points, index);
    const width = widths[index]?.[side] ?? 2.2;
    const direction = side === 'left' ? 1 : -1;
    return point.clone().add(normal.multiplyScalar(direction * (width + margin)));
  });

  const curve = new THREE.CatmullRomCurve3(boundaryPoints, true, 'centripetal');
  curve.arcLengthDivisions = Math.max(2400, boundaryPoints.length * 2);
  return curve;
}

function getTrackFrame(points, index) {
  const current = points[index % points.length];
  const previous = points[(index - 1 + points.length) % points.length];
  const next = points[(index + 1) % points.length];
  const tangent = next.clone().sub(previous).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

  return { point: current, tangent, normal };
}

function loadRaceCarModel() {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.load(
    '/models/ferrari.glb',
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (!child.isMesh) {
          return;
        }
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.envMapIntensity = 0.6;
          child.material.needsUpdate = true;
        }
      });

      fitRaceCarModel(model);
      model.rotation.y = Math.PI;
      model.name = 'ferrari-glb';
      car.add(model);
    },
    undefined,
    (error) => {
      console.warn('Race car GLB could not be loaded.', error);
    },
  );
}

function fitRaceCarModel(model) {
  const initialBox = new THREE.Box3().setFromObject(model);
  const initialSize = new THREE.Vector3();
  initialBox.getSize(initialSize);
  model.scale.setScalar(4.6 / Math.max(initialSize.x, initialSize.z));

  const fittedBox = new THREE.Box3().setFromObject(model);
  const fittedCenter = new THREE.Vector3();
  fittedBox.getCenter(fittedCenter);
  model.position.x -= fittedCenter.x;
  model.position.z -= fittedCenter.z;
  model.position.y -= fittedBox.min.y;
}

function createTrackDetails() {
  const stackGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.42, 16);
  const stackMaterial = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.85 });
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffc845, transparent: true, opacity: 0.9 });

  for (let i = 0; i < 30; i += 1) {
    const t = (i / 30 + 0.04) % 1;
    const point = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const stack = new THREE.Mesh(stackGeometry, stackMaterial);
    stack.position.copy(point).add(normal.multiplyScalar(i % 2 === 0 ? 3.8 : -3.8));
    stack.position.y = TRACK_HEIGHT + 0.2;
    stack.rotation.z = Math.PI / 2;
    stack.castShadow = true;
    tireStacks.push(stack);
    scene.add(stack);
  }

  for (let i = 0; i < 34; i += 1) {
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), sparkMaterial.clone());
    spark.visible = false;
    sparks.push(spark);
    scene.add(spark);
  }
}

function createExhaustSmoke() {
  const smokeTexture = createSmokeTexture();

  for (let i = 0; i < SMOKE_PARTICLE_COUNT; i += 1) {
    const particle = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: smokeTexture,
        color: 0xd9d6cc,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
      }),
    );
    particle.visible = false;
    particle.userData = {
      age: 0,
      life: 1,
      baseOpacity: 0.12,
      baseScale: 0.35,
      spin: 0,
      velocity: new THREE.Vector3(),
    };
    smokeParticles.push(particle);
    scene.add(particle);
  }
}

function createSmokeTexture() {
  const size = 96;
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = size;
  textureCanvas.height = size;
  const context = textureCanvas.getContext('2d');
  const gradient = context.createRadialGradient(size * 0.5, size * 0.5, 3, size * 0.5, size * 0.5, size * 0.48);
  gradient.addColorStop(0, 'rgba(255, 255, 246, 0.42)');
  gradient.addColorStop(0.35, 'rgba(215, 218, 211, 0.2)');
  gradient.addColorStop(1, 'rgba(180, 184, 178, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function animate() {
  const now = performance.now();
  const delta = Math.min((now - lastFrameTime) / 1000, 0.04);
  lastFrameTime = now;
  easedProgress = THREE.MathUtils.damp(easedProgress, progress, 7.5, delta);
  updateCar(easedProgress, delta);
  updateCamera(easedProgress, delta);
  updateSceneDetails(delta);
  updateExhaustSmoke(delta);
  updateHud(progress);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function updateCar(t, delta) {
  if (!trackCurve || !car) {
    return;
  }

  const carPoint = trackCurve.getPointAt(t % 1);
  const tangent = trackCurve.getTangentAt(t % 1).normalize();
  const chicaneEnergy = smoothPulse(t, CHICANE_START, 0.08);

  car.position.copy(carPoint);
  car.position.y = TRACK_HEIGHT + CAR_RIDE_HEIGHT + Math.sin(t * Math.PI * 16) * 0.025 + chicaneEnergy * 0.1;
  car.rotation.y = Math.atan2(tangent.x, tangent.z);
  car.rotation.z = THREE.MathUtils.damp(car.rotation.z, Math.sin(t * Math.PI * 22) * 0.04 * chicaneEnergy, 6, delta);
  car.rotation.x = THREE.MathUtils.damp(car.rotation.x, -0.04 - chicaneEnergy * 0.06, 5, delta);

  const speedGlow = THREE.MathUtils.clamp((progress - easedProgress) * 26, 0, 1);
  car.scale.setScalar(1 + speedGlow * 0.05);

  for (let i = 0; i < sparks.length; i += 1) {
    const spark = sparks[i];
    const active = chicaneEnergy > 0.4 && i / sparks.length < chicaneEnergy;
    spark.visible = active;
    if (active) {
      const side = i % 2 === 0 ? -1 : 1;
      spark.position.copy(carPoint);
      spark.position.x += side * (0.8 + Math.random() * 0.25);
      spark.position.z -= 0.7 + Math.random() * 1.5;
      spark.position.y = TRACK_HEIGHT + 0.12 + Math.random() * 0.36;
      spark.material.opacity = 0.25 + Math.random() * 0.75;
    }
  }

  emitExhaustSmoke(carPoint, tangent, delta, chicaneEnergy);
}

function updateCamera(t, delta) {
  const point = trackCurve.getPointAt(t % 1);
  point.y = TRACK_HEIGHT;
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
  lookAhead.y = TRACK_HEIGHT + 0.9;
  camera.lookAt(lookAhead);
}

function emitExhaustSmoke(carPoint, tangent, delta, chicaneEnergy) {
  if (!smokeParticles.length) {
    return;
  }

  smokeAccumulator += delta * (14 + chicaneEnergy * 7);

  while (smokeAccumulator >= 1) {
    smokeAccumulator -= 1;
    const particle = smokeParticles[smokeCursor];
    smokeCursor = (smokeCursor + 1) % smokeParticles.length;

    const back = camera.position.clone().sub(carPoint);
    back.y = 0;
    if (back.lengthSq() < 0.01) {
      back.copy(tangent).multiplyScalar(-1);
    }
    back.normalize();
    const normal = new THREE.Vector3(-back.z, 0, back.x).normalize();
    const side = Math.random() > 0.5 ? 1 : -1;

    particle.visible = true;
    particle.material.opacity = 0.22 + Math.random() * 0.08;
    particle.material.rotation = Math.random() * Math.PI;
    particle.position
      .copy(carPoint)
      .add(back.clone().multiplyScalar(2.05 + Math.random() * 0.3))
      .add(normal.multiplyScalar(side * (0.26 + Math.random() * 0.08)));
    particle.position.y = TRACK_HEIGHT + 0.56 + Math.random() * 0.1;

    const baseScale = 0.42 + Math.random() * 0.2;
    particle.scale.setScalar(baseScale);
    particle.userData.age = 0;
    particle.userData.life = 0.95 + Math.random() * 0.6;
    particle.userData.baseOpacity = particle.material.opacity;
    particle.userData.baseScale = baseScale;
    particle.userData.spin = (Math.random() - 0.5) * 1.2;
    particle.userData.velocity
      .copy(back)
      .multiplyScalar(0.38 + Math.random() * 0.34)
      .add(new THREE.Vector3(0, 0.34 + Math.random() * 0.22, 0))
      .add(new THREE.Vector3((Math.random() - 0.5) * 0.22, 0, (Math.random() - 0.5) * 0.22));
  }
}

function updateExhaustSmoke(delta) {
  for (const particle of smokeParticles) {
    if (!particle.visible) {
      continue;
    }

    particle.userData.age += delta;
    const lifeRatio = particle.userData.age / particle.userData.life;

    if (lifeRatio >= 1) {
      particle.visible = false;
      particle.material.opacity = 0;
      continue;
    }

    particle.position.addScaledVector(particle.userData.velocity, delta);
    particle.userData.velocity.multiplyScalar(1 - delta * 0.45);
    particle.material.rotation += particle.userData.spin * delta;

    const fade = 1 - THREE.MathUtils.smoothstep(lifeRatio, 0.35, 1);
    const scale = particle.userData.baseScale * (1 + lifeRatio * 2.2);
    particle.scale.setScalar(scale);
    particle.material.opacity = particle.userData.baseOpacity * fade;
  }
}

function updateSceneDetails(delta) {
  for (let i = 0; i < curbs.length; i += 1) {
    curbs[i].material.color.lerp(new THREE.Color(i % 2 === 0 ? 0xf4f2e8 : 0xd51e38), delta * 2);
  }

  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(tireStacks, false);
  tireStacks.forEach((stack) => stack.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 5));
  if (intersections[0]) {
    intersections[0].object.scale.lerp(new THREE.Vector3(1.25, 1.25, 1.25), delta * 10);
  }
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
}

function smoothPulse(value, start, width) {
  const enter = THREE.MathUtils.smoothstep(value, start - width, start);
  const exit = 1 - THREE.MathUtils.smoothstep(value, start + width, start + width * 2);
  return Math.max(0, enter * exit);
}
