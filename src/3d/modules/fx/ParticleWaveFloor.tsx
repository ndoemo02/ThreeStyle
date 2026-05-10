'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../stores/useAudioStore';

/**
 * Audio-reactive particle wave floor — thousands of particles reacting to bass.
 * Optimized: single BufferGeometry, no per-particle objects, GPU-driven animation.
 */
export function ParticleWaveFloor({ count = 8000, size = 20 }: { count?: number; size?: number }) {
  const meshRef = useRef<THREE.Points>(null);
  const analyserNode = useAudioStore(s => s.analyserNode);
  const dataArrayRef = useRef(new Uint8Array(0));

  const { positions, basePositions } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * size;
      const z = (Math.random() - 0.5) * size;
      const y = 0.05; // Just above floor
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;
    }
    return { positions, basePositions };
  }, [count, size]);

  const colorArray = useMemo(() => {
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Purple-blue palette
      colors[i * 3] = 0.4 + Math.random() * 0.3;     // R
      colors[i * 3 + 1] = 0.1 + Math.random() * 0.2; // G
      colors[i * 3 + 2] = 0.7 + Math.random() * 0.3; // B
    }
    return colors;
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const geometry = meshRef.current.geometry;
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;

    // Early return: no audio = gentle idle wave
    if (!analyserNode || dataArrayRef.current.length === 0) {
      const time = state.clock.elapsedTime;
      for (let i = 0; i < count; i++) {
        const bx = basePositions[i * 3];
        const bz = basePositions[i * 3 + 2];
        // Gentle sine wave idle animation
        const wave = Math.sin(bx * 0.3 + time * 0.5) * Math.cos(bz * 0.3 + time * 0.3) * 0.05;
        posAttr.array[i * 3 + 1] = basePositions[i * 3 + 1] + wave;
      }
      posAttr.needsUpdate = true;
      return;
    }

    // Ensure data array
    if (dataArrayRef.current.length !== analyserNode.frequencyBinCount) {
      dataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount);
    }
    analyserNode.getByteFrequencyData(dataArrayRef.current);

    // Bass energy (bins 0-4)
    let bassSum = 0;
    for (let i = 0; i < 4; i++) bassSum += dataArrayRef.current[i];
    const bassEnergy = bassSum / 4 / 255;

    // Mid energy (bins 4-16)
    let midSum = 0;
    for (let i = 4; i < 16; i++) midSum += dataArrayRef.current[i];
    const midEnergy = midSum / 12 / 255;

    const time = state.clock.elapsedTime;
    const bassWave = bassEnergy * 1.5; // Amplitude from bass
    const midWave = midEnergy * 0.8;   // Amplitude from mids

    for (let i = 0; i < count; i++) {
      const bx = basePositions[i * 3];
      const bz = basePositions[i * 3 + 2];

      // Wave pattern: combination of sine waves driven by audio
      const dist = Math.sqrt(bx * bx + bz * bz);
      const wave1 = Math.sin(dist * 0.2 - time * 2) * bassWave;
      const wave2 = Math.sin(bx * 0.4 + time * 1.5) * midWave * 0.5;
      const wave3 = Math.cos(bz * 0.3 + time * 1.2) * midWave * 0.3;

      posAttr.array[i * 3 + 1] = basePositions[i * 3 + 1] + wave1 + wave2 + wave3;
    }
    posAttr.needsUpdate = true;

    // Update material opacity based on audio
    const mat = meshRef.current.material as THREE.PointsMaterial;
    mat.opacity = 0.3 + bassEnergy * 0.7;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colorArray}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
