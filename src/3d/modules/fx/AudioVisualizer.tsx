'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { useHudStore } from '@/stores/useHudStore';
import { useAudioStore } from '@/stores/useAudioStore';

// ── Room world-space constants ────────────────────────────────────────────
const ROOM = {
  backZ: -6,
  frontZ: 7,
  leftX: -7,
  rightX: 7,
  ceilingY: 5.1,
};

// StudioDisplayWall screen (bezel inner edge in local space, then scaled)
const SCREEN = {
  posX: 3.6,
  posY: 3.0,
  posZ: -5.56,       // -5.6 + 0.025 * 1.55 (bezel Z offset)
  scale: 1.55,
  halfW: 1.68,        // inner bezel edge half-width (local)
  halfH: 0.92,        // inner bezel edge half-height (local)
};

const BLOOM_LAYER = 1;

// ── Contour generators ────────────────────────────────────────────────────

function createCeilingContour(): number[] {
  const { leftX, rightX, backZ, frontZ, ceilingY } = ROOM;
  return [
    leftX,  ceilingY, backZ,
    rightX, ceilingY, backZ,
    rightX, ceilingY, frontZ,
    leftX,  ceilingY, frontZ,
    leftX,  ceilingY, backZ,
  ];
}

function createScreenContour(): number[] {
  const { posX, posY, posZ, scale, halfW, halfH } = SCREEN;
  const w = halfW * scale;
  const h = halfH * scale;
  return [
    posX - w, posY + h, posZ,
    posX + w, posY + h, posZ,
    posX + w, posY - h, posZ,
    posX - w, posY - h, posZ,
    posX - w, posY + h, posZ,
  ];
}

function createLine(
  points: number[],
  resolution: THREE.Vector2,
): { line: Line2; mat: LineMaterial } {
  const geo = new LineGeometry();
  geo.setPositions(points);

  const mat = new LineMaterial({
    color: 0x1a0a3e,
    linewidth: 0.5,
    resolution,
    worldUnits: false,
    transparent: true,
    opacity: 0.85,
    depthTest: true,
    depthWrite: true,
    blending: THREE.NormalBlending,
  });

  const line = new Line2(geo, mat);
  line.layers.set(BLOOM_LAYER);
  line.renderOrder = 1;
  line.frustumCulled = false;

  return { line, mat };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AudioVisualizer() {
  const { size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<Array<{ mat: LineMaterial }>>([]);
  const audioRef = useRef<THREE.Audio | null>(null);
  const listenerRef = useRef<THREE.AudioListener | null>(null);
  const connectedRef = useRef(false);

  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  );

  const storeAnalyserNode = useAudioStore(s => s.analyserNode);
  const storeConnected = useAudioStore(s => s.connected);
  const setAnalyserNode = useAudioStore(s => s.setAnalyserNode);
  const setConnected = useAudioStore(s => s.setConnected);

  // ── Init: audio context + line geometry ───────────────────────────────
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Audio listener + source
    const listener = new THREE.AudioListener();
    listenerRef.current = listener;

    const audio = new THREE.Audio(listener);
    audioRef.current = audio;

    // Try immediate connection to master video element
    const tryConnect = () => {
      if (connectedRef.current || storeConnected) return;
      const el = useHudStore.getState().masterVideoRef;
      if (el && el.readyState >= 1) {
        try {
          audio.setMediaElementSource(el);
          const analyser = new THREE.AudioAnalyser(audio, 64);
          connectedRef.current = true;
          // Share the raw AnalyserNode with all audio-reactive components
          setAnalyserNode(analyser.analyser);
          setConnected(true);
        } catch {
          // media element already claimed — ignore
        }
      }
    };

    tryConnect();

    // Poll for late-arriving video element
    const poll = setInterval(tryConnect, 4000);

    // Build contour lines
    const contours = [
      createCeilingContour(),
      createScreenContour(),
    ];

    const refs: Array<{ mat: LineMaterial }> = [];

    contours.forEach((points) => {
      const { line, mat } = createLine(points, resolution);
      group.add(line);
      refs.push({ mat });
    });

    linesRef.current = refs;

    return () => {
      clearInterval(poll);
      connectedRef.current = false;
      refs.forEach(({ mat }) => mat.dispose());
      // Dispose geometries from group children
      while (group.children.length > 0) {
        const child = group.children[0];
        (child as THREE.Mesh).geometry?.dispose();
        group.remove(child);
      }
      audioRef.current?.stop();
      audioRef.current = null;
      listenerRef.current?.removeFromParent();
      listenerRef.current = null;
      // Only clear shared store if we were the ones who set it
      if (storeConnected) {
        setAnalyserNode(null);
        setConnected(false);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keep resolution synced ─────────────────────────────────────────────
  useEffect(() => {
    linesRef.current.forEach(({ mat }) => {
      mat.resolution.copy(resolution);
    });
  }, [resolution]);

  // ── Audio-reactive animation ───────────────────────────────────────────
  useFrame(() => {
    const analyser = storeAnalyserNode;

    if (!analyser) {
      // Idle: minimal lines, deep blue
      for (const { mat } of linesRef.current) {
        mat.linewidth = 0.5;
        mat.color.setRGB(0.102, 0.039, 0.243); // #1a0a3e
      }
      return;
    }

    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    analyser.getByteFrequencyData(data);

    // Bass — bins 0..3 (≈ 0–170 Hz at 48 kHz / 64 FFT)
    let bassSum = 0;
    for (let i = 0; i < 4; i++) bassSum += data[i];
    const bassNorm = bassSum / 4 / 255;

    // Mids — bins 4..19
    let midsSum = 0;
    const midEnd = Math.min(20, data.length);
    for (let i = 4; i < midEnd; i++) midsSum += data[i];
    const midsNorm = midsSum / (midEnd - 4) / 255;

    // Linewidth 0.5 → 5.0 px
    const lw = 0.5 + bassNorm * 4.5;

    // Deep blue #1a0a3e → neon purple #c840ff
    const r = 0.102 + midsNorm * 0.682;   // 26 → 200
    const g = 0.039 + midsNorm * 0.212;   // 10 → 64
    const b = 0.243 + midsNorm * 0.757;   // 62 → 255

    for (const { mat } of linesRef.current) {
      mat.linewidth = lw;
      mat.color.setRGB(r, g, b);
    }
  });

  return <group ref={groupRef} />;
}
