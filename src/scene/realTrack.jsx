import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const REAL_TRACK_MODEL = {
  path: '/models/real%20track/source/track.glb',
  candidateUrl: 'https://sketchfab.com/3d-models/race-track-23mb-glb-1d3a0a5a7f5c48ecbc8ff967ec36e6e5',
};

export async function loadRealTrackModel({ scene }) {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  try {
    const gltf = await loader.loadAsync(REAL_TRACK_MODEL.path);
    const model = gltf.scene;
    model.name = 'real-track-model';
    prepareRealTrack(model);
    fitRealTrack(model);
    scene.add(model);
    return { loaded: true, model };
  } catch (error) {
    console.info(`Real track model not loaded from ${REAL_TRACK_MODEL.path}.`, error);
    addRealTrackPlaceholder(scene);
    return { loaded: false, model: null };
  }
}

function prepareRealTrack(model) {
  model.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    if (child.material) {
      child.material = child.material.clone();
      child.material.roughness = Math.max(child.material.roughness ?? 0.62, 0.58);
      child.material.envMapIntensity = 0.52;
      child.material.needsUpdate = true;
    }
  });
}

function fitRealTrack(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  model.position.sub(center);
  const scale = 68 / Math.max(size.x, size.z, 1);
  model.scale.setScalar(scale);

  const fittedBox = new THREE.Box3().setFromObject(model);
  model.position.y -= fittedBox.min.y + 0.035;
}

function addRealTrackPlaceholder(scene) {
  const group = new THREE.Group();
  group.name = 'real-track-model-placeholder';

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.08, 8),
    new THREE.MeshStandardMaterial({ color: 0x26313a, roughness: 0.82, metalness: 0.04, transparent: true, opacity: 0.7 }),
  );
  platform.position.set(0, 0.02, -30);
  platform.receiveShadow = true;
  group.add(platform);

  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffce56, transparent: true, opacity: 0.72 });
  for (let i = 0; i < 5; i += 1) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.24), markerMaterial);
    marker.position.set(-10 + i * 5, 0.12, -30);
    group.add(marker);
  }

  scene.add(group);
}
