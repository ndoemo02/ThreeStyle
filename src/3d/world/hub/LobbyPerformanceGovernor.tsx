"use client";

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  getDegradedLobbyQuality,
  createLobbyPerformanceSample,
  sampleLobbyPerformance,
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
  const sampleRef = useRef(createLobbyPerformanceSample());
  const degradedRef = useRef(false);

  // Canvas re-applies its DPR range on resize; keep the selected lobby tier after rotation.
  useLayoutEffect(() => {
    if (actualDpr !== quality.dpr) setDpr(quality.dpr);
  }, [quality.dpr, actualDpr, setDpr]);

  useEffect(() => {
    sampleRef.current = createLobbyPerformanceSample();
    degradedRef.current = quality.id.endsWith('-low');
  }, [quality.id]);

  useEffect(() => () => setDpr(restoreDpr), [restoreDpr, setDpr]);

  useFrame((_, delta) => {
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
