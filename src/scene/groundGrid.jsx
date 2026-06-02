import * as THREE from 'three';

export const GROUND_GRID = {
  extent: 80,
  step: 5,
  majorStep: 10,
  y: 0.018,
};

export function createGroundGrid() {
  const group = new THREE.Group();
  group.name = 'numbered-ground-grid';

  const { extent, step, majorStep, y } = GROUND_GRID;
  const positions = [];
  const majorPositions = [];

  for (let value = -extent; value <= extent; value += step) {
    const target = value % majorStep === 0 ? majorPositions : positions;
    target.push(value, y, -extent, value, y, extent);
    target.push(-extent, y, value, extent, y, value);
  }

  const minorLines = createLineSegments(positions, 0x7f9185, 0.24);
  const majorLines = createLineSegments(majorPositions, 0xffce56, 0.34);
  group.add(minorLines, majorLines);

  addAxisLabels(group);
  addCellLabels(group);
  return group;
}

export function getGridCellFromPosition(position) {
  const { extent, step } = GROUND_GRID;
  const clampedX = THREE.MathUtils.clamp(position.x, -extent, extent - 0.001);
  const clampedZ = THREE.MathUtils.clamp(position.z, -extent, extent - 0.001);
  const column = Math.floor((clampedX + extent) / step);
  const row = Math.floor((clampedZ + extent) / step);
  const columnName = toColumnName(column);

  return {
    cell: `${columnName}${String(row + 1).padStart(2, '0')}`,
    x: Math.round(position.x * 10) / 10,
    z: Math.round(position.z * 10) / 10,
  };
}

function createLineSegments(values, color, opacity) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(values, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = -1;
  return lines;
}

function addAxisLabels(group) {
  const { extent, majorStep, y } = GROUND_GRID;

  for (let value = -extent; value <= extent; value += majorStep) {
    const xLabel = createTextSprite(`X ${value}`);
    xLabel.position.set(value, y + 0.08, -extent - 3);
    group.add(xLabel);

    const zLabel = createTextSprite(`Z ${value}`);
    zLabel.position.set(-extent - 3, y + 0.08, value);
    group.add(zLabel);
  }
}

function addCellLabels(group) {
  const { extent, step, y } = GROUND_GRID;
  const cellCount = (extent * 2) / step;

  for (let column = 0; column < cellCount; column += 1) {
    for (let row = 0; row < cellCount; row += 1) {
      if (column % 2 !== 0 || row % 2 !== 0) {
        continue;
      }

      const label = createTextSprite(`${toColumnName(column)}${String(row + 1).padStart(2, '0')}`, 0.42);
      label.position.set(-extent + column * step + step / 2, y + 0.055, -extent + row * step + step / 2);
      group.add(label);
    }
  }
}

function createTextSprite(text, opacity = 0.66) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = `rgba(11, 15, 19, ${opacity * 0.78})`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = `rgba(255, 206, 86, ${opacity})`;
  context.lineWidth = 3;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  context.fillStyle = `rgba(244, 241, 232, ${opacity})`;
  context.font = '700 28px Inter, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.2, 1.08, 1);
  return sprite;
}

function toColumnName(index) {
  let number = index;
  let name = '';

  do {
    name = String.fromCharCode(65 + (number % 26)) + name;
    number = Math.floor(number / 26) - 1;
  } while (number >= 0);

  return name;
}
