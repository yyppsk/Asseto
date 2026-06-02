import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const REAL_TRACK_MODELS = {
  "real-model": {
    versionLabel: "Version 2",
    displayName: "Race Track GLB",
    credit: "Real track model loaded from local GLB package.",
    path: "/models/real%20track/source/track.glb",
    candidateUrl:
      "https://sketchfab.com/3d-models/race-track-23mb-glb-1d3a0a5a7f5c48ecbc8ff967ec36e6e5",
    fitSize: 420,
    groundInset: 0.025,
    driveStrategy: "uv-cross-section",
    driveMeshNames: ["road"],
    routePointTarget: 260,
    routeUMin: 0.2,
    routeUMax: 0.8,
    routeBins: 168,
    routeYOffset: 0.04,
    curveType: "polyline",
    routeTangentWindow: 7,
    routeBacktrackTurnDegrees: 135,
    routeBacktrackSegmentMax: 4.8,
    routeBacktrackPasses: 8,
    minRoutePoints: 32,
  },
  "real-model-2": {
    versionLabel: "Version 3",
    displayName: "Nurburgring Test GLB",
    credit: "Nurburgring test model loaded from local GLB package.",
    path: "/models/real%20track%202/nurburgring_race_driver_grid_ds.glb",
    fitSize: 106,
    groundInset: 0.025,
    driveStrategy: "mesh-nearest",
    routeMeshPattern: /markers/i,
    closedRoute: false,
    routeBins: 192,
    routeYOffset: -1.0,
    minRoutePoints: 8,
  },
};

export function getRealTrackConfig(version) {
  return REAL_TRACK_MODELS[version] ?? REAL_TRACK_MODELS["real-model"];
}

export async function loadRealTrackModel({ scene, version }) {
  const config = getRealTrackConfig(version);
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  try {
    const gltf = await loader.loadAsync(config.path);
    const model = gltf.scene;
    model.name = `${version}-model`;
    prepareRealTrack(model);
    fitRealTrack(model, config);
    model.updateMatrixWorld(true);
    const route = createDriveRoute(model, config);
    scene.add(model);
    return { loaded: true, model, config, ...route };
  } catch (error) {
    console.info(`Real track model not loaded from ${config.path}.`, error);
    addRealTrackPlaceholder(scene);
    return {
      loaded: false,
      model: null,
      config,
      driveCurve: null,
      routeMethod: "missing",
    };
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
      child.material = cloneTrackMaterial(child.material);
    }
  });
}

function cloneTrackMaterial(material) {
  if (Array.isArray(material)) {
    return material.map((entry) => cloneTrackMaterial(entry));
  }

  const clone = material.clone();
  clone.roughness = Math.max(clone.roughness ?? 0.62, 0.58);
  clone.envMapIntensity = 0.52;
  clone.side = THREE.DoubleSide;
  clone.needsUpdate = true;
  return clone;
}

function fitRealTrack(model, config) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  model.position.sub(center);
  const scale = config.fitSize / Math.max(size.x, size.z, 1);
  model.scale.setScalar(scale);

  const fittedBox = new THREE.Box3().setFromObject(model);
  model.position.y -= fittedBox.min.y + config.groundInset;
}

function createDriveRoute(model, config) {
  const driveMeshes = collectDriveMeshes(model, config);
  const surfaceSampler = createRoadSurfaceSampler(driveMeshes, config);
  let points = [];
  let routeMethod = "model-footprint";

  if (config.driveStrategy === "mesh-sequence") {
    points = createSequenceRoutePoints(driveMeshes, config);
    routeMethod = "track-mesh sequence";
  }

  if (config.driveStrategy === "mesh-nearest") {
    points = createNearestMeshRoutePoints(driveMeshes, config);
    routeMethod = "marker-mesh route";
  }

  if (config.driveStrategy === "vertex-sequence") {
    points = createVertexSequenceRoutePoints(driveMeshes, config);
    routeMethod = "road-vertex sequence";
  }

  if (config.driveStrategy === "uv-centerline") {
    points = createUvCenterlineRoutePoints(driveMeshes, config);
    routeMethod = "road UV centerline";
  }

  if (config.driveStrategy === "uv-cross-section") {
    points = createUvCrossSectionRoutePoints(driveMeshes, config);
    routeMethod = "road UV cross-section";
  }

  if (points.length < config.minRoutePoints) {
    const vertices = collectDriveVertices(driveMeshes);
    points = createFootprintRoutePoints(vertices, config);
    routeMethod = "road-mesh footprint";
  }

  if (points.length < config.minRoutePoints) {
    points = createFallbackRoutePoints(model, config);
    routeMethod = "model bounds fallback";
  }

  points = projectRoutePointsToSurface(points, surfaceSampler, config);
  points = removeRouteBacktracks(points, config);
  const driveCurve = createDriveCurve(points, config);
  return {
    driveCurve,
    routeMethod,
    routePointCount: points.length,
    getSurfaceY: surfaceSampler.getSurfaceY,
  };
}

function createRoadSurfaceSampler(meshes, config) {
  const surfaceMeshes = meshes.filter((mesh) => mesh.geometry?.attributes?.position);

  if (!surfaceMeshes.length) {
    return {
      getRoadY: () => null,
      getSurfaceY: (_t, point) => point.y,
    };
  }

  const surfaceBox = new THREE.Box3();
  const meshBox = new THREE.Box3();
  const surfaceVertices = [];
  const vertex = new THREE.Vector3();

  for (const mesh of surfaceMeshes) {
    surfaceBox.union(meshBox.setFromObject(mesh));

    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      surfaceVertices.push(vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).clone());
    }
  }

  const raycaster = new THREE.Raycaster();
  const rayOrigin = new THREE.Vector3();
  const rayDirection = new THREE.Vector3(0, -1, 0);
  const rayStartY = surfaceBox.max.y + 80;
  const rayFar = Math.max(140, surfaceBox.max.y - surfaceBox.min.y + 120);
  const fallbackRadius = config.surfaceFallbackRadius ?? 14;

  function getRoadY(point, referenceY = point.y) {
    rayOrigin.set(point.x, rayStartY, point.z);
    raycaster.set(rayOrigin, rayDirection);
    raycaster.far = rayFar;

    const hits = raycaster.intersectObjects(surfaceMeshes, false);
    if (hits.length) {
      return hits.reduce((best, hit) =>
        Math.abs(hit.point.y - referenceY) < Math.abs(best.point.y - referenceY) ? hit : best,
      ).point.y;
    }

    return getNearestSurfaceVertexY(point, surfaceVertices, fallbackRadius);
  }

  return {
    getRoadY,
    getSurfaceY: (_t, point) => getRoadY(point, point.y) ?? point.y,
  };
}

function getNearestSurfaceVertexY(point, vertices, maxDistance) {
  let bestDistance = maxDistance * maxDistance;
  let bestY = null;

  for (const vertex of vertices) {
    const distance = (point.x - vertex.x) ** 2 + (point.z - vertex.z) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestY = vertex.y;
    }
  }

  return bestY;
}

function projectRoutePointsToSurface(points, surfaceSampler, config) {
  return points.map((point) => {
    const roadY = surfaceSampler.getRoadY(point, point.y);
    return roadY === null ? point : point.clone().setY(roadY + config.routeYOffset);
  });
}

function removeRouteBacktracks(points, config) {
  let route = [...points];
  const maxTurn = THREE.MathUtils.degToRad(config.routeBacktrackTurnDegrees ?? 135);
  const maxSegment = config.routeBacktrackSegmentMax ?? 4.8;
  const passes = config.routeBacktrackPasses ?? 6;

  for (let pass = 0; pass < passes; pass += 1) {
    const removals = new Set();

    for (let index = 0; index < route.length; index += 1) {
      const previous = route[(index - 1 + route.length) % route.length];
      const current = route[index];
      const next = route[(index + 1) % route.length];
      const incoming = current.clone().sub(previous).setY(0);
      const outgoing = next.clone().sub(current).setY(0);
      const incomingLength = incoming.length();
      const outgoingLength = outgoing.length();

      if (incomingLength < 0.001 || outgoingLength < 0.001) {
        removals.add(index);
        continue;
      }

      incoming.multiplyScalar(1 / incomingLength);
      outgoing.multiplyScalar(1 / outgoingLength);

      const turnAngle = Math.acos(
        THREE.MathUtils.clamp(incoming.dot(outgoing), -1, 1),
      );
      const shortcutDistance = previous.distanceTo(next);
      const detourDistance = previous.distanceTo(current) + current.distanceTo(next);
      const isShortBacktrack =
        turnAngle > maxTurn &&
        Math.min(incomingLength, outgoingLength) <= maxSegment &&
        shortcutDistance < detourDistance * 0.9;

      if (isShortBacktrack) {
        removals.add(index);
      }
    }

    if (!removals.size) {
      break;
    }

    route = route.filter((_, index) => !removals.has(index));
  }

  return route;
}

function collectDriveMeshes(model, config) {
  const exactNames = new Set(
    (config.driveMeshNames ?? []).map((name) => name.toLowerCase()),
  );
  const primary = [];
  const fallback = [];

  model.traverse((child) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) {
      return;
    }

    const name = child.name ?? "";
    const materialName = getMaterialName(child);
    const lowerName = name.toLowerCase();
    const exactMatch = exactNames.has(lowerName);
    const routePatternMatch = config.routeMeshPattern?.test(name) ?? false;
    const likelyRoad = /(road|asphalt|track)/i.test(`${name} ${materialName}`);
    const decoration =
      /(wall|wal|fence|shadow|bui|spon|building|marker|light|pole|tree|field|outfld)/i.test(
        name,
      );

    if (exactMatch || routePatternMatch) {
      primary.push(child);
    } else if (likelyRoad && !decoration) {
      fallback.push(child);
    }
  });

  return primary.length ? primary : fallback;
}

function createSequenceRoutePoints(meshes, config) {
  const keyedMeshes = new Map();

  for (const mesh of meshes) {
    const key = getSequenceKey(mesh.name, config);
    if (key === null) {
      continue;
    }

    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    const score =
      (mesh.geometry.attributes.position.count ?? 0) + size.x * size.z;
    const existing = keyedMeshes.get(key);
    if (!existing || score > existing.score) {
      keyedMeshes.set(key, { key, mesh, score });
    }
  }

  const sorted = [...keyedMeshes.values()].sort((a, b) => a.key - b.key);
  const points = sorted.flatMap(({ mesh }) =>
    sampleMeshSequence(mesh, config, 5),
  );
  return smoothRoute(removeClosePoints(points, 0.38), 1);
}

function createNearestMeshRoutePoints(meshes, config) {
  const centers = meshes
    .map((mesh) => {
      const box = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      box.getCenter(center);
      center.y += config.routeYOffset;
      return center;
    })
    .filter(
      (point) =>
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        Number.isFinite(point.z),
    );

  if (centers.length < 2) {
    return centers;
  }

  const unused = [...centers];
  const route = [unused.splice(findStartPointIndex(unused), 1)[0]];

  while (unused.length) {
    const previous = route.at(-1);
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let index = 0; index < unused.length; index += 1) {
      const distance = previous.distanceToSquared(unused[index]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    route.push(unused.splice(nearestIndex, 1)[0]);
  }

  return smoothRoute(removeClosePoints(route, 0.28), 1);
}

function createUvCenterlineRoutePoints(meshes, config) {
  const routePoints = [];
  const centerU = config.centerU ?? 0.5;
  const tolerance = config.centerUTolerance ?? 0.04;

  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position;
    const uv = mesh.geometry.attributes.uv;

    if (!uv) {
      continue;
    }

    const samples = [];
    for (let i = 0; i < position.count; i += 1) {
      const u = uv.getX(i);
      if (Math.abs(u - centerU) > tolerance) {
        continue;
      }

      samples.push({
        longitudinal: uv.getY(i),
        point: new THREE.Vector3()
          .fromBufferAttribute(position, i)
          .applyMatrix4(mesh.matrixWorld),
      });
    }

    if (samples.length < config.minRoutePoints) {
      continue;
    }

    samples.sort((a, b) => a.longitudinal - b.longitudinal);
    const target = config.routePointTarget ?? 240;
    const windowSize = Math.max(4, Math.floor(samples.length / target));

    for (let i = 0; i < samples.length; i += windowSize) {
      const window = samples.slice(i, i + windowSize);
      const point = window
        .reduce((sum, sample) => sum.add(sample.point), new THREE.Vector3())
        .multiplyScalar(1 / window.length)
        .add(new THREE.Vector3(0, config.routeYOffset, 0));

      routePoints.push(point);
    }
  }

  return smoothRoute(
    removeClosePoints(routePoints, config.routeMinDistance ?? 0.34),
    config.routeSmoothingPasses ?? 2,
  );
}

function createUvCrossSectionRoutePoints(meshes, config) {
  const routePoints = [];
  const minU = config.routeUMin ?? 0;
  const maxU = config.routeUMax ?? 1;

  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position;
    const uv = mesh.geometry.attributes.uv;

    if (!uv) {
      continue;
    }

    const samples = [];
    for (let i = 0; i < position.count; i += 1) {
      const u = uv.getX(i);
      if (u < minU || u > maxU) {
        continue;
      }

      samples.push({
        longitudinal: uv.getY(i),
        point: new THREE.Vector3()
          .fromBufferAttribute(position, i)
          .applyMatrix4(mesh.matrixWorld),
      });
    }

    if (samples.length < config.minRoutePoints) {
      continue;
    }

    samples.sort((a, b) => a.longitudinal - b.longitudinal);
    const target = config.routePointTarget ?? 240;
    const windowSize = Math.max(8, Math.floor(samples.length / target));

    for (let i = 0; i < samples.length; i += windowSize) {
      const window = samples.slice(i, i + windowSize);
      const point = window
        .reduce((sum, sample) => sum.add(sample.point), new THREE.Vector3())
        .multiplyScalar(1 / window.length)
        .add(new THREE.Vector3(0, config.routeYOffset, 0));

      routePoints.push(point);
    }
  }

  return smoothRoute(
    removeClosePoints(routePoints, config.routeMinDistance ?? 0.34),
    config.routeSmoothingPasses ?? 2,
  );
}

function findStartPointIndex(points) {
  let bestIndex = 0;
  let bestScore = -Infinity;

  points.forEach((point, index) => {
    const score = point.x - point.z * 0.25;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function getSequenceKey(name, config) {
  const match = config.sequenceKeyPattern
    ? name.match(config.sequenceKeyPattern)
    : name.match(/Track(\d+)/i);
  return match ? Number(match[1]) : null;
}

function createVertexSequenceRoutePoints(meshes, config) {
  const points = [];

  for (const mesh of meshes) {
    points.push(
      ...sampleMeshSequence(mesh, config, config.routePointTarget ?? 180),
    );
  }

  return smoothRoute(removeClosePoints(points, 0.45), 2);
}

function sampleMeshSequence(mesh, config, pointTarget) {
  const position = mesh.geometry.attributes.position;
  const windowSize = Math.max(8, Math.floor(position.count / pointTarget));
  const points = [];
  let sum = new THREE.Vector3();
  let count = 0;

  for (let i = 0; i < position.count; i += 1) {
    const vertex = new THREE.Vector3()
      .fromBufferAttribute(position, i)
      .applyMatrix4(mesh.matrixWorld);
    sum.add(vertex);
    count += 1;

    if (count >= windowSize) {
      points.push(
        sum
          .multiplyScalar(1 / count)
          .add(new THREE.Vector3(0, config.routeYOffset, 0)),
      );
      sum = new THREE.Vector3();
      count = 0;
    }
  }

  if (count > 0) {
    points.push(
      sum
        .multiplyScalar(1 / count)
        .add(new THREE.Vector3(0, config.routeYOffset, 0)),
    );
  }

  return points;
}

function collectDriveVertices(meshes) {
  const vertices = [];
  const vertex = new THREE.Vector3();

  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position;
    const stride = Math.max(1, Math.ceil(position.count / 14000));

    for (let i = 0; i < position.count; i += stride) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      if (
        Number.isFinite(vertex.x) &&
        Number.isFinite(vertex.y) &&
        Number.isFinite(vertex.z)
      ) {
        vertices.push(vertex.clone());
      }
    }
  }

  return vertices;
}

function createFootprintRoutePoints(vertices, config) {
  if (!vertices.length) {
    return [];
  }

  const center = vertices
    .reduce((sum, point) => sum.add(point), new THREE.Vector3())
    .multiplyScalar(1 / vertices.length);
  const bins = Array.from({ length: config.routeBins }, () => ({
    x: 0,
    y: 0,
    z: 0,
    count: 0,
  }));

  for (const point of vertices) {
    const angle = Math.atan2(point.z - center.z, point.x - center.x);
    const index =
      Math.floor(((angle + Math.PI) / (Math.PI * 2)) * config.routeBins) %
      config.routeBins;
    const bin = bins[index];
    bin.x += point.x;
    bin.y += point.y;
    bin.z += point.z;
    bin.count += 1;
  }

  const points = bins
    .filter((bin) => bin.count >= 2)
    .map(
      (bin) =>
        new THREE.Vector3(
          bin.x / bin.count,
          bin.y / bin.count + config.routeYOffset,
          bin.z / bin.count,
        ),
    );

  return smoothRoute(removeClosePoints(points, 0.32), 2);
}

function createFallbackRoutePoints(model, config) {
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  return Array.from({ length: 96 }, (_, index) => {
    const angle = (index / 96) * Math.PI * 2;
    return new THREE.Vector3(
      center.x + Math.cos(angle) * size.x * 0.34,
      box.min.y + config.routeYOffset,
      center.z + Math.sin(angle) * size.z * 0.34,
    );
  });
}

function smoothRoute(points, passes) {
  let route = points;

  for (let pass = 0; pass < passes; pass += 1) {
    route = route.map((point, index) => {
      const previous = route[(index - 1 + route.length) % route.length];
      const next = route[(index + 1) % route.length];
      return previous
        .clone()
        .multiplyScalar(0.2)
        .add(point.clone().multiplyScalar(0.6))
        .add(next.clone().multiplyScalar(0.2));
    });
  }

  return route;
}

function removeClosePoints(points, minDistance) {
  const filtered = [];

  for (const point of points) {
    const previous = filtered.at(-1);
    if (!previous || previous.distanceTo(point) >= minDistance) {
      filtered.push(point);
    }
  }

  if (
    filtered.length > 2 &&
    filtered[0].distanceTo(filtered.at(-1)) < minDistance
  ) {
    filtered.pop();
  }

  return filtered;
}

function createDriveCurve(points, config) {
  if (config.curveType === "polyline") {
    return createPolylineDriveCurve(points, config.closedRoute !== false, config);
  }

  const curve = new THREE.CatmullRomCurve3(
    points,
    config.closedRoute !== false,
    "centripetal",
  );
  curve.arcLengthDivisions = Math.max(1800, points.length * 80);
  return curve;
}

function createPolylineDriveCurve(points, closed, config) {
  const route = points.map((point) => point.clone());
  const segments = [];
  let totalLength = 0;

  for (let i = 0; i < route.length - 1; i += 1) {
    totalLength += addPolylineSegment(segments, route[i], route[i + 1], totalLength);
  }

  if (closed && route.length > 2) {
    totalLength += addPolylineSegment(segments, route.at(-1), route[0], totalLength);
  }

  function getSegmentAt(t) {
    if (!segments.length) {
      return null;
    }

    const normalized = closed ? THREE.MathUtils.euclideanModulo(t, 1) : THREE.MathUtils.clamp(t, 0, 1);
    const distance = normalized * totalLength;

    for (const segment of segments) {
      if (distance <= segment.end) {
        return { segment, distance };
      }
    }

    return { segment: segments.at(-1), distance: totalLength };
  }

  function getPointAtNormalizedT(t) {
    const result = getSegmentAt(t);
    if (!result) {
      return route[0]?.clone() ?? new THREE.Vector3();
    }

    const { segment, distance } = result;
    const ratio = segment.length === 0 ? 0 : (distance - segment.start) / segment.length;
    return segment.from.clone().lerp(segment.to, THREE.MathUtils.clamp(ratio, 0, 1));
  }

  return {
    arcLengthDivisions: Math.max(1800, route.length * 80),
    getPoint: getPointAtNormalizedT,
    getPointAt(t) {
      return this.getPoint(t);
    },
    getTangent: (t) => {
      if (!segments.length || totalLength <= 0) {
        return new THREE.Vector3(0, 0, 1);
      }

      const tangentWindow = (config.routeTangentWindow ?? 7) / totalLength;
      const before = getPointAtNormalizedT(t - tangentWindow);
      const after = getPointAtNormalizedT(t + tangentWindow);
      return after.sub(before).normalize();
    },
    getTangentAt(t) {
      return this.getTangent(t);
    },
  };
}

function addPolylineSegment(segments, from, to, start) {
  const length = from.distanceTo(to);
  if (length <= 0.0001) {
    return 0;
  }

  segments.push({
    from,
    to,
    length,
    start,
    end: start + length,
  });

  return length;
}

function getMaterialName(mesh) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  return materials.map((material) => material?.name ?? "").join(" ");
}

function addRealTrackPlaceholder(scene) {
  const group = new THREE.Group();
  group.name = "real-track-model-placeholder";

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.08, 8),
    new THREE.MeshStandardMaterial({
      color: 0x26313a,
      roughness: 0.82,
      metalness: 0.04,
      transparent: true,
      opacity: 0.7,
    }),
  );
  platform.position.set(0, 0.02, -30);
  platform.receiveShadow = true;
  group.add(platform);

  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffce56,
    transparent: true,
    opacity: 0.72,
  });
  for (let i = 0; i < 5; i += 1) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 0.08, 0.24),
      markerMaterial,
    );
    marker.position.set(-10 + i * 5, 0.12, -30);
    group.add(marker);
  }

  scene.add(group);
}
