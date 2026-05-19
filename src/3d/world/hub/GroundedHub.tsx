"use client";

import { Suspense } from 'react';
import { Html } from '@react-three/drei';
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
      <pointLight position={[-24, 4.5, -5]} intensity={3.2} distance={16} color="#ffd7a1" />

      <mesh position={[-25, -0.055, -5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#2c2925" roughness={0.42} metalness={0.08} />
      </mesh>
      <mesh position={[-25, 6, -5]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#15110d" roughness={0.76} metalness={0.04} />
      </mesh>
      <mesh position={[-25, 3, -9]} castShadow receiveShadow>
        <boxGeometry args={[30, 6, 0.35]} />
        <meshStandardMaterial color="#8b7a66" roughness={0.86} />
      </mesh>
      <mesh position={[-25, 3, -1]} castShadow receiveShadow>
        <boxGeometry args={[30, 6, 0.35]} />
        <meshStandardMaterial color="#8b7a66" roughness={0.86} />
      </mesh>
      <mesh position={[-10, 3, -5]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 6, 8]} />
        <meshStandardMaterial color="#3a332b" roughness={0.9} />
      </mesh>
      <mesh position={[-39.8, 3, -5]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 6, 8]} />
        <meshStandardMaterial color="#3a332b" roughness={0.9} />
      </mesh>

      {[-2.55, 2.55].map((z) => (
        <mesh key={`fallback-led-${z}`} position={[-25, 5.82, -5 + z]}>
          <boxGeometry args={[28, 0.035, 0.05]} />
          <meshBasicMaterial color="#ffd7a1" toneMapped={false} />
        </mesh>
      ))}
      {[...Array(28)].map((_, i) => (
        <mesh key={`fallback-slat-${i}`} position={[-38.5 + i * 1.05, 3, -1.22]}>
          <boxGeometry args={[0.045, 5.3, 0.055]} />
          <meshStandardMaterial color="#5a3821" roughness={0.62} metalness={0.04} />
        </mesh>
      ))}

      <mesh position={[-24, 0.02, -2.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.05, 48]} />
        <meshBasicMaterial color="#4fd1c5" transparent opacity={0.28} side={2} depthWrite={false} />
      </mesh>

      {[
        { x: -19, z: -1.12, color: '#4fd1c5' },
        { x: -14, z: -8.88, color: '#ff3366' },
        { x: -29, z: -8.88, color: '#ff3366' },
      ].map((door) => (
        <group key={`${door.x}-${door.z}`} position={[door.x, 0, door.z]}>
          <mesh position={[0, 2.1, 0]}>
            <boxGeometry args={[2.3, 4.0, 0.18]} />
            <meshStandardMaterial color="#171717" roughness={0.7} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0.08, door.z > -5 ? -0.12 : 0.12]}>
            <boxGeometry args={[1.8, 0.04, 0.08]} />
            <meshBasicMaterial color={door.color} />
          </mesh>
        </group>
      ))}

      <Html transform occlude={false} position={[-19, 3.9, -1.18]} distanceFactor={4}>
        <div className="rounded border border-teal-300/40 bg-black/70 px-4 py-1 font-mono text-[10px] font-bold tracking-[0.28em] text-teal-100">
          LOBBY
        </div>
      </Html>
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
