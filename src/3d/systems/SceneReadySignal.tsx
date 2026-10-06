'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/** Mounted inside the architecture's Suspense; signal after its first rendered frame. */
export function SceneReadySignal({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current === 2) return;
    frames.current += 1;
    if (frames.current === 2) onReady?.();
  });
  return null;
}
