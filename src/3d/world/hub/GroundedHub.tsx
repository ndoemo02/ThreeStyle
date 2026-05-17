"use client";

import { Suspense } from 'react';
import { LeftWingCorridor } from '../corridors/LeftWingCorridor';
import { HubShell } from './HubShell';

function HubShellFallback() {
  return (
    <group>
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 5, 0]} intensity={2} distance={18} color="#dbeafe" />

      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#d6cec0" roughness={0.55} metalness={0.04} />
      </mesh>
    </group>
  );
}

function CorridorFallback() {
  return (
    <group>
      <pointLight position={[-24, 4.5, -5]} intensity={4} distance={16} color="#f5e6d0" />

      <mesh position={[-25, -0.055, -5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#c9c2b7" roughness={0.6} metalness={0.03} />
      </mesh>
      <mesh position={[-25, 6, -5]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#ddd5ca" roughness={0.74} metalness={0.02} />
      </mesh>
      <mesh position={[-25, 3, -9]} castShadow receiveShadow>
        <boxGeometry args={[30, 6, 0.35]} />
        <meshStandardMaterial color="#7f7b74" roughness={0.8} />
      </mesh>
      <mesh position={[-25, 3, -1]} castShadow receiveShadow>
        <boxGeometry args={[30, 6, 0.35]} />
        <meshStandardMaterial color="#8a8378" roughness={0.82} />
      </mesh>
      <mesh position={[-10, 3, -5]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 6, 8]} />
        <meshStandardMaterial color="#6d6861" roughness={0.84} />
      </mesh>
      <mesh position={[-39.8, 3, -5]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 6, 8]} />
        <meshStandardMaterial color="#6d6861" roughness={0.84} />
      </mesh>

      <mesh position={[-24, 0.02, -2.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.05, 48]} />
        <meshBasicMaterial color="#4fd1c5" transparent opacity={0.28} side={2} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function GroundedHub({ onEnterRoom }: { onEnterRoom?: (id: string) => void }) {
  return (
    <group>
      <hemisphereLight args={['#fff8f0', '#c8bfb4', 0.7]} />
      <directionalLight position={[5, 10, -3]} intensity={0.6} color="#fff8f0" castShadow />

      <Suspense fallback={<HubShellFallback />}>
        <HubShell />
      </Suspense>

      <Suspense fallback={<CorridorFallback />}>
        {onEnterRoom && <LeftWingCorridor onEnterRoom={onEnterRoom} />}
      </Suspense>
    </group>
  );
}
