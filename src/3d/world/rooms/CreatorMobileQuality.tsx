'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { nextCreatorDpr } from '../../../lib/creatorQuality';

export function CreatorMobileQuality({ ready }: { ready: boolean }) {
  const { setDpr } = useThree();
  const sample = useRef({ elapsed: 0, frames: 0, time: 0, lastChange: 0, lastMove: 0, dpr: 1, position: new THREE.Vector3(), quaternion: new THREE.Quaternion() });
  useEffect(() => {
    const s = sample.current;
    s.elapsed = s.frames = s.time = s.lastChange = 0;
    s.dpr = 1;
    setDpr(Math.min(window.devicePixelRatio || 1, 1));
    return () => setDpr(1);
  }, [ready, setDpr]);
  useFrame(({ camera }, delta) => {
    const s = sample.current;
    if (!ready || document.hidden || delta > 1) { s.elapsed = s.frames = 0; return; }
    s.time += delta;
    if (camera.position.distanceToSquared(s.position) > 0.00001 || camera.quaternion.angleTo(s.quaternion) > 0.001) s.lastMove = s.time;
    s.position.copy(camera.position); s.quaternion.copy(camera.quaternion);
    // Model upload/shader warm-up does not decide the sustainable quality tier.
    if (s.time < 6 || s.time - s.lastChange < 6) return;
    s.elapsed += delta; s.frames++;
    if (s.elapsed < 3) return;
    const max = Math.min(window.devicePixelRatio || 1, 1.5);
    const next = nextCreatorDpr(s.dpr, max, s.elapsed * 1000 / s.frames, s.time - s.lastMove < 1);
    s.elapsed = s.frames = 0;
    if (next !== s.dpr) { s.dpr = next; s.lastChange = s.time; setDpr(next); }
  });
  return null;
}
