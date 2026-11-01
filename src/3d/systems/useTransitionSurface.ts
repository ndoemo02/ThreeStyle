'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** Tiny, deterministic brushed grain; static baked shading also survives loading. */
export function useTransitionSurface() {
  const map = useMemo(() => {
    const size = 128;
    const pixels = new Uint8Array(size * size * 4);
    let seed = 8731;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const noise = (seed >>> 24) / 255;
        const scratch = x % 29 === 0 ? -12 : 0;
        const shade = Math.round(198 + noise * 30 + Math.sin(x * 2.4) * 8 + scratch);
        pixels.set([shade, shade, shade, 255], (y * size + x) * 4);
      }
    }
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.repeat.set(3, 2);
    texture.needsUpdate = true;
    return texture;
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  return map;
}
