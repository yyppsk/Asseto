import * as THREE from 'three';
import { ROAD_COLUMNS, TRACK_HEIGHT } from './constants.js';
import { getTrackFrame } from './trackFrame.js';

export function buildTrack({ scene, track, trackCurve, curbs, variant = 'procedural' }) {
  const highDetail = variant === 'procedural';
  const trackGroup = new THREE.Group();
  trackGroup.name = highDetail ? 'procedural-premium-track' : 'model-reference-track';
  scene.add(trackGroup);

  const roadGeometry = createRoadGeometry(track.centerPoints, track.widths, { highDetail });
  const roadMaterial = createAsphaltMaterial();
  if (!highDetail) {
    roadMaterial.transparent = true;
    roadMaterial.opacity = 0.36;
  }
  const trackRibbon = new THREE.Mesh(roadGeometry, roadMaterial);
  trackRibbon.receiveShadow = true;
  trackRibbon.castShadow = true;
  trackGroup.add(trackRibbon);

  const racingLineCurve = highDetail ? createElevatedTrackCurve(trackCurve) : trackCurve;
  const racingLineGeometry = new THREE.TubeGeometry(
    racingLineCurve,
    highDetail ? 1400 : 900,
    highDetail ? 0.105 : 0.08,
    8,
    true,
  );
  const racingLine = new THREE.Mesh(
    racingLineGeometry,
    new THREE.MeshBasicMaterial({ color: 0x080808, transparent: true, opacity: highDetail ? 0.42 : 0.32 }),
  );
  if (!highDetail) {
    racingLine.position.y = TRACK_HEIGHT + 0.115;
  }
  trackGroup.add(racingLine);

  if (highDetail) {
    addTireMarks(trackGroup, trackCurve);
    addPaintedKerbs(trackGroup, track.centerPoints, track.widths);
  }

  const barrierMaterial = new THREE.MeshStandardMaterial({
    color: 0xcfd4cc,
    roughness: 0.78,
    metalness: 0.12,
  });

  for (const side of ['left', 'right']) {
    const railCurve = createBoundaryCurve(track.centerPoints, track.widths, side, 0.34, { highDetail });
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 1200, 0.09, 8, true), barrierMaterial);
    rail.castShadow = true;
    trackGroup.add(rail);
  }

  const curbMaterial = createCurbMaterial();
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
    curb.position.y = TRACK_HEIGHT + (highDetail ? getSpaElevation(t) : 0) + 0.075;
    curb.rotation.y = Math.atan2(tangent.x, tangent.z);
    curb.castShadow = true;
    curbs.push(curb);
    trackGroup.add(curb);
  }

  return { trackRibbon, trackGroup };
}

function createRoadGeometry(points, widths, { highDetail }) {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const columns = highDetail ? ROAD_COLUMNS : 9;

  for (let i = 0; i <= points.length; i += 1) {
    const index = i % points.length;
    const t = i / points.length;
    const { point, tangent, normal } = getTrackFrame(points, index);
    const width = widths[index] ?? { left: 2.2, right: 2.2 };
    const elevation = highDetail ? getSpaElevation(t) : 0;
    const banking = highDetail ? getSpaBanking(t) : 0;
    const shoulder = highDetail ? 3.4 : 0;
    const leftWidth = width.left + shoulder;
    const rightWidth = width.right + shoulder;
    const totalWidth = leftWidth + rightWidth;
    const laneTotalWidth = width.left + width.right;
    const binormal = new THREE.Vector3(0, 1, 0);

    for (let column = 0; column < columns; column += 1) {
      const u = column / (columns - 1);
      const offset = leftWidth - totalWidth * u;
      const roadU = THREE.MathUtils.clamp((width.left - offset) / laneTotalWidth, 0, 1);
      const shoulderDistance = Math.max(0, Math.abs(offset) - laneTotalWidth * 0.5);
      const crown = Math.sin(Math.PI * roadU) * 0.05;
      const edgeDrop = (Math.abs(roadU - 0.5) * 2) ** 2 * -0.022;
      const elevationFalloff = shoulderDistance > 0 ? Math.max(0, elevation) * Math.min(1, shoulderDistance / shoulder) : 0;
      const shoulderDrop = shoulderDistance > 0 ? -0.06 - shoulderDistance * 0.025 - elevationFalloff : 0;
      const bankHeight = offset * banking;
      const vertex = point.clone().add(normal.clone().multiplyScalar(offset));
      vertex.y = TRACK_HEIGHT + elevation + crown + edgeDrop + shoulderDrop + bankHeight;

      vertices.push(vertex.x, vertex.y, vertex.z);
      const normalVector = binormal.clone().sub(normal.clone().multiplyScalar(banking)).normalize();
      normalVector.add(tangent.clone().multiplyScalar(getElevationSlope(t) * -0.35)).normalize();
      normals.push(normalVector.x, normalVector.y, normalVector.z);
      uvs.push(u * 3, t * 34);
    }

    if (i < points.length) {
      const rowStart = i * columns;
      const nextRowStart = (i + 1) * columns;

      for (let column = 0; column < columns - 1; column += 1) {
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

function createElevatedTrackCurve(trackCurve) {
  const samples = Array.from({ length: 1200 }, (_, index) => {
    const t = index / 1200;
    const point = trackCurve.getPointAt(t);
    point.y = TRACK_HEIGHT + getSpaElevation(t) + 0.135;
    return point;
  });
  const curve = new THREE.CatmullRomCurve3(samples, true, 'centripetal');
  curve.arcLengthDivisions = 2400;
  return curve;
}

function addTireMarks(scene, trackCurve) {
  const markMaterial = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.26, depthWrite: false });
  const markGeometry = new THREE.PlaneGeometry(0.22, 1.85);

  for (let i = 0; i < 170; i += 1) {
    const t = (i / 170 + 0.006 * Math.sin(i * 1.7)) % 1;
    const point = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const mark = new THREE.Mesh(markGeometry, markMaterial);
    const lane = i % 2 === 0 ? -0.58 : 0.58;
    mark.position.copy(point).add(normal.multiplyScalar(lane + Math.sin(i) * 0.12));
    mark.position.y = TRACK_HEIGHT + getSpaElevation(t) + 0.13;
    mark.rotation.x = -Math.PI / 2;
    mark.rotation.z = -Math.atan2(tangent.x, tangent.z);
    mark.scale.setScalar(0.75 + Math.random() * 0.55);
    mark.renderOrder = 2;
    scene.add(mark);
  }
}

function addPaintedKerbs(scene, points, widths) {
  const white = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.72, metalness: 0.02 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd41f3d, roughness: 0.62, metalness: 0.02 });
  const geometry = new THREE.BoxGeometry(0.55, 0.045, 0.22);

  for (let i = 0; i < 156; i += 1) {
    const index = Math.floor((i / 156) * points.length);
    const t = index / points.length;
    if ((t > 0.18 && t < 0.46) || (t > 0.74 && t < 0.84)) {
      continue;
    }

    const { point, tangent, normal } = getTrackFrame(points, index);
    const side = i % 2 === 0 ? 'left' : 'right';
    const direction = side === 'left' ? 1 : -1;
    const sideWidth = widths[index]?.[side] ?? 2.2;
    const tile = new THREE.Mesh(geometry, i % 4 < 2 ? red : white);
    tile.position.copy(point).add(normal.multiplyScalar(direction * (sideWidth + 0.18)));
    tile.position.y = TRACK_HEIGHT + getSpaElevation(t) + 0.105;
    tile.rotation.y = Math.atan2(tangent.x, tangent.z);
    tile.castShadow = true;
    scene.add(tile);
  }
}

function createAsphaltMaterial() {
  const asphaltTexture = createAsphaltTexture();
  const normalMap = createAsphaltNormalTexture();

  asphaltTexture.wrapS = THREE.RepeatWrapping;
  asphaltTexture.wrapT = THREE.RepeatWrapping;
  asphaltTexture.repeat.set(4, 36);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.copy(asphaltTexture.repeat);

  return new THREE.MeshStandardMaterial({
    map: asphaltTexture,
    normalMap,
    normalScale: new THREE.Vector2(0.18, 0.36),
    roughness: 0.88,
    metalness: 0.015,
    side: THREE.DoubleSide,
  });
}

function createCurbMaterial() {
  const texture = document.createElement('canvas');
  texture.width = 128;
  texture.height = 32;
  const context = texture.getContext('2d');
  for (let i = 0; i < 8; i += 1) {
    context.fillStyle = i % 2 === 0 ? '#d41f3d' : '#f2efe6';
    context.fillRect(i * 16, 0, 16, 32);
  }

  const map = new THREE.CanvasTexture(texture);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1.2, 1);

  return new THREE.MeshStandardMaterial({
    map,
    roughness: 0.58,
    metalness: 0.02,
  });
}

function createAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.fillStyle = '#17191a';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 9000; i += 1) {
    const shade = 18 + Math.random() * 48;
    context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.18 + Math.random() * 0.18})`;
    context.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  context.globalAlpha = 0.22;
  for (let y = 0; y < 512; y += 24) {
    context.fillStyle = '#0a0b0b';
    context.fillRect(0, y + Math.random() * 7, 512, 1);
  }
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createAsphaltNormalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#8080ff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 2600; i += 1) {
    const value = 112 + Math.random() * 32;
    context.fillStyle = `rgb(${value}, ${value}, 255)`;
    context.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }

  return new THREE.CanvasTexture(canvas);
}

export function getSpaElevation(t) {
  const raidillon = smoothBump(t, 0.055, 0.18, 1.85);
  const kemmel = smoothBump(t, 0.14, 0.34, 1.18);
  const downhill = smoothBump(t, 0.42, 0.58, -0.72);
  const blanchimont = smoothBump(t, 0.72, 0.88, 0.42);
  const finish = smoothBump(t, 0.9, 1.0, -0.28) + smoothBump(t, 0, 0.035, -0.28);
  return raidillon + kemmel + downhill + blanchimont + finish;
}

export function getElevationSlope(t) {
  const delta = 0.0015;
  return (getSpaElevation((t + delta) % 1) - getSpaElevation((t - delta + 1) % 1)) / (delta * 2);
}

export function getSpaBanking(t) {
  return (
    smoothBump(t, 0.065, 0.125, -0.038) +
    smoothBump(t, 0.36, 0.49, 0.028) +
    smoothBump(t, 0.58, 0.68, -0.035) +
    smoothBump(t, 0.78, 0.92, 0.026)
  );
}

function smoothBump(t, start, end, amount) {
  const span = end - start;
  if (span <= 0) {
    return 0;
  }

  const local = THREE.MathUtils.clamp((t - start) / span, 0, 1);
  return Math.sin(local * Math.PI) * amount;
}

function createBoundaryCurve(points, widths, side, margin = 0, { highDetail }) {
  const boundaryPoints = points.map((point, index) => {
    const { normal } = getTrackFrame(points, index);
    const width = widths[index]?.[side] ?? 2.2;
    const direction = side === 'left' ? 1 : -1;
    const boundaryPoint = point.clone().add(normal.multiplyScalar(direction * (width + margin)));
    boundaryPoint.y = TRACK_HEIGHT + (highDetail ? getSpaElevation(index / points.length) : 0) + 0.08;
    return boundaryPoint;
  });

  const curve = new THREE.CatmullRomCurve3(boundaryPoints, true, 'centripetal');
  curve.arcLengthDivisions = Math.max(2400, boundaryPoints.length * 2);
  return curve;
}
