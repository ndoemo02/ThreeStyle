'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCreatorRoomMobile } from './CreatorRoomProfile';
import {
  BOOKS, CABINET_PLANT, CUSHIONS, DECOR_COLORS, FLOOR_PLANT, LAMP, PAINTINGS, POUF, type Vec3,
} from './creatorDecorLayout';

type Part = { geometry: THREE.BufferGeometry; color: string };
const tmp = new THREE.Color();

/** Bakes a flat colour per part, so all solid props share one material and one draw call. */
function mergeColored(parts: Part[]) {
  const geometries = parts.map(({ geometry, color }) => {
    tmp.set(color);
    const count = geometry.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([tmp.r, tmp.g, tmp.b], i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  });
  const merged = mergeGeometries(geometries);
  geometries.forEach(geometry => geometry.dispose());
  merged.computeBoundingSphere();
  return merged;
}

const at = (geometry: THREE.BufferGeometry, [x, y, z]: Vec3) => geometry.translate(x, y, z);

/** Square cushion: puffed in the middle, pinched seams, softly rounded corners. */
function cushionGeometry() {
  const geometry = new THREE.BoxGeometry(0.52, 0.48, 0.2, 10, 10, 2);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const nx = position.getX(i) / 0.26, ny = position.getY(i) / 0.24;
    position.setXYZ(i, position.getX(i) * (1 - 0.1 * ny * ny), position.getY(i) * (1 - 0.1 * nx * nx), position.getZ(i) * (1 - 0.8 * Math.max(nx * nx, ny * ny)));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Upholstered pouf: straight sides with rounded top and bottom edges. */
function poufGeometry() {
  const r = POUF.radius, h = POUF.height, round = 0.08, points = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); points.push(new THREE.Vector2(r - round + Math.cos(a) * round, round + Math.sin(a) * round)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); points.push(new THREE.Vector2(r - round + Math.cos(a) * round, h - round + Math.sin(a) * round)); }
  points.push(new THREE.Vector2(0, h));
  return new THREE.LatheGeometry(points, 32);
}

function solidParts(): Part[] {
  const parts: Part[] = [];
  for (const cushion of CUSHIONS) {
    const pillow = cushionGeometry().rotateX(-0.28).rotateY(cushion.rotationY);
    parts.push({ geometry: at(pillow, cushion.position), color: cushion.red ? DECOR_COLORS.cushionRed : DECOR_COLORS.cushionDark });
  }
  parts.push({ geometry: at(poufGeometry(), POUF.position), color: DECOR_COLORS.pouf });
  // Dome table lamp: brass base and stem, dark shade.
  const [lx, ly, lz] = LAMP.position;
  parts.push({ geometry: at(new THREE.CylinderGeometry(0.12, 0.13, 0.03, 24), [lx, ly + 0.015, lz]), color: DECOR_COLORS.brass });
  parts.push({ geometry: at(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 10), [lx, ly + 0.25, lz]), color: DECOR_COLORS.brass });
  parts.push({ geometry: at(new THREE.SphereGeometry(0.27, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), [lx, ly + 0.47, lz]), color: DECOR_COLORS.lampShade });
  // Pots.
  const [cx, cy, cz] = CABINET_PLANT.position;
  parts.push({ geometry: at(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 20), [cx, cy + 0.13, cz]), color: DECOR_COLORS.pot });
  const [fx, , fz] = FLOOR_PLANT.position;
  parts.push({ geometry: at(new THREE.CylinderGeometry(FLOOR_PLANT.radius, FLOOR_PLANT.radius * 0.8, 0.55, 22), [fx, 0.275, fz]), color: DECOR_COLORS.pot });
  parts.push({ geometry: at(new THREE.CylinderGeometry(0.035, 0.05, 0.9, 8), [fx, 0.95, fz]), color: DECOR_COLORS.trunk });
  // Book stack.
  const [bx, by, bz] = BOOKS.position;
  parts.push({ geometry: at(new THREE.BoxGeometry(0.24, 0.045, 0.34), [bx, by + 0.0225, bz]), color: DECOR_COLORS.booksCream });
  parts.push({ geometry: at(new THREE.BoxGeometry(0.22, 0.05, 0.3).rotateY(0.12), [bx, by + 0.07, bz]), color: DECOR_COLORS.booksDark });
  parts.push({ geometry: at(new THREE.BoxGeometry(0.23, 0.04, 0.32).rotateY(-0.08), [bx, by + 0.115, bz]), color: DECOR_COLORS.booksBrown });
  // Painting frames and picture-light housings.
  for (const painting of PAINTINGS) {
    const [px, py, pz] = painting.center, w = painting.width, h = painting.height;
    const x = px + painting.facing * 0.01;
    parts.push({ geometry: at(new THREE.BoxGeometry(0.05, 0.06, w + 0.12), [x, py + h / 2 + 0.03, pz]), color: DECOR_COLORS.walnut });
    parts.push({ geometry: at(new THREE.BoxGeometry(0.05, 0.06, w + 0.12), [x, py - h / 2 - 0.03, pz]), color: DECOR_COLORS.walnut });
    parts.push({ geometry: at(new THREE.BoxGeometry(0.05, h, 0.06), [x, py, pz - w / 2 - 0.03]), color: DECOR_COLORS.walnut });
    parts.push({ geometry: at(new THREE.BoxGeometry(0.05, h, 0.06), [x, py, pz + w / 2 + 0.03]), color: DECOR_COLORS.walnut });
    parts.push({ geometry: at(new THREE.BoxGeometry(0.09, 0.045, w * 0.5), [px + painting.facing * 0.17, py + h / 2 + 0.16, pz]), color: DECOR_COLORS.brass });
    parts.push({ geometry: at(new THREE.BoxGeometry(0.16, 0.02, 0.02), [px + painting.facing * 0.08, py + h / 2 + 0.16, pz]), color: DECOR_COLORS.brass });
  }
  return parts;
}

/** Leaf cards: three crossed quads per clump, alpha-tested against a drawn leaf texture. */
function foliageGeometry() {
  const cards: THREE.BufferGeometry[] = [];
  const clump = (position: Vec3, size: number, turn: number) => {
    for (let k = 0; k < 3; k++) cards.push(at(new THREE.PlaneGeometry(size, size).rotateX(k === 2 ? -Math.PI / 2 + 0.35 : 0).rotateY(turn + k * Math.PI / 3), position));
  };
  const [cx, cy, cz] = CABINET_PLANT.position;
  clump([cx, cy + 0.5, cz], 0.5, 0); clump([cx + 0.06, cy + 0.42, cz - 0.05], 0.36, 0.9);
  const [fx, , fz] = FLOOR_PLANT.position;
  clump([fx, 1.6, fz], 1.0, 0); clump([fx - 0.15, 1.3, fz + 0.1], 0.8, 0.7); clump([fx + 0.1, 1.95, fz - 0.05], 0.7, 1.6); clump([fx + 0.12, 1.15, fz - 0.15], 0.6, 2.3);
  const merged = mergeGeometries(cards);
  cards.forEach(geometry => geometry.dispose());
  merged.computeBoundingSphere();
  return merged;
}

/** Drawn leaf spray (original, runtime): pointed leaves with a midrib on transparent ground. */
function paintLeaves(mobile: boolean) {
  const size = mobile ? 256 : 512, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return null;
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 26; i++) {
    const angle = random() * Math.PI * 2, reach = size * (0.12 + random() * 0.3);
    const x = size / 2 + Math.cos(angle) * reach * 0.55, y = size / 2 + Math.sin(angle) * reach * 0.55;
    const length = size * (0.16 + random() * 0.12), width = length * 0.36, shade = 0.55 + random() * 0.45;
    g.save(); g.translate(x, y); g.rotate(angle + (random() - 0.5) * 0.6);
    const gradient = g.createLinearGradient(0, -width, 0, width);
    gradient.addColorStop(0, `rgb(${Math.round(38 * shade)}, ${Math.round(92 * shade)}, ${Math.round(40 * shade)})`);
    gradient.addColorStop(1, `rgb(${Math.round(22 * shade)}, ${Math.round(58 * shade)}, ${Math.round(26 * shade)})`);
    g.fillStyle = gradient;
    g.beginPath(); g.moveTo(0, 0);
    g.quadraticCurveTo(length * 0.45, -width, length, 0);
    g.quadraticCurveTo(length * 0.45, width, 0, 0);
    g.fill();
    g.strokeStyle = 'rgba(150, 190, 120, 0.35)'; g.lineWidth = size / 400;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(length * 0.92, 0); g.stroke();
    g.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function emissiveParts(): Part[] {
  const [lx, ly, lz] = LAMP.position;
  const parts: Part[] = [{ geometry: at(new THREE.CircleGeometry(0.25, 28).rotateX(Math.PI / 2), [lx, ly + 0.465, lz]), color: '#ffd9a8' }];
  for (const painting of PAINTINGS) {
    const [px, py, pz] = painting.center;
    parts.push({ geometry: at(new THREE.BoxGeometry(0.05, 0.012, painting.width * 0.48), [px + painting.facing * 0.17, py + painting.height / 2 + 0.132, pz]), color: '#ffe4bf' });
  }
  return parts;
}

/** Original abstract artworks drawn at runtime (no third-party image): copper ribbons | cream strokes. */
function paintArtAtlas(mobile: boolean) {
  const canvas = document.createElement('canvas');
  const width = mobile ? 1024 : 2048, height = width / 4;
  canvas.width = width; canvas.height = height;
  const g = canvas.getContext('2d');
  if (!g) return null;
  const half = width / 2, s = height / 512;
  g.fillStyle = '#0d0b0a'; g.fillRect(0, 0, half, height);
  g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const gradient = g.createLinearGradient(0, 0, half, height);
    gradient.addColorStop(0, `rgba(176, 92, 42, ${0.35 + i * 0.07})`);
    gradient.addColorStop(1, `rgba(244, 178, 118, ${0.25 + i * 0.08})`);
    g.strokeStyle = gradient; g.lineWidth = (4 + i * 5) * s;
    g.beginPath();
    g.moveTo(-40 * s, (380 - i * 18) * s);
    g.bezierCurveTo(half * 0.3, (120 + i * 22) * s, half * 0.55, (560 - i * 30) * s, half + 40 * s, (150 + i * 26) * s);
    g.stroke();
  }
  g.strokeStyle = 'rgba(236, 196, 140, 0.55)'; g.lineWidth = 1.5 * s;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, (420 - i * 12) * s); g.bezierCurveTo(half * 0.4, (60 + i * 15) * s, half * 0.7, (520 - i * 9) * s, half, (90 + i * 20) * s); g.stroke(); }
  g.fillStyle = '#121010'; g.fillRect(half, 0, half, height);
  const stroke = (color: string, lineWidth: number, points: number[]) => {
    g.strokeStyle = color; g.lineWidth = lineWidth * s; g.beginPath();
    g.moveTo(half + points[0] * s, points[1] * s);
    g.bezierCurveTo(half + points[2] * s, points[3] * s, half + points[4] * s, points[5] * s, half + points[6] * s, points[7] * s);
    g.stroke();
  };
  stroke('#e8e0d2', 70, [220, -40, 300, 200, 360, 300, 300, 560]);
  stroke('#e8e0d2', 48, [520, -30, 420, 180, 600, 320, 470, 560]);
  stroke('#d9cfbf', 26, [700, 40, 640, 220, 820, 340, 760, 540]);
  stroke('#c2421f', 16, [120, 520, 380, 360, 600, 300, 980, 20]);
  stroke('#16120f', 22, [80, 120, 300, 260, 520, 120, 900, 300]);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function paintingGeometry() {
  const planes = PAINTINGS.map(painting => {
    const plane = new THREE.PlaneGeometry(painting.width, painting.height);
    const uv = plane.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setX(i, painting.atlasU + uv.getX(i) * 0.5);
    return at(plane.rotateY(painting.facing * Math.PI / 2), [painting.center[0] + painting.facing * 0.012, painting.center[1], painting.center[2]]);
  });
  const merged = mergeGeometries(planes);
  planes.forEach(plane => plane.dispose());
  merged.computeBoundingSphere();
  return merged;
}

/** Lamp light on the cabinet top and the spill on the wall behind it, one additive mesh. */
function lampPoolGeometry() {
  const [lx, ly, lz] = LAMP.position;
  const parts = [
    at(new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), [lx, ly + 0.004, lz]),
    at(new THREE.PlaneGeometry(1.6, 1.2).rotateY(Math.PI / 2), [-6.73, ly + 0.45, lz]),
  ];
  const merged = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  merged.computeBoundingSphere();
  return merged;
}

function lampPoolTexture() {
  const size = 32, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.min(1, Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2));
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.round(255 * (1 - d) ** 2);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Room.B props: five draw calls (solids, leaves, emissive, paintings, lamp light). */
export function CreatorDecor() {
  const mobile = useCreatorRoomMobile();
  const resources = useMemo(() => {
    const art = paintArtAtlas(mobile);
    const leaves = paintLeaves(mobile);
    const pool = lampPoolTexture();
    return {
      solid: mergeColored(solidParts()),
      foliage: foliageGeometry(),
      emissive: mergeColored(emissiveParts()),
      paintings: paintingGeometry(),
      lampPools: lampPoolGeometry(),
      art, leaves, pool,
      solidMaterial: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0 }),
      foliageMaterial: new THREE.MeshStandardMaterial({ map: leaves, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }),
      emissiveMaterial: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      paintingMaterial: new THREE.MeshStandardMaterial({ map: art, emissiveMap: art, emissive: '#ffe6c8', emissiveIntensity: 0.28, roughness: 0.82 }),
      poolMaterial: new THREE.MeshBasicMaterial({ map: pool, color: '#ffb067', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    };
  }, [mobile]);
  useEffect(() => () => {
    for (const geometry of [resources.solid, resources.foliage, resources.emissive, resources.paintings, resources.lampPools]) geometry.dispose();
    resources.art?.dispose(); resources.leaves?.dispose(); resources.pool.dispose();
    for (const material of [resources.solidMaterial, resources.foliageMaterial, resources.emissiveMaterial, resources.paintingMaterial, resources.poolMaterial]) material.dispose();
  }, [resources]);
  return <group name="creator-decor">
    <mesh geometry={resources.solid} material={resources.solidMaterial} raycast={() => {}} />
    {resources.leaves && <mesh geometry={resources.foliage} material={resources.foliageMaterial} raycast={() => {}} />}
    <mesh geometry={resources.emissive} material={resources.emissiveMaterial} raycast={() => {}} />
    {resources.art && <mesh geometry={resources.paintings} material={resources.paintingMaterial} raycast={() => {}} />}
    <mesh geometry={resources.lampPools} material={resources.poolMaterial} raycast={() => {}} renderOrder={1} />
  </group>;
}
