import * as THREE from 'three';

export function addLighting(scene) {
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

export function addTerrain(scene) {
  const groundGeometry = new THREE.PlaneGeometry(280, 280, 120, 120);
  const positions = groundGeometry.attributes.position;

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const height =
      -0.035 +
      Math.sin(x * 0.045) * 0.014 +
      Math.cos(y * 0.035) * 0.012 +
      Math.sin((x + y) * 0.018) * 0.01;
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
  grid.position.y = -0.055;
  grid.material.opacity = 0.12;
  grid.material.transparent = true;
  scene.add(grid);
}

export function addBackdrop(scene) {
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
