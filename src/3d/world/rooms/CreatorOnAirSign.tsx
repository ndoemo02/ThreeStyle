'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCreatorLightingFrame } from './CreatorLighting';

const WIDTH = 0.92;
const HEIGHT = 0.26;

/** Red lettering on a dark face, drawn once in code; brightness is the material colour, so no light is added. */
function createOnAirTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#080605';
    context.fillRect(0, 0, 512, 128);
    context.strokeStyle = '#ff2416';
    context.lineWidth = 6;
    context.beginPath();
    context.roundRect(10, 10, 492, 108, 16);
    context.stroke();
    context.fillStyle = '#ff2416';
    context.font = 'bold 76px Arial, Helvetica, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('ON AIR', 256, 68);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** ON AIR above the booth window, room side: unlit when idle, dim while a track waits, lit and beating when live. */
export function CreatorOnAirSign({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  const lighting = useCreatorLightingFrame();
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => createOnAirTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(() => {
    const level = lighting.current.onAir;
    material.current?.color.setRGB(level, level, level);
  });
  return (
    <group name="creator-on-air" position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[WIDTH + 0.06, HEIGHT + 0.06, 0.05]} />
        <meshStandardMaterial color="#121110" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh>
        <planeGeometry args={[WIDTH, HEIGHT]} />
        {/* Not tone mapped, so the lit sign stays neon red instead of washing out towards white. */}
        <meshBasicMaterial ref={material} map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
