"use client";

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  getDegradedLobbyQuality,
  shouldDegradeLobbyQuality,
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
  const sampleElapsedRef = useRef(0);
  const frameCountRef = useRef(0);
  const belowThresholdMsRef = useRef(0);
  const degradedRef = useRef(quality.id.endsWith('-low'));

  useEffect(() => {
    setDpr(quality.dpr);
  }, [quality.dpr, setDpr]);

  useEffect(() => () => setDpr(restoreDpr), [restoreDpr, setDpr]);

  useFrame((_, delta) => {
    if (degradedRef.current) return;
    sampleElapsedRef.current += delta;
    frameCountRef.current += 1;
    if (sampleElapsedRef.current < 0.5) return;

    const elapsedSeconds = sampleElapsedRef.current;
    const averageFps = frameCountRef.current / elapsedSeconds;
    const sampleMs = elapsedSeconds * 1_000;
    const floor = quality.id === 'mobile' ? 25 : 50;
    belowThresholdMsRef.current = averageFps < floor
      ? belowThresholdMsRef.current + sampleMs
      : 0;
    sampleElapsedRef.current = 0;
    frameCountRef.current = 0;

    if (shouldDegradeLobbyQuality(quality, averageFps, belowThresholdMsRef.current)) {
      degradedRef.current = true;
      onDegrade(getDegradedLobbyQuality(quality));
    }
  });

  return null;
}
