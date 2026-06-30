"use client";

import { useEffect, useState } from 'react';
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
  const [hovered, setHovered] = useState(false);
  const isActive = status === 'active';
  const statusColor = STATUS_COLORS[status];

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (hovered && isActive && !event.repeat && (event.code === 'KeyE' || event.key === 'e')) {
        event.preventDefault();
        onEnter();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hovered, isActive, onEnter]);

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(event) => {
        if (!isActive) return;
        event.stopPropagation();
        onEnter();
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

      <mesh position={[0, 2.1, 0.28]}>
        <planeGeometry args={[2.5, 4.2]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>

      {hovered ? <Html transform occlude position={[0, 2.15, 0.38]} distanceFactor={3.2} pointerEvents="none">
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
