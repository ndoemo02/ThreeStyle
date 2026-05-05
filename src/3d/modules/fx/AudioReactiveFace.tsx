'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { KTX2Loader } from 'three-stdlib';
import * as THREE from 'three';
import { useAudioStore } from '@/stores/useAudioStore';

const BLOOM_LAYER = 1;

// ── Smoothing state ───────────────────────────────────────────────────────

interface MorphState {
  jawOpen: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  browDownLeft: number;
  browDownRight: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function lerp(current: number, target: number, speed: number): number {
  return current + (target - current) * speed;
}

function avgBins(data: Uint8Array, start: number, end: number): number {
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i];
  return sum / (end - start) / 255;
}

const FACE_MODEL_PATH = '/models/facecap.glb';

// ── Component ─────────────────────────────────────────────────────────────

export default function AudioReactiveFace() {
  const groupRef = useRef<THREE.Group>(null);
  const morphRef = useRef<MorphState>({
    jawOpen: 0, eyeBlinkLeft: 0, eyeBlinkRight: 0,
    browDownLeft: 0, browDownRight: 0,
  });
  const bloomMeshesRef = useRef<THREE.Mesh[]>([]);
  const headRef = useRef<THREE.Mesh | null>(null);
  const ktx2Ref = useRef<KTX2Loader | null>(null);

  const analyserNode = useAudioStore(s => s.analyserNode);
  const gl = useThree(s => s.gl);

  const { scene } = useGLTF(FACE_MODEL_PATH, true, false, (loader) => {
    if (!ktx2Ref.current) {
      ktx2Ref.current = new KTX2Loader();
      ktx2Ref.current.setTranscoderPath('https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/basis/');
      ktx2Ref.current.detectSupport(gl);
    }
    loader.setKTX2Loader(ktx2Ref.current);
  });
  const faceScene = useMemo(() => scene.clone(), [scene]);

  // ── Init: material setup + morph target discovery ──────────────────────
  useEffect(() => {
    const headMeshName = 'mesh_2';

    faceScene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        // Find head mesh for morph targets
        if (node.name === headMeshName && node.morphTargetDictionary) {
          headRef.current = node;
          const dict = node.morphTargetDictionary;
          console.log('[AudioReactiveFace] Morph targets:', Object.keys(dict).join(', '));
          console.log('[AudioReactiveFace] Morph dictionary:', dict);
        }

        // Identify bloom-worthy meshes (eyes, mouth interior)
        const lower = node.name.toLowerCase();
        const isBloomCandidate =
          lower.includes('eye') ||
          lower.includes('mouth') ||
          lower.includes('teeth') ||
          lower.includes('tongue') ||
          lower.includes('lacrimal');

        if (isBloomCandidate) {
          const mat = node.material as THREE.MeshStandardMaterial;
          if (mat && 'emissive' in mat) {
            const clone = mat.clone();
            clone.emissive = new THREE.Color('#000000');
            clone.emissiveIntensity = 0;
            node.material = clone;
            node.layers.enable(BLOOM_LAYER);
            bloomMeshesRef.current.push(node);
          }
        }
      }
    });

    return () => {
      bloomMeshesRef.current = [];
      headRef.current = null;
    };
  }, [faceScene]);

  // ── Animation ──────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    if (!analyserNode) {
      // Idle: slowly return morphs to zero
      const m = morphRef.current;
      m.jawOpen = lerp(m.jawOpen, 0, 3 * dt);
      m.eyeBlinkLeft = lerp(m.eyeBlinkLeft, 0, 4 * dt);
      m.eyeBlinkRight = lerp(m.eyeBlinkRight, 0, 4 * dt);
      m.browDownLeft = lerp(m.browDownLeft, 0, 3 * dt);
      m.browDownRight = lerp(m.browDownRight, 0, 3 * dt);
      applyMorphs();
      applyEmissive(0, 0);
      return;
    }

    const bins = analyserNode.frequencyBinCount;
    const data = new Uint8Array(bins);
    analyserNode.getByteFrequencyData(data);

    // Bass bins 0-3 → jawOpen
    const bassNorm = avgBins(data, 0, 4);

    // Treble bins 16-31 → eye blinks + brows
    const trebleNorm = avgBins(data, 16, Math.min(32, bins));

    // Mid-high bins 8-15 → eyebrow movement (secondary)
    const midHighNorm = avgBins(data, 8, Math.min(16, bins));

    // Target values driven by audio
    const m = morphRef.current;
    const targetJaw = Math.max(bassNorm * 1.2, m.jawOpen * 0.6);
    const targetBlink = trebleNorm > 0.35 ? trebleNorm : 0;
    const targetBrow = midHighNorm * 0.7;

    // Smooth lerp toward targets
    const jawSpeed = targetJaw > m.jawOpen ? 6.0 : 2.5;
    m.jawOpen = lerp(m.jawOpen, targetJaw, jawSpeed * dt);
    m.eyeBlinkLeft = lerp(m.eyeBlinkLeft, targetBlink, 8 * dt);
    m.eyeBlinkRight = lerp(m.eyeBlinkRight, targetBlink, 8 * dt);
    m.browDownLeft = lerp(m.browDownLeft, targetBrow, 5 * dt);
    m.browDownRight = lerp(m.browDownRight, targetBrow, 5 * dt);

    applyMorphs();

    // Emissive bloom: mouth/eyes glow proportional to audio
    applyEmissive(bassNorm, trebleNorm);
  });

  function applyMorphs() {
    const head = headRef.current;
    if (!head?.morphTargetDictionary || !head.morphTargetInfluences) return;

    const dict = head.morphTargetDictionary;
    const inf = head.morphTargetInfluences;
    const m = morphRef.current;

    const setMorph = (name: string, value: number) => {
      const idx = dict[name];
      if (idx !== undefined) inf[idx] = value;
    };

    setMorph('jawOpen', m.jawOpen);
    setMorph('eyeBlinkLeft', m.eyeBlinkLeft);
    setMorph('eyeBlinkRight', m.eyeBlinkRight);
    setMorph('browDownLeft', m.browDownLeft);
    setMorph('browDownRight', m.browDownRight);
  }

  function applyEmissive(bassNorm: number, trebleNorm: number) {
    const mouthGlow = bassNorm * 2.5;
    const eyeGlow = trebleNorm * 1.8;

    for (const mesh of bloomMeshesRef.current) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat || !('emissive' in mat)) continue;

      const lower = mesh.name.toLowerCase();
      const isEye = lower.includes('eye') || lower.includes('lacrimal');
      const isMouth = lower.includes('mouth') || lower.includes('teeth') || lower.includes('tongue');

      const intensity = isEye ? eyeGlow : isMouth ? mouthGlow : 0;

      mat.emissiveIntensity = intensity;
      if (intensity > 0.05) {
        mat.emissive.set(isEye ? '#80c8ff' : '#c840ff');
      } else {
        mat.emissive.set('#000000');
      }
    }
  }

  return (
    <group ref={groupRef} scale={0.45}>
      <primitive object={faceScene} />
    </group>
  );
}
