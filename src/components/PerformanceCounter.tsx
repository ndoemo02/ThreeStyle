"use client";

import { useRef, useState, useEffect } from 'react';
import { Html } from '@react-three/drei';

const SAMPLE_WINDOW = 60;
const UPDATE_INTERVAL_MS = 1000; // only update React state 1×/sec

export function PerformanceCounter() {
  const samples = useRef<number[]>([]);
  const lastTime = useRef<number>(0);
  const lastUpdate = useRef<number>(0);
  const raf = useRef<number>(0);
  const [display, setDisplay] = useState({ fps: 0, frameMs: 0 });

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      const elapsed = now - lastTime.current;
      lastTime.current = now;

      if (elapsed > 0) {
        const instantFps = 1000 / elapsed;
        samples.current.push(instantFps);
        if (samples.current.length > SAMPLE_WINDOW) {
          samples.current.shift();
        }

        // Throttle React re-renders to 1×/sec
        if (now - lastUpdate.current >= UPDATE_INTERVAL_MS) {
          lastUpdate.current = now;
          const avgFps = samples.current.reduce((a, b) => a + b, 0) / samples.current.length;
          setDisplay({
            fps: Math.round(avgFps),
            frameMs: Math.round(elapsed * 10) / 10,
          });
        }
      }

      raf.current = requestAnimationFrame(tick);
    };

    lastTime.current = performance.now();
    lastUpdate.current = performance.now();
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const { fps, frameMs } = display;

  const fpsColor =
    fps >= 55 ? '#4ade80'
    : fps >= 30 ? '#facc15'
    : '#ef4444';

  return (
    <Html
      fullscreen
      style={{
        pointerEvents: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
      zIndexRange={[0, 0]}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        <span
          style={{
            fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
            fontSize: 22,
            fontWeight: 700,
            color: fpsColor,
            lineHeight: 1,
            textShadow: '0 0 8px rgba(0,0,0,0.7)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fps} <span style={{ fontSize: 10, fontWeight: 400, color: '#aaaaaa' }}>FPS</span>
        </span>
        <span
          style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10,
            color: '#888888',
            textShadow: '0 0 4px rgba(0,0,0,0.6)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {frameMs}ms
        </span>
      </div>
    </Html>
  );
}
