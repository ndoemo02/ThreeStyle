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
