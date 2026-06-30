"use client";

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DistanceCulledModelProps {
  children: React.ReactNode;
  maxDistance?: number;
}

/**
 * Wrapper that hides children when the camera is farther than maxDistance.
 * Uses world position so it works correctly inside nested/Leva-controlled groups.
 *
 * Two-tier culling with Three.js frustum (default):
 *   - Frustum: skip if behind camera
 *   - Distance: skip if too far to matter
 */
export function DistanceCulledModel({ children, maxDistance = 14 }: DistanceCulledModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const worldPos = useRef(new THREE.Vector3());

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    groupRef.current.getWorldPosition(worldPos.current);
    const dist = worldPos.current.distanceTo(camera.position);
    const shouldShow = dist < maxDistance;
    if (groupRef.current.visible !== shouldShow) {
      groupRef.current.visible = shouldShow;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
