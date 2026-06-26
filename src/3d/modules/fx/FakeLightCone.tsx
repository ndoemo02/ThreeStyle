"use client";

import * as THREE from 'three';

interface FakeLightConeProps {
  color?: string;
  opacity?: number;
  height?: number;
  radius?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export function FakeLightCone({
  color = '#4fd1c5',
  opacity = 0.3,
  height = 5,
  radius = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: FakeLightConeProps) {
  return (
    <mesh position={position} rotation={rotation}>
      <coneGeometry args={[radius, height, 16, 1, true]} />
      <meshBasicMaterial 
        color={color}
        transparent={true}
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
