import * as THREE from 'three';
import { TRACK_HEIGHT } from './constants.js';

export function getTrackFrame(points, index) {
  const current = points[index % points.length];
  const previous = points[(index - 1 + points.length) % points.length];
  const next = points[(index + 1) % points.length];
  const tangent = next.clone().sub(previous).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

  return { point: current, tangent, normal };
}

export function placeAtTrack(trackCurve, object, t, side = 1, lateral = 0, options = {}) {
  const point = trackCurve.getPointAt((t + 1) % 1);
  const tangent = trackCurve.getTangentAt((t + 1) % 1).normalize();
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  const forward = options.forward ?? 0;

  object.position
    .copy(point)
    .add(normal.clone().multiplyScalar(side * lateral))
    .add(tangent.clone().multiplyScalar(forward));
  object.position.y = options.y ?? TRACK_HEIGHT;

  const yaw = Math.atan2(tangent.x, tangent.z);
  if (options.rotationMode === 'side') {
    object.rotation.y = yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
  } else if (options.rotationMode === 'track') {
    object.rotation.y = yaw;
  } else {
    object.rotation.y = yaw + (options.rotationOffset ?? 0);
  }

  return { point, tangent, normal };
}

export function smoothPulse(value, start, width) {
  const enter = THREE.MathUtils.smoothstep(value, start - width, start);
  const exit = 1 - THREE.MathUtils.smoothstep(value, start + width, start + width * 2);
  return Math.max(0, enter * exit);
}
