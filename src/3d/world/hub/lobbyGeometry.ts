import * as THREE from 'three';

export type LobbySurface = 'stone' | 'wood' | 'plaster' | 'dark';
export type LobbyAtlasRect = [offsetX: number, offsetY: number, width: number, height: number];

const ATLAS_RECTS: Record<LobbySurface, LobbyAtlasRect> = {
  stone: [0.01, 0.51, 0.48, 0.48],
  wood: [0.51, 0.51, 0.48, 0.48],
  plaster: [0.01, 0.01, 0.48, 0.48],
  dark: [0.51, 0.01, 0.48, 0.48],
};

export function getLobbyAtlasRect(surface: LobbySurface): LobbyAtlasRect {
  return [...ATLAS_RECTS[surface]];
}

export function remapLobbyUv(source: ArrayLike<number>, surface: LobbySurface): Float32Array {
  const [offsetX, offsetY, width, height] = ATLAS_RECTS[surface];
  const mapped = new Float32Array(source.length);

  for (let index = 0; index < source.length; index += 2) {
    mapped[index] = offsetX + source[index] * width;
    mapped[index + 1] = offsetY + source[index + 1] * height;
  }

  return mapped;
}

export function applyLobbyAtlasUv<T extends THREE.BufferGeometry>(geometry: T, surface: LobbySurface): T {
  const uv = geometry.getAttribute('uv');
  if (!uv) return geometry;
  geometry.setAttribute('uv', new THREE.BufferAttribute(remapLobbyUv(uv.array, surface), 2));
  return geometry;
}

export function createLobbyBoxGeometry(
  size: [number, number, number],
  surface: LobbySurface,
): THREE.BoxGeometry {
  return applyLobbyAtlasUv(new THREE.BoxGeometry(...size), surface);
}

export function createLobbyPlaneGeometry(
  size: [number, number],
  surface: LobbySurface,
): THREE.PlaneGeometry {
  return applyLobbyAtlasUv(new THREE.PlaneGeometry(...size), surface);
}

/** Tile only the visible floor surface; walls, door anchors and navigation stay untouched. */
export function createLobbyFloorGeometry(size: [number, number, number], tileSize = 1.5): THREE.BufferGeometry {
  const [width, height, depth] = size;
  const columns = Math.ceil(width / tileSize);
  const rows = Math.ceil(depth / tileSize);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x0 = -width / 2 + column * tileSize;
      const z0 = -depth / 2 + row * tileSize;
      const x1 = Math.min(x0 + tileSize, width / 2);
      const z1 = Math.min(z0 + tileSize, depth / 2);
      const u = (x1 - x0) / tileSize;
      const v = (z1 - z0) / tileSize;
      positions.push(x0, height / 2, z0, x0, height / 2, z1, x1, height / 2, z0,
        x1, height / 2, z0, x0, height / 2, z1, x1, height / 2, z1);
      uvs.push(0, 0, 0, v, u, 0, u, 0, 0, v, u, v);
      for (let vertex = 0; vertex < 6; vertex++) normals.push(0, 1, 0);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(remapLobbyUv(uvs, 'stone'), 2));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
