import * as THREE from 'three';

const RAIN_DROP_COUNT = 560;
const SNOW_FLAKE_COUNT = 430;
const WEATHER_RADIUS = 78;
const WEATHER_HEIGHT = 42;

export function createWeatherSystem({ scene }) {
  const rain = createRainSystem();
  const snow = createSnowSystem();
  const lightning = createLightningSystem();

  scene.add(rain.lines, snow.points, lightning.flashLight, lightning.skyLight);

  return { rain, snow, lightning, mode: 'clear', windEnabled: false };
}

export function updateWeatherSystem({ weather, mode, windEnabled, delta, camera }) {
  if (!weather || !camera) {
    return;
  }

  weather.mode = mode;
  weather.windEnabled = windEnabled;
  weather.rain.lines.visible = mode === 'rain';
  weather.snow.points.visible = mode === 'snow';

  if (mode === 'rain') {
    updateRain(weather.rain, delta, camera, windEnabled);
  }

  if (mode === 'snow') {
    updateSnow(weather.snow, delta, camera, windEnabled);
  }

  updateLightning(weather.lightning, delta, camera, mode);
}

function createRainSystem() {
  const positions = new Float32Array(RAIN_DROP_COUNT * 2 * 3);
  const drops = [];

  for (let i = 0; i < RAIN_DROP_COUNT; i += 1) {
    drops.push({
      x: randomSpread(WEATHER_RADIUS),
      y: Math.random() * WEATHER_HEIGHT,
      z: randomSpread(WEATHER_RADIUS),
      speed: 34 + Math.random() * 18,
      length: 2.2 + Math.random() * 2.3,
      drift: -0.3 + Math.random() * 0.6,
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0x9fc9ff,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'weather-rain';
  lines.frustumCulled = false;
  lines.visible = false;

  return { lines, drops, positions };
}

function createSnowSystem() {
  const positions = new Float32Array(SNOW_FLAKE_COUNT * 3);
  const flakes = [];

  for (let i = 0; i < SNOW_FLAKE_COUNT; i += 1) {
    flakes.push({
      x: randomSpread(WEATHER_RADIUS),
      y: Math.random() * WEATHER_HEIGHT,
      z: randomSpread(WEATHER_RADIUS),
      speed: 3.8 + Math.random() * 3.6,
      drift: Math.random() * Math.PI * 2,
      size: 0.55 + Math.random() * 0.5,
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xf4f8ff,
    transparent: true,
    opacity: 0.82,
    size: 0.72,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'weather-snow';
  points.frustumCulled = false;
  points.visible = false;

  return { points, flakes, positions, time: 0 };
}

function createLightningSystem() {
  const flashLight = new THREE.DirectionalLight(0xdfeaff, 0);
  flashLight.name = 'weather-lightning-flash';
  flashLight.position.set(20, 56, -18);

  const skyLight = new THREE.PointLight(0xc7dcff, 0, 220, 1.4);
  skyLight.name = 'weather-lightning-sky';
  skyLight.position.set(0, 42, 0);

  return {
    flashLight,
    skyLight,
    timer: randomLightningDelay(),
    duration: 0,
    remaining: 0,
    intensity: 0,
    strikeCount: 0,
  };
}

function updateRain(rain, delta, camera, windEnabled) {
  const windX = windEnabled ? -11 : -2.2;
  const windZ = windEnabled ? 3.6 : 0.8;
  const centerX = camera.position.x;
  const centerY = camera.position.y;
  const centerZ = camera.position.z;

  for (let i = 0; i < rain.drops.length; i += 1) {
    const drop = rain.drops[i];
    drop.y -= drop.speed * delta;
    drop.x += (windX + drop.drift) * delta;
    drop.z += windZ * delta;

    wrapWeatherParticle(drop, centerX, centerY, centerZ);

    const base = i * 6;
    const headX = centerX + drop.x;
    const headY = centerY + drop.y;
    const headZ = centerZ + drop.z;
    rain.positions[base] = headX;
    rain.positions[base + 1] = headY;
    rain.positions[base + 2] = headZ;
    rain.positions[base + 3] = headX - windX * 0.035;
    rain.positions[base + 4] = headY - drop.length;
    rain.positions[base + 5] = headZ - windZ * 0.035;
  }

  rain.lines.geometry.attributes.position.needsUpdate = true;
}

function updateSnow(snow, delta, camera, windEnabled) {
  const windX = windEnabled ? -5.2 : -0.8;
  const windZ = windEnabled ? 1.7 : 0.2;
  const centerX = camera.position.x;
  const centerY = camera.position.y;
  const centerZ = camera.position.z;
  snow.time += delta;

  for (let i = 0; i < snow.flakes.length; i += 1) {
    const flake = snow.flakes[i];
    const swirl = Math.sin(snow.time * 1.7 + flake.drift) * (windEnabled ? 2.2 : 0.8);
    flake.y -= flake.speed * delta;
    flake.x += (windX + swirl) * delta;
    flake.z += windZ * delta;

    wrapWeatherParticle(flake, centerX, centerY, centerZ);

    const base = i * 3;
    snow.positions[base] = centerX + flake.x;
    snow.positions[base + 1] = centerY + flake.y;
    snow.positions[base + 2] = centerZ + flake.z;
  }

  snow.points.geometry.attributes.position.needsUpdate = true;
}

function updateLightning(lightning, delta, camera, mode) {
  if (mode !== 'rain') {
    lightning.flashLight.intensity = 0;
    lightning.skyLight.intensity = 0;
    lightning.remaining = 0;
    lightning.timer = Math.min(lightning.timer, randomLightningDelay());
    return;
  }

  if (lightning.remaining > 0) {
    lightning.remaining -= delta;
    const phase = Math.max(0, lightning.remaining / lightning.duration);
    const flicker = Math.random() > 0.72 ? 0.35 : 1;
    const intensity = lightning.intensity * Math.sin(phase * Math.PI) * flicker;
    lightning.flashLight.intensity = intensity;
    lightning.skyLight.intensity = intensity * 0.42;
    return;
  }

  lightning.flashLight.intensity = 0;
  lightning.skyLight.intensity = 0;
  lightning.timer -= delta;

  if (lightning.timer > 0) {
    return;
  }

  lightning.duration = 0.09 + Math.random() * 0.16;
  lightning.remaining = lightning.duration;
  lightning.intensity = 4.8 + Math.random() * 5.5;
  lightning.timer = randomLightningDelay();
  lightning.strikeCount += 1;
  lightning.flashLight.position.set(
    camera.position.x + randomSpread(55),
    camera.position.y + 38 + Math.random() * 18,
    camera.position.z + randomSpread(55),
  );
  lightning.skyLight.position.copy(lightning.flashLight.position);
}

function wrapWeatherParticle(particle, centerX, centerY, centerZ) {
  if (particle.y < -WEATHER_HEIGHT * 0.35) {
    particle.y = WEATHER_HEIGHT * (0.55 + Math.random() * 0.45);
    particle.x = randomSpread(WEATHER_RADIUS);
    particle.z = randomSpread(WEATHER_RADIUS);
  }

  if (Math.abs(particle.x) > WEATHER_RADIUS) {
    particle.x -= Math.sign(particle.x) * WEATHER_RADIUS * 2;
  }

  if (Math.abs(particle.z) > WEATHER_RADIUS) {
    particle.z -= Math.sign(particle.z) * WEATHER_RADIUS * 2;
  }

  if (centerY + particle.y < 1.1) {
    particle.y = 1.1 - centerY + Math.random() * WEATHER_HEIGHT;
  }

  if (!Number.isFinite(centerX) || !Number.isFinite(centerZ)) {
    particle.x = randomSpread(WEATHER_RADIUS);
    particle.z = randomSpread(WEATHER_RADIUS);
  }
}

function randomSpread(radius) {
  return (Math.random() - 0.5) * radius * 2;
}

function randomLightningDelay() {
  return 3.8 + Math.random() * 7.4;
}
