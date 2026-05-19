"use client";

import { Suspense } from 'react';
import { Html, RoundedBox } from '@react-three/drei';
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
      <RoundedBox args={[30, 6, 0.35]} radius={0.04} smoothness={6} position={[-25, 3, -9]} castShadow receiveShadow>
        <meshStandardMaterial color="#938471" roughness={0.88} />
      </RoundedBox>
      <RoundedBox args={[30, 6, 0.35]} radius={0.04} smoothness={6} position={[-25, 3, -1]} castShadow receiveShadow>
        <meshStandardMaterial color="#938471" roughness={0.88} />
      </RoundedBox>
      <RoundedBox args={[0.35, 6, 8]} radius={0.04} smoothness={6} position={[-10, 3, -5]} castShadow receiveShadow>
        <meshStandardMaterial color="#4a4035" roughness={0.92} />
      </RoundedBox>
      <RoundedBox args={[0.35, 6, 8]} radius={0.04} smoothness={6} position={[-39.8, 3, -5]} castShadow receiveShadow>
        <meshStandardMaterial color="#4a4035" roughness={0.92} />
      </RoundedBox>

      {[-2.55, 2.55].map((z) => (
        <RoundedBox key={`fallback-led-${z}`} args={[28, 0.035, 0.045]} radius={0.018} smoothness={5} position={[-25, 5.82, -5 + z]}>
          <meshBasicMaterial color="#ffd7a1" toneMapped={false} />
        </RoundedBox>
      ))}
      {[-34, -25, -16].map((x) => (
        <group key={`fallback-panel-${x}`} position={[x, 0, -1.22]}>
          <RoundedBox args={[5.3, 4.7, 0.08]} radius={0.045} smoothness={6} position={[0, 2.75, 0]}>
            <meshStandardMaterial color="#4a4035" roughness={0.92} />
          </RoundedBox>
          {[-1.8, -0.9, 0, 0.9, 1.8].map((offset) => (
            <RoundedBox key={`fallback-panel-slat-${offset}`} args={[0.16, 4.15, 0.12]} radius={0.04} smoothness={6} position={[offset, 2.75, 0.08]}>
              <meshStandardMaterial color="#68472d" roughness={0.68} metalness={0.02} />
            </RoundedBox>
          ))}
        </group>
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
