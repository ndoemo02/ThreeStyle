'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CreatorLight, useCreatorLightingFrame } from './CreatorLighting';

export function CreatorPerimeterLights() {
  const frameRef = useCreatorLightingFrame();
  const resources = useMemo(() => {
    const width = 13.45, depth = 12.45;
    const strips = [
      new THREE.BoxGeometry(width, 0.035, 0.12).translate(0, 0, depth / 2),
      new THREE.BoxGeometry(width, 0.035, 0.12).translate(0, 0, -depth / 2),
      new THREE.BoxGeometry(0.12, 0.035, depth).translate(-width / 2, 0, 0),
      new THREE.BoxGeometry(0.12, 0.035, depth).translate(width / 2, 0, 0),
    ];
    const geometry = mergeGeometries(strips);
    strips.forEach(strip => strip.dispose());
    const data = new Uint8Array(32 * 4);
    for (let y = 0; y < 32; y++) { const i = y * 4; data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.round(255 * Math.pow(y / 31, 2.8)); }
    const texture = new THREE.DataTexture(data, 1, 32);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    const led = new THREE.MeshBasicMaterial({ toneMapped: false });
    const glow = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
    return { geometry, texture, led, glow };
  }, []);
  const glowRef = useRef(resources.glow);
  useEffect(() => () => { resources.geometry.dispose(); resources.texture.dispose(); resources.led.dispose(); resources.glow.dispose(); }, [resources]);
  useFrame(() => {
    const frame = frameRef.current;
    resources.led.color.copy(frame.color).multiplyScalar(frame.led * 1.8);
    resources.glow.color.copy(frame.color);
    glowRef.current.opacity = Math.min(0.75, frame.led * 0.38);
  }, -1);
  return <group name="creator-ceiling-led" position={[0, 4.95, 0.5]}>
    <mesh name="creator-led-strip" geometry={resources.geometry} material={resources.led} />
    <mesh position={[0, -0.21, 6.21]} rotation={[0, Math.PI, 0]} material={resources.glow}><planeGeometry args={[13.45, 0.42]} /></mesh>
    <mesh position={[0, -0.21, -6.21]} material={resources.glow}><planeGeometry args={[13.45, 0.42]} /></mesh>
    <mesh position={[-6.71, -0.21, 0]} rotation={[0, Math.PI / 2, 0]} material={resources.glow}><planeGeometry args={[12.45, 0.42]} /></mesh>
    <mesh position={[6.71, -0.21, 0]} rotation={[0, -Math.PI / 2, 0]} material={resources.glow}><planeGeometry args={[12.45, 0.42]} /></mesh>
    <CreatorLight channel="led" name="led-fill" position={[0, -0.25, 0]} intensity={0.55} distance={14} decay={1.5} />
  </group>;
}
