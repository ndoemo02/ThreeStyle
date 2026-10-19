'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCreatorLightingFrame } from './CreatorLighting';
import { useHudStore } from '../../../stores/useHudStore';
import { ambilightGlow, ambilightTint, ambilightUvTransform, ambilightZones, averageColor } from '../../../lib/creatorAmbilight';

const SAMPLE_W = 32;
const SAMPLE_H = 18;
/** Glow zones, like a TV's: each one averages a deep slice of the picture. */
const COLS = 6;
const ROWS = 4;
/** Each sample blends this much of the new picture into the old one: cuts and flashes ease over ~0.3 s. */
const SAMPLE_BLEND = 0.35;
const STRENGTH = 0.75;

/** Luminance mask (alphaMap reads green): solid behind the casing, fading out over `spread` around it. */
function createGlowMask(plane: { width: number; height: number }, inner: { width: number; height: number }, center: { x: number; y: number }, spread: number) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x / (size - 1) - 0.5) * plane.width + center.x;
      const py = (y / (size - 1) - 0.5) * plane.height + center.y;
      const dx = Math.max(0, Math.abs(px) - inner.width / 2), dy = Math.max(0, Math.abs(py) - inner.height / 2);
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y) / (size * 0.08);
      const value = Math.exp(-Math.pow(Math.hypot(dx, dy) / spread, 1.6)) * Math.min(1, edge);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = Math.round(value * 255);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

interface AmbilightProps {
  /** The picture on the screen (video, camera or the audio visualizer canvas); null fades the glow out. */
  texture: THREE.Texture | null;
  screen: { width: number; height: number };
  /** The casing the glow starts behind. */
  casing: { width: number; height: number };
  plane: { width: number; height: number };
  /** Glow plane centre relative to the screen centre (the screen sits close under the ceiling). */
  center: { x: number; y: number };
  z: number;
  mobile?: boolean;
}

/** Ambilight: wall glow in the picture's edge colours, and the screen-fill light tinted by the picture. */
export function CreatorAmbilight({ texture, screen, casing, plane, center, z, mobile = false }: AmbilightProps) {
  const lighting = useCreatorLightingFrame();
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const sample = useMemo(() => {
    // The picture is scaled down on the GPU canvas; only 32×18 pixels are read back, from a CPU canvas.
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_W; canvas.height = SAMPLE_H;
    const context = canvas.getContext('2d');
    if (context) context.imageSmoothingQuality = 'high';
    const read = document.createElement('canvas');
    read.width = SAMPLE_W; read.height = SAMPLE_H;
    // The glow texture is the zone colours themselves (6×4); linear filtering blends neighbouring zones.
    const glow = document.createElement('canvas');
    glow.width = COLS; glow.height = ROWS;
    const glowContext = glow.getContext('2d');
    const colors = new THREE.CanvasTexture(glow);
    colors.colorSpace = THREE.SRGBColorSpace;
    colors.generateMipmaps = false;
    colors.minFilter = colors.magFilter = THREE.LinearFilter;
    const { repeat, offset } = ambilightUvTransform(plane, screen, center);
    colors.repeat.set(repeat.x, repeat.y);
    colors.offset.set(offset.x, offset.y);
    return {
      canvas, context, read, readContext: read.getContext('2d', { willReadFrequently: true }), glowContext, colors,
      pixels: glowContext?.createImageData(COLS, ROWS) ?? null,
      zones: new Float32Array(COLS * ROWS * 3), smooth: new Float32Array(COLS * ROWS * 3),
    };
  }, [plane, screen, center]);
  // Drawn into every frame through a ref, like the screen's audio display (hook values stay unmodified).
  const sampleRef = useRef(sample);
  const mask = useMemo(() => createGlowMask(plane, casing, center, 0.55), [plane, casing, center]);
  const state = useRef({ last: -1, glow: 0, picture: { r: 0, g: 0, b: 0 }, tint: { r: 0, g: 0, b: 0 }, room: { r: 0, g: 0, b: 0 }, target: new THREE.Color(), has: false, readable: true });

  useEffect(() => {
    sampleRef.current = sample;
    return () => sample.colors.dispose();
  }, [sample]);
  useEffect(() => () => mask.dispose(), [mask]);
  useEffect(() => { state.current.readable = true; }, [texture]);

  useFrame(({ clock }, delta) => {
    const frame = lighting.current, s = state.current;
    const source = texture?.image as HTMLVideoElement | HTMLCanvasElement | undefined;
    // Only a picture the viewer sees: a selected but unplayed video has frames the screen does not show yet.
    const shown = frame.session.state === 'live' || frame.session.state === 'paused' || useHudStore.getState().camEnabled;
    const ready = shown && !!source && (!(source instanceof HTMLVideoElement) || source.readyState >= 2);
    const now = clock.elapsedTime;
    const { context, readContext, glowContext, canvas, read, colors, pixels, zones, smooth } = sampleRef.current;
    if (context && readContext && glowContext && pixels && now - s.last >= 1 / (mobile ? 6 : 10)) {
      s.last = now;
      let sampled = false;
      if (ready && source && s.readable) {
        try {
          context.drawImage(source, 0, 0, SAMPLE_W, SAMPLE_H);
          readContext.drawImage(canvas, 0, 0);
          const data = readContext.getImageData(0, 0, read.width, read.height).data;
          averageColor(data, s.picture);
          ambilightZones(data, SAMPLE_W, SAMPLE_H, COLS, ROWS, zones);
          for (let zone = 0; zone < COLS * ROWS; zone++) ambilightGlow(zones, zone);
          sampled = true;
        } catch {
          // A cross-origin picture taints the canvas: no glow, the light stays in the room colour.
          s.readable = false;
        }
      }
      for (let i = 0; i < smooth.length; i++) smooth[i] += ((sampled ? zones[i] : 0) - smooth[i]) * SAMPLE_BLEND;
      for (let zone = 0; zone < COLS * ROWS; zone++) {
        for (let c = 0; c < 3; c++) pixels.data[zone * 4 + c] = Math.round(smooth[zone * 3 + c] * 255);
        pixels.data[zone * 4 + 3] = 255;
      }
      glowContext.putImageData(pixels, 0, 0);
      colors.needsUpdate = true;
      s.has = sampled;
    }
    const step = Math.min(delta, 0.1);
    const blend = 1 - Math.exp(-step * 3);
    s.glow = THREE.MathUtils.lerp(s.glow, s.has ? 1 : 0, blend);
    if (material.current) {
      material.current.opacity = STRENGTH * s.glow;
      material.current.visible = s.glow > 0.01;
    }
    // Light colour: room colour tinted by the picture (sRGB maths, like the sample), eased.
    frame.roomColor.getRGB(s.room, THREE.SRGBColorSpace);
    if (s.has) ambilightTint(s.picture, s.room, s.tint);
    else { s.tint.r = s.room.r; s.tint.g = s.room.g; s.tint.b = s.room.b; }
    s.target.setRGB(s.tint.r, s.tint.g, s.tint.b, THREE.SRGBColorSpace);
    frame.screenColor.lerp(s.target, blend);
  });

  return (
    <mesh position={[center.x, center.y, z]} renderOrder={1}>
      <planeGeometry args={[plane.width, plane.height]} />
      <meshBasicMaterial ref={material} map={sample.colors} alphaMap={mask} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} visible={false} />
    </mesh>
  );
}
