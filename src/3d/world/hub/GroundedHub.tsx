"use client";

import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { LeftWingCorridor } from '../corridors/LeftWingCorridor';
import { HubShell } from './HubShell';

export function GroundedHub({ onEnterRoom }: { onEnterRoom?: (id: string) => void }) {
  const spotLightTarget = useMemo(() => new THREE.Object3D(), []);

  return (
    <group>
      <hemisphereLight args={['#ffe6cc', '#1c130d', 0.72]} />
      <directionalLight position={[0, 10, -5]} intensity={0.72} color="#fff2e5" castShadow />

      <primitive object={spotLightTarget} position={[0, 1.2, -8.8]} />

      <spotLight
        position={[0, 7, -8]}
        target={spotLightTarget}
        intensity={28}
        angle={0.52}
        penumbra={0.95}
        color="#f3a05d"
        distance={18}
        castShadow
      />

      <Suspense fallback={null}>
        <HubShell />
        {onEnterRoom && <LeftWingCorridor onEnterRoom={onEnterRoom} />}
      </Suspense>
    </group>
  );
}
