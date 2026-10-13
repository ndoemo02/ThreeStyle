"use client";

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEntryStore } from '../../../stores/useEntryStore';
import {
  getDegradedLobbyQuality,
  createLobbyPerformanceSample,
  sampleLobbyPerformance,
  nextLobbyDpr,
  type LobbyQualityProfile,
} from './lobbyConfig';

export function LobbyPerformanceGovernor({
  quality,
  restoreDpr,
  onDegrade,
}: {
  quality: LobbyQualityProfile;
  restoreDpr: number;
  onDegrade: (quality: LobbyQualityProfile) => void;
}) {
  const setDpr = useThree(state => state.setDpr);
  const actualDpr = useThree(state => state.viewport.dpr);
  const adaptive = useRef({ dpr: quality.dpr, elapsed: 0, frames: 0, time: 0, lastChange: 0, lastMove: 0, position: new THREE.Vector3(), quaternion: new THREE.Quaternion() });
  const sampleRef = useRef(createLobbyPerformanceSample());
  const degradedRef = useRef(false);

  // Canvas re-applies its DPR range on resize; keep the selected lobby tier after rotation.
  useLayoutEffect(() => {
    if (actualDpr !== adaptive.current.dpr) setDpr(adaptive.current.dpr);
  }, [actualDpr, setDpr]);

  useEffect(() => {
    sampleRef.current = createLobbyPerformanceSample();
    degradedRef.current = quality.id.endsWith('-low');
    adaptive.current.dpr = Math.min(window.devicePixelRatio || 1, quality.dpr);
    setDpr(adaptive.current.dpr);
  }, [quality.id, quality.dpr, setDpr]);

  useEffect(() => () => setDpr(restoreDpr), [restoreDpr, setDpr]);

  useFrame(({ camera }, delta) => {
    const s = adaptive.current;
    const phase = useEntryStore.getState().phase;
    if (document.hidden || !['idle', 'complete'].includes(phase) || delta > 1) {
      s.elapsed = s.frames = s.time = s.lastChange = 0;
      sampleRef.current = createLobbyPerformanceSample();
      return;
    }
    s.time += delta;
    if (camera.position.distanceToSquared(s.position) > 0.00001 || camera.quaternion.angleTo(s.quaternion) > 0.001) s.lastMove = s.time;
    s.position.copy(camera.position); s.quaternion.copy(camera.quaternion);
    if (s.time >= 6 && s.time - s.lastChange >= 6) {
      s.elapsed += delta; s.frames++;
      if (s.elapsed >= 3) {
        const next = nextLobbyDpr(s.dpr, Math.min(window.devicePixelRatio || 1, 1.5), s.elapsed * 1000 / s.frames, s.time - s.lastMove < 1);
        s.elapsed = s.frames = 0;
        if (next !== s.dpr) { s.dpr = next; s.lastChange = s.time; setDpr(next); }
      }
    }
    if (degradedRef.current) return;
    const result = sampleLobbyPerformance(quality, sampleRef.current, delta, document.hidden);
    sampleRef.current = result.sample;
    if (result.degrade) {
      degradedRef.current = true;
      onDegrade(getDegradedLobbyQuality(quality));
    }
  });

  return null;
}
