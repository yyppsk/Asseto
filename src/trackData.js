import * as THREE from 'three';

const SCENE_TRACK_EXTENT = 86;
const WIDTH_VISUAL_MULTIPLIER = 12;
const MIN_SIDE_WIDTH = 1.35;
const MAX_SIDE_WIDTH = 3.8;
const CENTERLINE_SAMPLES = 1800;
const RACELINE_SAMPLES = 1800;
const WIDTH_SMOOTH_RADIUS = 24;

const FALLBACK_POINTS = [
  [0, 28],
  [7, 29],
  [13, 24],
  [20, 16],
  [36, 9],
  [40, -2],
  [34, -10],
  [27, -14],
  [17, -18],
  [9, -21],
  [1, -18],
  [-5, -10],
  [-14, -12],
  [-22, -16],
  [-32, -11],
  [-36, -1],
  [-29, 6],
  [-20, 10],
  [-13, 17],
  [-9, 23],
  [-3, 27],
];

export async function loadSpaTrack() {
  try {
    const [trackCsv, racelineCsv] = await Promise.all([
      fetchText('/data/tum-spa-track.csv'),
      fetchText('/data/tum-spa-raceline.csv'),
    ]);
    const centerRows = parseCsvRows(trackCsv, 4);
    const racelineRows = parseCsvRows(racelineCsv, 2);

    if (centerRows.length < 100 || racelineRows.length < 100) {
      throw new Error('TUM Spa CSV did not include enough points.');
    }

    return normalizeTumTrack(centerRows, racelineRows);
  } catch (error) {
    console.warn(error);
    const points = FALLBACK_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z));

    return {
      centerPoints: points,
      drivePoints: points,
      widths: points.map(() => ({ left: 2.2, right: 2.2 })),
      source: 'fallback',
      name: 'Spa Loop',
    };
  }
}

export function makeTrackCurve(points) {
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  curve.arcLengthDivisions = Math.max(2400, points.length * 3);
  return curve;
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Track request failed for ${path}: ${response.status}`);
  }
  return response.text();
}

function parseCsvRows(text, minColumns) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(',').map((value) => Number.parseFloat(value)))
    .filter((values) => values.length >= minColumns && values.every(Number.isFinite));
}

function normalizeTumTrack(centerRows, racelineRows) {
  const centerVectors = centerRows.map(([x, y]) => new THREE.Vector3(x, 0, -y));
  const bounds = new THREE.Box3().setFromPoints(centerVectors);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);

  const positionScale = SCENE_TRACK_EXTENT / Math.max(size.x, size.z);
  const widthScale = positionScale * WIDTH_VISUAL_MULTIPLIER;

  const toScenePoint = ([x, y]) => new THREE.Vector3(x, 0, -y).sub(center).multiplyScalar(positionScale);
  const rawCenterPoints = centerRows.map(toScenePoint);
  const rawDrivePoints = racelineRows.map(toScenePoint);
  const rawWidths = centerRows.map(([, , rightWidth, leftWidth]) => ({
    left: clamp(leftWidth * widthScale, MIN_SIDE_WIDTH, MAX_SIDE_WIDTH),
    right: clamp(rightWidth * widthScale, MIN_SIDE_WIDTH, MAX_SIDE_WIDTH),
  }));
  const smoothedWidths = smoothWidths(rawWidths, WIDTH_SMOOTH_RADIUS);

  return {
    centerPoints: resampleClosedCurve(rawCenterPoints, CENTERLINE_SAMPLES),
    drivePoints: resampleClosedCurve(rawDrivePoints, RACELINE_SAMPLES),
    widths: resampleWidths(smoothedWidths, CENTERLINE_SAMPLES),
    source: 'TUMFTM racetrack-database',
    name: 'Spa-Francorchamps',
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resampleClosedCurve(points, samples) {
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  curve.arcLengthDivisions = samples * 3;

  return Array.from({ length: samples }, (_, index) => curve.getPointAt(index / samples));
}

function smoothWidths(widths, radius) {
  return widths.map((_, index) => {
    let left = 0;
    let right = 0;
    let totalWeight = 0;

    for (let offset = -radius; offset <= radius; offset += 1) {
      const wrappedIndex = (index + offset + widths.length) % widths.length;
      const weight = 1 - Math.abs(offset) / (radius + 1);
      left += widths[wrappedIndex].left * weight;
      right += widths[wrappedIndex].right * weight;
      totalWeight += weight;
    }

    return {
      left: left / totalWeight,
      right: right / totalWeight,
    };
  });
}

function resampleWidths(widths, samples) {
  return Array.from({ length: samples }, (_, index) => {
    const scaledIndex = (index / samples) * widths.length;
    const lowerIndex = Math.floor(scaledIndex) % widths.length;
    const upperIndex = (lowerIndex + 1) % widths.length;
    const blend = scaledIndex - Math.floor(scaledIndex);

    return {
      left: THREE.MathUtils.lerp(widths[lowerIndex].left, widths[upperIndex].left, blend),
      right: THREE.MathUtils.lerp(widths[lowerIndex].right, widths[upperIndex].right, blend),
    };
  });
}
