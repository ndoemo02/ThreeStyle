"use client";

import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useSceneInteraction } from '../../systems/useSceneInteraction';
import { isInteractionTap } from '../../systems/sceneInteractionPolicy';
import { Html } from '@react-three/drei';

interface RoomDoorProps {
  position: [number, number, number];
  rotation: [number, number, number];
  label: string;
  status: 'active' | 'locked' | 'offline';
  userCount?: number;
  onEnter: () => void;
  renderGeometry?: boolean;
}

const STATUS_COLORS = {
  active: '#d5a06b',
  locked: '#8d5548',
  offline: '#514b46',
} as const;

export function RoomDoor({
  position,
  rotation,
  label,
  status,
  userCount,
  onEnter,
  renderGeometry = true,
}: RoomDoorProps) {
  const hitRef = useRef<THREE.Mesh>(null);
  const touchStart = useRef<{ pointerId: number; clientX: number; clientY: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const isActive = status === 'active';
  const statusColor = STATUS_COLORS[status];
  const interaction = useSceneInteraction({
    object: hitRef,
    maxDistance: 4.5,
    canInteract: () => isActive,
    activate: () => { if (!isActive) return false; onEnter(); return true; },
  });

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={(event) => {
        if (event.pointerType === 'touch') {
          touchStart.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY };
        }
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== 'touch') return;
        const start = touchStart.current;
        touchStart.current = null;
        if (!isInteractionTap(start, event)) return;
        event.stopPropagation();
        interaction.activate(event.clientX, event.clientY);
      }}
      onPointerCancel={() => { touchStart.current = null; }}
      onClick={(event) => {
        event.stopPropagation();
        interaction.activate(event.clientX, event.clientY);
      }}
    >
      {renderGeometry ? (
        <group>
          <mesh position={[0, 2.1, 0]}>
            <boxGeometry args={[2.5, 4.2, 0.35]} />
            <meshStandardMaterial color="#171513" roughness={0.74} metalness={0.22} />
          </mesh>
          <mesh position={[0, 2.1, 0.2]}>
            <boxGeometry args={[1.92, 3.82, 0.08]} />
            <meshStandardMaterial color="#0d0c0b" roughness={0.82} metalness={0.08} />
          </mesh>
        </group>
      ) : null}

      <mesh ref={hitRef} position={[0, 2.1, 0.28]}>
        <planeGeometry args={[2.5, 4.2]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>

      {(interaction.isTargeted || (!isActive && hovered)) ? <Html transform occlude position={[0, 2.15, 0.38]} distanceFactor={3.2} pointerEvents="none">
        <div
          style={{
            width: '178px',
            padding: '12px 14px',
            border: `1px solid ${statusColor}99`,
            borderRadius: '4px',
            background: 'rgba(11,10,9,0.88)',
            boxShadow: `0 12px 28px rgba(0,0,0,.48), 0 0 18px ${statusColor}22`,
            color: '#eee5db',
            fontFamily: 'monospace',
            textAlign: 'center',
            letterSpacing: '.16em',
            opacity: 1,
            transition: 'all 160ms ease',
          }}
        >
          <div style={{ color: statusColor, fontSize: '8px', marginBottom: '5px' }}>
            {status === 'active' ? 'AVAILABLE' : status.toUpperCase()}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700 }}>{label}</div>
          <div style={{ color: '#b9ada2', fontSize: '8px', marginTop: '8px', letterSpacing: '.12em' }}>
            {isActive ? `[E] ENTER · ${userCount ?? 0} USR` : 'ACCESS UNAVAILABLE'}
          </div>
        </div>
      </Html> : null}
    </group>
  );
}
