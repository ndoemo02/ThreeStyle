import * as THREE from 'three';

/**
 * Procedural greyscale maps for the elevator (multiplied by each material's colour).
 * One repeat is one metre; mipmapped and tiling, so they stay sharp at any wall size.
 */
const SIZE = 256;

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Smooth 1D value noise over `cells` cells, wrapping at the texture edge. */
function noise1d(cells: number, seed: number) {
  const next = random(seed);
  const values = Array.from({ length: cells }, () => next());
  return (t: number) => {
    const x = (t * cells) % cells;
    const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
    return values[i] * (1 - s) + values[(i + 1) % cells] * s;
  };
}

function texture(shade: (u: number, v: number) => number) {
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const value = Math.round(Math.max(0, Math.min(1, shade(x / SIZE, y / SIZE))) * 255);
      pixels.set([value, value, value, 255], (y * SIZE + x) * 4);
    }
  }
  const map = new THREE.DataTexture(pixels, SIZE, SIZE);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}

/** Brushed metal: fine vertical streaks that drift slowly along their length. */
export function createBrushedMap() {
  // Low contrast and fine: stronger streaks read as wood grain from a few metres away.
  const streaks = noise1d(256, 41), coarse = noise1d(24, 7), drift = noise1d(8, 3);
  return texture((u, v) => 0.86 + (streaks(u + drift(v) * 0.01) - 0.5) * 0.07 + (coarse(u) - 0.5) * 0.03);
}

/** Lacquered wall panels 1 m wide with a dark joint and a faint vertical grain. */
export function createPanelMap() {
  const grain = noise1d(160, 19), wave = noise1d(12, 5);
  return texture((u, v) => {
    const joint = u < 0.006 || u > 0.994 ? 0.35 : 1;
    return joint * (0.84 + (grain(u + wave(v) * 0.02) - 0.5) * 0.06 + Math.sin(v * Math.PI * 2) * 0.02);
  });
}

/** Stone floor in 0.5 m tiles: mottled, with thin grout. */
export function createStoneMap() {
  const a = noise1d(24, 11), b = noise1d(24, 23), c = noise1d(64, 31);
  return texture((u, v) => {
    const tu = (u * 2) % 1, tv = (v * 2) % 1;
    const grout = tu < 0.008 || tu > 0.992 || tv < 0.008 || tv > 0.992 ? 0.45 : 1;
    const mottle = (a(u + b(v) * 0.3) + b(v + a(u) * 0.3)) / 2;
    return grout * (0.7 + (mottle - 0.5) * 0.22 + (c(u + v) - 0.5) * 0.06);
  });
}
