"use client";

import { Suspense } from 'react';
import { LeftWingCorridor } from '../corridors/LeftWingCorridor';
import { HubShell } from './HubShell';

export function GroundedHub({ onEnterRoom }: { onEnterRoom?: (id: string) => void }) {
  return (
    <group>
      <hemisphereLight args={['#fff8f0', '#c8bfb4', 0.7]} />
      <directionalLight position={[5, 10, -3]} intensity={0.6} color="#fff8f0" castShadow />

      <Suspense fallback={null}>
        <HubShell />
        {onEnterRoom && <LeftWingCorridor onEnterRoom={onEnterRoom} />}
      </Suspense>
    </group>
  );
}
