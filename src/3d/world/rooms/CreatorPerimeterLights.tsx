'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CreatorLight, useCreatorLightingFrame, type CreatorLightingFrame } from './CreatorLighting';
import { LED_PALETTE, ledPaletteColor } from '../../../lib/creatorLighting';

const WIDTH = 13.45, DEPTH = 12.45, PERIMETER = 2 * (WIDTH + DEPTH);
/** Palette colours spread around the whole room while cycling: a soft gradient, not a rainbow. */
const SPREAD = 2;

/** Distance along the strip (back → right → front → left), so the palette can run around the room. */
function perimeterDistance(x: number, z: number) {
  const w = WIDTH / 2, d = DEPTH / 2;
  const back = Math.abs(z + d), right = Math.abs(x - w), front = Math.abs(z - d);
  const nearest = Math.min(back, right, front, Math.abs(x + w));
  if (nearest === back) return x + w;
  if (nearest === right) return WIDTH + z + d;
  if (nearest === front) return WIDTH + DEPTH + w - x;
  return 2 * WIDTH + DEPTH + d - z;
}

/** Group offset of the ceiling strip in room space. */
const STRIP_Z = 0.5;

/** LED colour the strip shows nearest to a room-space point (palette position while cycling). */
export function perimeterLedColor(frame: CreatorLightingFrame, x: number, z: number, out: THREE.Color, rgb = { r: 0, g: 0, b: 0 }) {
  if (!frame.cycling) return out.copy(frame.color);
  const { r, g, b } = ledPaletteColor(frame.palette + perimeterDistance(x, z - STRIP_Z) / PERIMETER * SPREAD, rgb);
  return out.setRGB(r, g, b, THREE.SRGBColorSpace);
}

const GLOW_PLANES: { position: [number, number, number]; rotationY: number; length: number }[] = [
  { position: [0, -0.21, 6.21], rotationY: Math.PI, length: WIDTH },
  { position: [0, -0.21, -6.21], rotationY: 0, length: WIDTH },
  { position: [-6.71, -0.21, 0], rotationY: Math.PI / 2, length: DEPTH },
  { position: [6.71, -0.21, 0], rotationY: -Math.PI / 2, length: DEPTH },
];

export function CreatorPerimeterLights() {
  const frameRef = useCreatorLightingFrame();
  const resources = useMemo(() => {
    const strips = [
      new THREE.BoxGeometry(WIDTH, 0.035, 0.12).translate(0, 0, DEPTH / 2),
      new THREE.BoxGeometry(WIDTH, 0.035, 0.12).translate(0, 0, -DEPTH / 2),
      new THREE.BoxGeometry(0.12, 0.035, DEPTH).translate(-WIDTH / 2, 0, 0),
      new THREE.BoxGeometry(0.12, 0.035, DEPTH).translate(WIDTH / 2, 0, 0),
    ];
    const geometry = mergeGeometries(strips);
    strips.forEach(strip => strip.dispose());
    const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
    for (let i = 0; i < position.count; i++) uv.setXY(i, perimeterDistance(position.getX(i), position.getZ(i)) / PERIMETER * SPREAD / LED_PALETTE.length, 0.5);
    // Static colour = all-white palette tinted by the material colour; cycling = the palette itself.
    const palette = new THREE.DataTexture(new Uint8Array(LED_PALETTE.length * 4).fill(255), LED_PALETTE.length, 1);
    palette.wrapS = THREE.RepeatWrapping;
    palette.minFilter = palette.magFilter = THREE.LinearFilter;
    palette.colorSpace = THREE.SRGBColorSpace;
    palette.needsUpdate = true;
    const data = new Uint8Array(32 * 4);
    for (let y = 0; y < 32; y++) { const i = y * 4; data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.round(255 * Math.pow(y / 31, 2.8)); }
    const texture = new THREE.DataTexture(data, 1, 32);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    const led = new THREE.MeshBasicMaterial({ map: palette, toneMapped: false });
    // One glow material per wall (same shader program), so each wall can take its own palette colour.
    const glows = GLOW_PLANES.map(() => new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    const wallDistance = GLOW_PLANES.map(plane => perimeterDistance(plane.position[0], plane.position[2]));
    return { geometry, palette, texture, led, glows, wallDistance, rgb: { r: 0, g: 0, b: 0 } };
  }, []);
  const glowRefs = useRef(resources.glows);
  const palette = useRef({ texture: resources.palette, cycling: false });
  useEffect(() => () => {
    resources.geometry.dispose(); resources.palette.dispose(); resources.texture.dispose(); resources.led.dispose();
    resources.glows.forEach(glow => glow.dispose());
  }, [resources]);
  useFrame(() => {
    const frame = frameRef.current;
    const strip = palette.current;
    if (strip.cycling !== frame.cycling) {
      strip.cycling = frame.cycling;
      const pixels = strip.texture.image.data as Uint8Array;
      LED_PALETTE.forEach((hex, i) => {
        const value = parseInt(hex.slice(1), 16);
        pixels.set(frame.cycling ? [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255] : [255, 255, 255, 255], i * 4);
      });
      strip.texture.needsUpdate = true;
    }
    strip.texture.offset.x = frame.cycling ? (frame.palette + 0.5) / LED_PALETTE.length : 0;
    if (frame.cycling) resources.led.color.setScalar(frame.led * 1.8);
    else resources.led.color.copy(frame.color).multiplyScalar(frame.led * 1.8);
    const opacity = Math.min(0.75, frame.led * 0.38);
    glowRefs.current.forEach((glow, i) => {
      if (frame.cycling) {
        const { r, g, b } = ledPaletteColor(frame.palette + resources.wallDistance[i] / PERIMETER * SPREAD, resources.rgb);
        glow.color.setRGB(r, g, b, THREE.SRGBColorSpace);
      } else glow.color.copy(frame.color);
      glow.opacity = opacity;
    });
  }, -1);
  return <group name="creator-ceiling-led" position={[0, 4.95, STRIP_Z]}>
    <mesh name="creator-led-strip" geometry={resources.geometry} material={resources.led} />
    {GLOW_PLANES.map((plane, i) => (
      <mesh key={i} position={plane.position} rotation={[0, plane.rotationY, 0]} material={resources.glows[i]}><planeGeometry args={[plane.length, 0.42]} /></mesh>
    ))}
    <CreatorLight channel="led" name="led-fill" position={[0, -0.25, 0]} intensity={0.55} distance={14} decay={1.5} />
  </group>;
}
