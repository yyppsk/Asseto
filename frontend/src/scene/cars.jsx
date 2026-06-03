import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CAR_RIDE_HEIGHT, CHICANE_START, COMPANION_CAR_CONFIGS, TRACK_HEIGHT } from './constants.js';
import { emitExhaustSmoke, updateSparks } from './effects.jsx';
import { smoothPulse } from './trackFrame.js';

let vehicleLightAssets = null;
const raceCarPoint = new THREE.Vector3();
const raceCarTangent = new THREE.Vector3();
const companionPoint = new THREE.Vector3();
const companionTangent = new THREE.Vector3();
const companionNormal = new THREE.Vector3();
const companionTargetPosition = new THREE.Vector3();

function getDefaultSurfaceY(_t, point) {
  return point?.y ?? TRACK_HEIGHT;
}

export function loadRaceCarModel({ car, scene, companionCars }) {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.load(
    '/models/ferrari.glb',
    (gltf) => {
      const model = gltf.scene;
      prepareLoadedCarModel(model);
      fitRaceCarModel(model);
      model.rotation.y = Math.PI;
      model.name = 'ferrari-glb';
      car.add(model);
      addVehicleLightRig(car, { dynamicLight: true });
      createCompanionCars({ scene, companionCars, sourceModel: model });
    },
    undefined,
    (error) => {
      console.warn('Race car GLB could not be loaded.', error);
    },
  );
}

export function updateRaceCar({
  trackCurve,
  car,
  t,
  delta,
  progress,
  easedProgress,
  sparks,
  camera,
  smokeState,
  getSurfaceY = getDefaultSurfaceY,
  rideHeight = CAR_RIDE_HEIGHT,
  lockToSurface = false,
  smoothHeading = false,
  headingDamping = 14,
}) {
  if (!trackCurve || !car) {
    return;
  }

  const trackT = t % 1;
  const carPoint = getCurvePointAt(trackCurve, trackT, raceCarPoint);
  const tangent = getCurveTangentAt(trackCurve, trackT, raceCarTangent);
  const chicaneEnergy = smoothPulse(t, CHICANE_START, 0.08);
  const surfaceY = getSurfaceY(trackT, carPoint);
  const surfaceMotion = lockToSurface ? 0 : Math.sin(t * Math.PI * 16) * 0.025 + chicaneEnergy * 0.1;

  car.position.copy(carPoint);
  car.position.y = surfaceY + rideHeight + surfaceMotion;
  setHeading(car, Math.atan2(tangent.x, tangent.z), {
    smoothHeading,
    headingDamping,
    delta,
  });
  car.rotation.z = THREE.MathUtils.damp(car.rotation.z, Math.sin(t * Math.PI * 22) * 0.04 * chicaneEnergy, 6, delta);
  car.rotation.x = THREE.MathUtils.damp(car.rotation.x, -0.04 - chicaneEnergy * 0.06, 5, delta);

  const speedGlow = THREE.MathUtils.clamp((progress - easedProgress) * 26, 0, 1);
  car.scale.setScalar(1 + speedGlow * 0.05);

  updateSparks({ sparks, carPoint: car.position, chicaneEnergy, surfaceY });
  emitExhaustSmoke({ smokeState, camera, carPoint: car.position, tangent, delta, chicaneEnergy });
}

export function updateCompanionCars({
  trackCurve,
  companionCars,
  t,
  delta,
  getSurfaceY = getDefaultSurfaceY,
  spacingScale = 1,
  rideHeight = CAR_RIDE_HEIGHT,
  lockToSurface = false,
  laneScale = 1,
  smoothHeading = false,
  headingDamping = 14,
}) {
  if (!trackCurve || !companionCars.length) {
    return;
  }

  companionCars.forEach(({ group, config }, index) => {
    const carT = (t + config.offset * spacingScale + 1) % 1;
    const point = getCurvePointAt(trackCurve, carT, companionPoint);
    const tangent = getCurveTangentAt(trackCurve, carT, companionTangent);
    const normal = companionNormal.set(-tangent.z, 0, tangent.x).normalize();
    const chicaneEnergy = smoothPulse(carT, CHICANE_START, 0.09);
    const surfaceY = getSurfaceY(carT, point);
    const laneDrift = Math.sin((t + index * 0.21) * Math.PI * 2) * 0.12;
    const targetPosition = companionTargetPosition
      .copy(point)
      .addScaledVector(normal, config.laneOffset * laneScale + laneDrift);
    const surfaceMotion =
      lockToSurface ? 0 : Math.sin((t + index * 0.13) * Math.PI * 14) * 0.018 + chicaneEnergy * 0.045;

    targetPosition.y = surfaceY + rideHeight + surfaceMotion;
    if (!group.userData.hasTrackPosition) {
      group.position.copy(targetPosition);
      group.userData.hasTrackPosition = true;
      group.visible = true;
    } else {
      group.position.lerp(targetPosition, 1 - Math.exp(-delta * 8));
    }
    setHeading(group, Math.atan2(tangent.x, tangent.z), {
      smoothHeading,
      headingDamping,
      delta,
    });
    group.rotation.z = THREE.MathUtils.damp(
      group.rotation.z,
      Math.sin((carT + index * 0.17) * Math.PI * 18) * 0.022 * chicaneEnergy,
      7,
      delta,
    );
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, -0.025 - chicaneEnergy * 0.035, 6, delta);
  });
}

export function setVehicleLightsEnabled({ car, companionCars, enabled }) {
  const state = {
    enabled,
    main: setCarLightRigEnabled(car, enabled),
    companions: 0,
    dynamicLights: 0,
  };

  companionCars.forEach(({ group }) => {
    if (setCarLightRigEnabled(group, enabled)) {
      state.companions += 1;
    }
  });

  state.dynamicLights = getActiveVehicleLightCount(car, companionCars);
  return state;
}

function setHeading(object, targetYaw, { smoothHeading, headingDamping, delta }) {
  if (!smoothHeading || !object.userData.hasHeading) {
    object.rotation.y = targetYaw;
    object.userData.hasHeading = true;
    return;
  }

  object.rotation.y = dampAngle(object.rotation.y, targetYaw, headingDamping, delta);
}

function getCurvePointAt(curve, t, target) {
  if (typeof curve.getPointAtInto === 'function') {
    return curve.getPointAtInto(t, target);
  }

  return target.copy(curve.getPointAt(t));
}

function getCurveTangentAt(curve, t, target) {
  if (typeof curve.getTangentAtInto === 'function') {
    return curve.getTangentAtInto(t, target);
  }

  return target.copy(curve.getTangentAt(t)).normalize();
}

function dampAngle(current, target, lambda, delta) {
  const angleDelta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + angleDelta * (1 - Math.exp(-lambda * delta));
}

function prepareLoadedCarModel(model) {
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
}

function createCompanionCars({ scene, companionCars, sourceModel }) {
  if (companionCars.length) {
    return;
  }

  COMPANION_CAR_CONFIGS.forEach((config) => {
    const group = new THREE.Group();
    group.name = config.name;
    group.scale.setScalar(config.scale);
    group.visible = false;

    const model = sourceModel.clone(true);
    tintCompanionCar(model, config);
    group.add(model);
    addCompanionCarKit(group, config);
    addVehicleLightRig(group);

    companionCars.push({ group, config });
    scene.add(group);
  });
}

function tintCompanionCar(model, config) {
  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => cloneTintedCarMaterial(material, config));
    } else if (child.material) {
      child.material = cloneTintedCarMaterial(child.material, config);
    }
  });
}

function cloneTintedCarMaterial(material, config) {
  const clone = material.clone();
  const name = `${material.name ?? ''}`.toLowerCase();
  const color = clone.color;
  const redPaint =
    color && color.r > 0.38 && color.g < 0.24 && color.b < 0.22 && !name.includes('tail') && !name.includes('light');
  const paintMaterial = name.includes('body') || name.includes('paint') || name.includes('rosso') || redPaint;
  const accentMaterial = name.includes('stripe') || name.includes('caliper') || name.includes('rim');

  if (paintMaterial && color) {
    clone.color.setHex(config.color);
    clone.roughness = Math.min(clone.roughness ?? 0.55, 0.5);
    clone.metalness = Math.max(clone.metalness ?? 0.1, 0.12);
  } else if (accentMaterial && color) {
    clone.color.setHex(config.accent);
  }

  clone.envMapIntensity = 0.52;
  clone.needsUpdate = true;
  return clone;
}

function addCompanionCarKit(group, config) {
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: config.accent,
    roughness: 0.42,
    metalness: 0.1,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x121619,
    roughness: 0.7,
    metalness: 0.08,
  });

  if (config.spoiler) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.24), accentMaterial);
    wing.position.set(0, 1.08, -1.82);
    wing.castShadow = true;
    group.add(wing);

    for (const x of [-0.64, 0.64]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), darkMaterial);
      support.position.set(x, 0.82, -1.72);
      support.castShadow = true;
      group.add(support);
    }
  }

  if (config.fin) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.62, 1.35), accentMaterial);
    fin.position.set(0, 1.2, -0.08);
    fin.castShadow = true;
    group.add(fin);

    const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.34), darkMaterial);
    splitter.position.set(0, 0.12, 2.18);
    splitter.castShadow = true;
    group.add(splitter);
  }

  if (config.roofStripe) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 2.28), accentMaterial);
    stripe.position.set(0, 1.08, 0);
    stripe.castShadow = true;
    group.add(stripe);
  }
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

function addVehicleLightRig(group, { dynamicLight = false } = {}) {
  if (group.userData.vehicleLights) {
    return group.userData.vehicleLights;
  }

  const assets = getVehicleLightAssets();
  const root = new THREE.Group();
  root.name = 'vehicle-night-lights';
  root.visible = false;

  for (const x of [-0.58, 0.58]) {
    const frontGlow = new THREE.Sprite(assets.frontGlowMaterial);
    frontGlow.name = 'headlight-glow';
    frontGlow.position.set(x, 0.58, 2.24);
    frontGlow.scale.set(0.52, 0.3, 1);
    root.add(frontGlow);

    const beam = new THREE.Mesh(assets.beamGeometry, assets.beamMaterial);
    beam.name = 'headlight-beam';
    beam.position.set(x, 0.075, 2.22);
    beam.rotation.x = Math.PI / 2;
    beam.renderOrder = 8;
    root.add(beam);

    const rearGlow = new THREE.Sprite(assets.rearGlowMaterial);
    rearGlow.name = 'taillight-glow';
    rearGlow.position.set(x, 0.9, -2.22);
    rearGlow.scale.set(0.76, 0.42, 1);
    root.add(rearGlow);

    const rearLamp = new THREE.Mesh(assets.rearLampGeometry, assets.rearLampMaterial);
    rearLamp.name = 'taillight-bright-core';
    rearLamp.position.set(x, 0.9, -2.31);
    rearLamp.rotation.y = Math.PI;
    rearLamp.renderOrder = 10;
    root.add(rearLamp);
  }

  const dynamicLights = [];

  if (dynamicLight) {
    const target = new THREE.Object3D();
    target.name = 'headlight-target';
    target.position.set(0, 0.12, 12);
    root.add(target);

    const headlight = new THREE.SpotLight(0xfff1c2, 0, 18, Math.PI / 7.5, 0.7, 1.65);
    headlight.name = 'lead-car-headlight';
    headlight.position.set(0, 0.78, 2);
    headlight.castShadow = false;
    headlight.target = target;
    root.add(headlight);
    dynamicLights.push({ light: headlight, intensity: 1.85 });

    const tailLight = new THREE.PointLight(0xff2436, 0, 3.4, 2);
    tailLight.name = 'lead-car-taillight';
    tailLight.position.set(0, 0.58, -2.16);
    tailLight.castShadow = false;
    root.add(tailLight);
    dynamicLights.push({ light: tailLight, intensity: 0.85 });
  }

  group.add(root);
  group.userData.vehicleLights = { root, dynamicLights, enabled: false };
  return group.userData.vehicleLights;
}

function setCarLightRigEnabled(group, enabled) {
  const rig = group?.userData?.vehicleLights;
  if (!rig) {
    return false;
  }

  if (rig.enabled !== enabled) {
    rig.root.visible = enabled;
    rig.dynamicLights.forEach(({ light, intensity }) => {
      light.intensity = enabled ? intensity : 0;
      light.visible = enabled;
    });
    rig.enabled = enabled;
  }

  return rig.root.visible;
}

function getActiveVehicleLightCount(car, companionCars) {
  const groups = [car, ...companionCars.map(({ group }) => group)];
  return groups.reduce((count, group) => {
    const rig = group?.userData?.vehicleLights;
    if (!rig?.enabled) {
      return count;
    }

    return count + rig.dynamicLights.filter(({ light }) => light.visible && light.intensity > 0).length;
  }, 0);
}

function getVehicleLightAssets() {
  if (vehicleLightAssets) {
    return vehicleLightAssets;
  }

  const frontGlowTexture = createRadialGlowTexture({
    inner: 'rgba(255, 244, 199, 0.95)',
    mid: 'rgba(255, 213, 120, 0.42)',
    outer: 'rgba(255, 198, 82, 0)',
  });
  const rearGlowTexture = createRadialGlowTexture({
    inner: 'rgba(255, 42, 58, 0.95)',
    mid: 'rgba(255, 16, 38, 0.5)',
    outer: 'rgba(255, 0, 22, 0)',
  });
  const beamTexture = createHeadlightBeamTexture();

  vehicleLightAssets = {
    frontGlowMaterial: new THREE.SpriteMaterial({
      map: frontGlowTexture,
      color: 0xfff0bd,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    rearGlowMaterial: new THREE.SpriteMaterial({
      map: rearGlowTexture,
      color: 0xff2436,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    rearLampGeometry: new THREE.PlaneGeometry(0.46, 0.16),
    rearLampMaterial: new THREE.MeshBasicMaterial({
      color: 0xff0718,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    beamGeometry: createHeadlightBeamGeometry(),
    beamMaterial: new THREE.MeshBasicMaterial({
      map: beamTexture,
      color: 0xffefbf,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  };

  return vehicleLightAssets;
}

function createRadialGlowTexture({ inner, mid, outer }) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 6, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.38, mid);
  gradient.addColorStop(1, outer);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createHeadlightBeamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;

  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, canvas.height, 0, 0);
  gradient.addColorStop(0, 'rgba(255, 248, 210, 0.38)');
  gradient.addColorStop(0.22, 'rgba(255, 232, 161, 0.24)');
  gradient.addColorStop(0.64, 'rgba(255, 216, 120, 0.09)');
  gradient.addColorStop(1, 'rgba(255, 210, 96, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sideFade = context.createLinearGradient(0, 0, canvas.width, 0);
  sideFade.addColorStop(0, 'rgba(255, 255, 255, 0)');
  sideFade.addColorStop(0.28, 'rgba(255, 255, 255, 0.44)');
  sideFade.addColorStop(0.5, 'rgba(255, 255, 255, 0.86)');
  sideFade.addColorStop(0.72, 'rgba(255, 255, 255, 0.44)');
  sideFade.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = sideFade;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createHeadlightBeamGeometry() {
  const baseWidth = 0.56;
  const farWidth = 2.45;
  const length = 9.4;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        -baseWidth / 2,
        0,
        0,
        baseWidth / 2,
        0,
        0,
        -farWidth / 2,
        length,
        0,
        -farWidth / 2,
        length,
        0,
        baseWidth / 2,
        0,
        0,
        farWidth / 2,
        length,
        0,
      ]),
      3,
    ),
  );
  geometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(
      new Float32Array([0.38, 0, 0.62, 0, 0, 1, 0, 1, 0.62, 0, 1, 1]),
      2,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}
