"use client";

import { useMemo, useRef, useLayoutEffect } from 'react';
import { useControls } from 'leva';
import * as THREE from 'three';
import { useTexture, useGLTF } from '@react-three/drei';
import { AcousticFoamWall } from './CreatorRoomMVP';

// ─── Real Microphone Component ───────────────────────────────────────────────
function RealMicMesh({ position, rotation, scale = 1.0 }: { position: [number, number, number], rotation?: [number, number, number], scale?: number }) {
  const { scene } = useGLTF('/models/mic-transformed.glb') as { scene: THREE.Group };
  const processedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((n) => {
      if (n instanceof THREE.Mesh && n.material) {
        if (n.geometry) n.geometry.computeBoundingSphere();
        const sourceMaterial = Array.isArray(n.material) ? n.material[0] : n.material;
        const material = sourceMaterial.clone();
        if ('metalness' in material && typeof material.metalness === 'number' && material.name?.toLowerCase().includes('metal')) {
          material.metalness = 0.9;
        }
        if ('roughness' in material && typeof material.roughness === 'number') {
          material.roughness = Math.max(0.2, material.roughness || 0);
        }
        material.side = THREE.DoubleSide;
        n.material = material;
      }
    });

    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    if (box.getSize(new THREE.Vector3()).length() > 0.0001) {
      clone.position.sub(center);
    }

    return clone;
  }, [scene]);
  return (
    <group position={position} rotation={rotation || [0, 0, 0]} scale={scale}>
      <primitive object={processedScene} />
    </group>
  );
}


// ──────────────────────────────────────────────────────────────────────────────
export function VocalBooth({ position = [0, 0, 0] as [number, number, number] }) {
  const W = 6.6;
  const H = 3.2;
  const D = 3.6;

  const [rawSonomaTex, rawFilcTex] = useTexture([
    '/textures/Lamele/Veneer/Veneer/Tekstury/LAM_P3_SONOMA.jpg',
    '/textures/Lamele/Veneer/Veneer/Tekstury/LAM_P3_FILC_CZARNY.jpg'
  ]) as THREE.Texture[];

  const { sonomaTex, filcTex } = useMemo(() => {
    const sonomaTex = rawSonomaTex.clone();
    const filcTex = rawFilcTex.clone();
    sonomaTex.wrapS = sonomaTex.wrapT = THREE.RepeatWrapping;
    filcTex.wrapS = filcTex.wrapT = THREE.RepeatWrapping;
    filcTex.repeat.set(W, H);
    sonomaTex.needsUpdate = true;
    filcTex.needsUpdate = true;
    return { sonomaTex, filcTex };
  }, [rawSonomaTex, rawFilcTex, W, H]);

  const slatCount = 132; // Back wall slats
  const slatMatrix = useMemo(() => new THREE.Matrix4(), []);
  const instancedSlatsRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (instancedSlatsRef.current) {
      for (let i = 0; i < slatCount; i++) {
        const x = -W / 2 + (i + 0.5) * 0.05;
        slatMatrix.setPosition(x, H / 2, -D + 0.015);
        instancedSlatsRef.current.setMatrixAt(i, slatMatrix);
      }
      instancedSlatsRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [W, H, D, slatCount, slatMatrix]);

  const light = useControls('Vocal Booth Lighting', {
    mainIntensity: { value: 3.5, min: 0, max: 100, step: 1, label: 'Main (overhead)' },
    fillIntensity: { value: 1.8, min: 0, max: 80, step: 1, label: 'Fill (front)' },
    accentIntensity: { value: 8, min: 0, max: 40, step: 1, label: 'Accent (mic rim)' },
    ceilingIntensity: { value: 8, min: 0, max: 40, step: 1, label: 'Ceiling bounce' },
    ambientIntensity: { value: 0.15, min: 0, max: 5, step: 0.05, label: 'Ambient' },
    lightColor: { value: '#ffffff', label: 'Light color' },
  });

  const mic = useControls('Microphone', {
    posX: { value: 2.61, min: -4, max: 4, step: 0.01 },
    posY: { value: 0.25, min: 0, max: 2, step: 0.01 },
    posZ: { value: -2.7, min: -5, max: 0, step: 0.01 },
    rotY: { value: -132, min: -180, max: 180, step: 1 },
    scale: { value: 1.60, min: 0.1, max: 5, step: 0.05 },
  });

  return (
    <group position={position}>

      {/* ── Lighting ── */}
      <pointLight position={[0, H - 0.3, -D * 0.5]} intensity={light.mainIntensity} color={light.lightColor} distance={5} decay={1.8} />
      <pointLight position={[0, H * 0.55, -0.15]} intensity={light.fillIntensity} color={light.lightColor} distance={4} decay={2} />
      <pointLight position={[0.3, 1.7, -D * 0.45]} intensity={light.accentIntensity} color="#ff9944" distance={2.5} decay={2} />
      <pointLight position={[0, H - 0.1, -D * 0.3]} intensity={light.ceilingIntensity} color={light.lightColor} distance={4} decay={2} />
      <ambientLight intensity={light.ambientIntensity} color="#fff8ee" />
      {/* ON AIR neon glow */}
      <pointLight position={[0, H - 0.08, -0.05]} intensity={1.2} color="#ff2200" distance={1.2} decay={2} />

      {/* ── Floor / Ceiling ── */}
      <mesh position={[0, 0.02, -D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={filcTex} roughness={0.9} color="#666" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, H, -D / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0e0e0e" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Back Wall (Felt + Wood Slats) ── */}
      <mesh position={[0, H / 2, -D - 0.01]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={filcTex} roughness={0.95} color="#111" />
      </mesh>
      <instancedMesh ref={instancedSlatsRef} args={[undefined, undefined, slatCount]}>
        <boxGeometry args={[0.03, H, 0.03]} />
        <meshStandardMaterial map={sonomaTex} roughness={0.65} />
      </instancedMesh>

      <AcousticFoamWall position={[-W / 2 + 0.02, H / 2, -D / 2]} rotation={[0, Math.PI / 2, 0]} args={[D, H, 0.1]} repeat={[D / 2, H / 2]} />
      <AcousticFoamWall position={[W / 2 - 0.02, H / 2, -D / 2]} rotation={[0, -Math.PI / 2, 0]} args={[D, H, 0.1]} repeat={[D / 2, H / 2]} />

      {/* ── Real Studio Microphone ── */}
      <RealMicMesh
        position={[mic.posX, mic.posY, mic.posZ]}
        scale={mic.scale}
        rotation={[0, THREE.MathUtils.degToRad(mic.rotY), 0]}
      />

      {/* ── Studio stool ── */}
      <mesh position={[-0.55, 0.73, -D * 0.55]}>
        <cylinderGeometry args={[0.22, 0.20, 0.07, 20]} />
        <meshStandardMaterial color="#2c1308" roughness={0.4} />
      </mesh>
      <mesh position={[-0.55, 0.36, -D * 0.55]}>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 10]} />
        <meshStandardMaterial color="#555" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.55, 0.03, -D * 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.19, 0.04, 20]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* ── Headphone hook (right wall) ── */}
      <mesh position={[W / 2 - 0.09, 1.7, -D * 0.35]} rotation={[0, -Math.PI / 2, 0]}>
        <torusGeometry args={[0.09, 0.013, 8, 24, Math.PI * 1.25]} />
        <meshStandardMaterial color="#bbb" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* ── ON AIR neon strip (meshBasicMaterial = self-illuminating, no extra light needed) ── */}
      <mesh position={[0, H - 0.08, -0.05]}>
        <boxGeometry args={[0.62, 0.1, 0.04]} />
        <meshBasicMaterial color="#cc0000" />
      </mesh>

      {/* ── Floor skirting ── */}
      <mesh position={[0, 0.02, -D]}>
        <boxGeometry args={[W, 0.04, 0.05]} />
        <meshStandardMaterial color="#3a2010" roughness={0.4} metalness={0.2} />
      </mesh>

    </group>
  );
}
