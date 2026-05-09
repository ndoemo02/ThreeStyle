'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { KTX2Loader } from 'three-stdlib';
import * as THREE from 'three';
import { useAudioStore } from '@/stores/useAudioStore';

// ══════════════════════════════════════════════════════════════════════════
// PRELOAD HEAVY MODELS
// ══════════════════════════════════════════════════════════════════════════
// NOTE: facecap.glb uses KTX2 textures — preload with KTX2Loader is deferred
// to the component where we have access to gl (WebGLRenderer).
// See AudioReactiveFace component below for the actual preload logic.
const FACE_MODEL_PATH = '/models/optimized/facecap.glb';

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
  const morphIndexRef = useRef<{ jaw: number; blinkL: number; blinkR: number; browL: number; browR: number } | null>(null);
  const bassAvgRef = useRef(0); // rolling average for onset detection

  // Analyser z HUD store (muzyka z laptopa)
  const hudAnalyser = useAudioStore(s => s.analyserNode);

  // Mikrofon jako fallback — twarz śriewa do muzyki z otoczenia
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micReadyRef = useRef(false);
  const debugFrameRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function startMic() {
      if (micReadyRef.current || cancelled) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        // Tworzy AudioContext W gescie uzytkownika — gwarantuje stan 'running'
        const ctx = new AudioContext();
        await ctx.resume();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512; // większe okno = lepsze wykrywanie melodii
        analyser.smoothingTimeConstant = 0.7;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        micCtxRef.current = ctx;
        micAnalyserRef.current = analyser;
        micReadyRef.current = true;
        console.info('[AudioReactiveFace] ✅ Mic connected, ctx.state:', ctx.state);
      } catch (err) {
        console.info('[AudioReactiveFace] Mic unavailable:', err);
      }
    }

    // Odrocz do pierwszego gestu użytkownika (klik = pointer lock, klawisz = ruch)
    function onGesture() {
      void startMic();
    }
    window.addEventListener('click', onGesture, { once: true });
    window.addEventListener('keydown', onGesture, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('click', onGesture);
      window.removeEventListener('keydown', onGesture);
      stream?.getTracks().forEach(t => t.stop());
      micCtxRef.current?.close();
      micCtxRef.current = null;
      micAnalyserRef.current = null;
      micReadyRef.current = false;
    };
  }, []);

  // analyserNode jest odczytywany w useFrame (nie tutaj!) bo ref nie triggeruje re-renderu

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
    let headFound = false;

    faceScene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        // Find head mesh for morph targets — first mesh with morphTargetDictionary wins
        if (!headFound && node.morphTargetDictionary && Object.keys(node.morphTargetDictionary).length > 0) {
          headRef.current = node;
          headFound = true;
          // Zero out all morph target influences to start from neutral pose
          if (node.morphTargetInfluences) {
            node.morphTargetInfluences.fill(0);
          }
          console.log('[AudioReactiveFace] Head mesh:', node.name || '(unnamed)');
          console.log('[AudioReactiveFace] Morph targets:', Object.keys(node.morphTargetDictionary).join(', '));
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

    if (!headFound) {
      console.warn('[AudioReactiveFace] No mesh with morphTargetDictionary found in facecap.glb');
    }

    return () => {
      bloomMeshesRef.current = [];
      headRef.current = null;
      morphIndexRef.current = null;
    };
  }, [faceScene]);

  // ── Animation ──────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Odczyt w useFrame: HUD priorytet, fallback mikrofon
    const analyserNode = hudAnalyser ?? micAnalyserRef.current;

    // Jeśli mic ctx zawieszony — spróbuj wznowić (może działać po gescie)
    if (!hudAnalyser && micCtxRef.current?.state === 'suspended') {
      void micCtxRef.current.resume();
    }

    // ── DEBUG (co 180 klatek ≈ co 3 sek) — zawsze, nawet gdy brak audio ──
    debugFrameRef.current = (debugFrameRef.current + 1) % 180;
    if (debugFrameRef.current === 1) {
      const src = hudAnalyser ? 'HUD' : (micAnalyserRef.current ? 'MIC' : 'NONE');
      const ctxState = micCtxRef.current?.state ?? 'n/a';
      console.log(`[Face] src=${src} ctxState=${ctxState} hudAnalyser=${!!hudAnalyser} micReady=${micReadyRef.current}`);
    }

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

    // ── DEBUG (co 180 klatek ≈ co 3 sekundy) ────────────────────────────
    debugFrameRef.current = (debugFrameRef.current + 1) % 180;
    if (debugFrameRef.current === 1) {
      const maxVal = Math.max(...Array.from(data));
      const src = hudAnalyser ? 'HUD' : (micAnalyserRef.current ? 'MIC' : 'NONE');
      const ctxState = micCtxRef.current?.state ?? 'n/a';
      console.log(`[Face] src=${src} ctxState=${ctxState} data[0]=${data[0]} max=${maxVal} bins=${bins}`);
    }
    // ─────────────────────────────────────────────────────────────────────

    // Sub-bass (bin 0) — kick drum
    const subBassNorm = data[0] / 255;
    // Low-mid band (bins 1-8) — bassline, lower vocals
    const lowMidNorm = avgBins(data, 1, Math.min(8, bins));
    // Wide low band — full bass presence for continuous jaw
    const lowBand = avgBins(data, 0, Math.min(10, bins >> 2));
    // Treble band — hi-hats, sibilance
    const trebleNorm = avgBins(data, Math.min(16, bins >> 1), Math.min(32, bins >> 1));
    // Upper mids — vocals, snares
    const midHighNorm = avgBins(data, Math.min(6, bins >> 2), Math.min(16, bins >> 1));

    // Onset detection: RELATIVE spike (ratio) — działa przy każdej głośności
    // Wolna adaptacja (0.97) żeby średnia nie doganiała szybko wysokich wartości
    const bassSmooth = bassAvgRef.current * 0.97 + subBassNorm * 0.03;
    bassAvgRef.current = bassSmooth;
    const bassRatio = bassSmooth > 0.01 ? subBassNorm / bassSmooth : 1.0;
    const onset = bassRatio > 1.2 && subBassNorm > 0.03;

    // Jaw: ciągła reakcja z niskich pasm + onset jako podbicie
    const baseJaw = lowBand * 0.45 + lowMidNorm * 0.25;
    const onsetBoost = onset ? Math.min(bassRatio * 0.12, 0.25) : 0;
    const targetJaw = Math.min(baseJaw + onsetBoost, 1.0);
    const jawSpeed = onset ? 12.0 : 6.0;

    // Blink: treble
    const targetBlink = trebleNorm > 0.1 ? Math.min(trebleNorm * 0.65, 0.65) : 0;
    // Brows: mid-high
    const targetBrow = midHighNorm * 0.45;

    const m = morphRef.current;
    m.jawOpen = lerp(m.jawOpen, targetJaw, jawSpeed * dt);
    m.eyeBlinkLeft = lerp(m.eyeBlinkLeft, targetBlink, 8 * dt);
    m.eyeBlinkRight = lerp(m.eyeBlinkRight, targetBlink, 8 * dt);
    m.browDownLeft = lerp(m.browDownLeft, targetBrow, 5 * dt);
    m.browDownRight = lerp(m.browDownRight, targetBrow, 5 * dt);

    applyMorphs();

    // Emissive bloom: mouth glow from bass, eyes from treble
    applyEmissive(lowBand * 1.5 + onsetBoost * 2.0, trebleNorm);
  });


  function resolveMorphIndices(dict: Record<string, number>) {
    if (morphIndexRef.current) return;

    const keys = Object.keys(dict);
    const lower = keys.map(k => k.toLowerCase());

    function findIdx(patterns: string[]): number {
      for (const pat of patterns) {
        const idx = lower.findIndex(k => k.includes(pat));
        if (idx !== -1) return dict[keys[idx]];
      }
      return -1;
    }

    const jaw = findIdx(['jawopen', 'jaw_open', 'jaw']);
    const blinkL = findIdx(['eyeblinkleft', 'eye_blink_left', 'blinkleft', 'blink_left', 'eyeblink_l']);
    const blinkR = findIdx(['eyeblinkright', 'eye_blink_right', 'blinkright', 'blink_right', 'eyeblink_r']);
    const browL = findIdx(['browdownleft', 'brow_down_left', 'browdown_l', 'browleft']);
    const browR = findIdx(['browdownright', 'brow_down_right', 'browdown_r', 'browright']);

    if (jaw < 0 && blinkL < 0 && blinkR < 0) {
      console.warn('[AudioReactiveFace] Could not resolve any morph target indices. Available:', keys.join(', '));
    }

    morphIndexRef.current = { jaw, blinkL, blinkR, browL, browR };
    console.log('[AudioReactiveFace] Resolved morph indices:', morphIndexRef.current);
  }

  function applyMorphs() {
    const head = headRef.current;
    if (!head?.morphTargetDictionary || !head.morphTargetInfluences) return;

    resolveMorphIndices(head.morphTargetDictionary);

    const idx = morphIndexRef.current;
    if (!idx) return;

    const inf = head.morphTargetInfluences;
    const m = morphRef.current;

    if (idx.jaw >= 0) inf[idx.jaw] = m.jawOpen;
    if (idx.blinkL >= 0) inf[idx.blinkL] = m.eyeBlinkLeft;
    if (idx.blinkR >= 0) inf[idx.blinkR] = m.eyeBlinkRight;
    if (idx.browL >= 0) inf[idx.browL] = m.browDownLeft;
    if (idx.browR >= 0) inf[idx.browR] = m.browDownRight;
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
