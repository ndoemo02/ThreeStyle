'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
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
  posZ: -5.56,
  scale: 1.55,
  halfW: 1.68,
  halfH: 0.92,
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

  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size.width, size.height],
  );

  const analyserNode = useAudioStore(s => s.analyserNode);

  // ── Init: build contour lines ──────────────────────────────────────────
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

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
      refs.forEach(({ mat }) => mat.dispose());
      while (group.children.length > 0) {
        const child = group.children[0];
        (child as THREE.Mesh).geometry?.dispose();
        group.remove(child);
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
  useFrame(({ invalidate }) => {
    if (!analyserNode) {
      for (const { mat } of linesRef.current) {
        mat.linewidth = 0.5;
        mat.color.setRGB(0.102, 0.039, 0.243);
      }
      return;
    }

    const bins = analyserNode.frequencyBinCount;
    const data = new Uint8Array(bins);
    analyserNode.getByteFrequencyData(data);

    let bassSum = 0;
    for (let i = 0; i < 4; i++) bassSum += data[i];
    const bassNorm = bassSum / 4 / 255;

    let midsSum = 0;
    const midEnd = Math.min(20, data.length);
    for (let i = 4; i < midEnd; i++) midsSum += data[i];
    const midsNorm = midsSum / (midEnd - 4) / 255;

    const lw = 0.5 + bassNorm * 4.5;

    const r = 0.102 + midsNorm * 0.682;
    const g = 0.039 + midsNorm * 0.212;
    const b = 0.243 + midsNorm * 0.757;

    for (const { mat } of linesRef.current) {
      mat.linewidth = lw;
      mat.color.setRGB(r, g, b);
    }

    // Request next frame only when audio is active
    invalidate();
  });

  return <group ref={groupRef} />;
}
