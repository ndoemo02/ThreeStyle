'use client';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEntryStore } from '../../stores/useEntryStore';
import { ENTRY, ENTRY_TIMING, entryEase, entryPhaseAfter, entryImageFraming } from '../../lib/entryTransition';

function setEntryLens(camera: THREE.Camera, width: number, height: number, offset: number) {
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov = ENTRY.fov;
    camera.setViewOffset(width, height, offset, 0, width, height);
  }
}

/** Same axis for the photographic close-up, physical doors and final lobby view. */
export function EntryCamera() {
  const { camera, size } = useThree();
  useFrame(() => {
    const state = useEntryStore.getState();
    if (state.phase === 'idle' || state.phase === 'complete' || state.phase === 'error') return;
    const elapsed = performance.now() - state.startedAt;
    const next = entryPhaseAfter(state.phase, elapsed, state.reducedMotion);
    const framing = entryImageFraming(size.width, size.height);
    const nearZ = ENTRY.z + 0.087 + framing.distance;
    const progress = state.phase === 'entering' ? entryEase(elapsed / ENTRY_TIMING.entering) : 0;
    camera.position.set(ENTRY.x, 2.325 + (2.05 - 2.325) * progress, nearZ + (6.2 - nearZ) * progress);
    camera.lookAt(ENTRY.x * (1 - progress), camera.position.y, -8);
    setEntryLens(camera, size.width, size.height, framing.viewOffsetX * (1 - progress));
    if (next === 'complete') {
      camera.position.set(ENTRY.x, 2.05, 6.2);
      camera.lookAt(0, 2.05, -8);
      if (camera instanceof THREE.PerspectiveCamera) camera.clearViewOffset();
    }
    if (next !== state.phase) state.setPhase(next);
  });
  return null;
}
