"use client";

import { useMemo, useRef, useLayoutEffect } from 'react';
import { useControls } from 'leva';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

// ─── Procedural wood-plank texture ─────────────────────────────────────────
function makeWedgeBumpMap(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Let 1 tile be 256x256, meaning a 4x4 checker grid.
  // Each tile contains 4 wedges.
  const tileSize = 256;
  const wedgesPerTile = 4;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tx = Math.floor(x / tileSize);
      const ty = Math.floor(y / tileSize);
      const isHoriz = (tx + ty) % 2 === 0;

      let val = 0;
      if (isHoriz) {
        // Wedges form horizontal ridges -> height varies along Y
        const p = ((y % (tileSize / wedgesPerTile)) / (tileSize / wedgesPerTile));
        // Easing to make wedges look slightly rounded at the bottom, pointy at the top
        val = p < 0.5 ? Math.pow(p * 2, 0.8) : Math.pow((1 - p) * 2, 0.8);
      } else {
        // Vertical ridges -> height varies along X
        const p = ((x % (tileSize / wedgesPerTile)) / (tileSize / wedgesPerTile));
        val = p < 0.5 ? Math.pow(p * 2, 0.8) : Math.pow((1 - p) * 2, 0.8);
      }

      const i = (y * size + x) * 4;
      // High contrast for strong normal map reaction, plus slight noise for foam texture
      const noise = Math.random() * 6;
      const c = Math.min(255, Math.floor(val * 240 + 5 + noise));

      data[i] = c;
      data[i + 1] = c;
      data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─── Procedural condenser microphone ───────────────────────────────────────
function ProceduralMic({ position }: { position: [number,number,number] }) {
  return (
    <group position={position} rotation={[0, 0, 0]}>
      {/* Body – chrome cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.060, 0.058, 0.22, 18]} />
        <meshStandardMaterial color="#cccccc" roughness={0.12} metalness={0.95} />
      </mesh>
      {/* Capsule top – gold tone */}
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.055, 0.060, 0.15, 18]} />
        <meshStandardMaterial color="#c8a84b" roughness={0.18} metalness={0.88} />
      </mesh>
      {/* Mesh grille overlay */}
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.063, 0.063, 0.16, 18]} />
        <meshStandardMaterial color="#888" roughness={0.6} metalness={0.5} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      {/* Logo band ring */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.063, 0.063, 0.018, 18]} />
        <meshStandardMaterial color="#111" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* XLR connector */}
      <mesh position={[0, -0.155, 0]}>
        <cylinderGeometry args={[0.038, 0.042, 0.08, 10]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Yoke mount – two arms */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.08, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
          <meshStandardMaterial color="#444" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
export function VocalBooth({ position = [0, 0, 0] as [number, number, number] }) {
  const W = 5.2; // slightly wider than 5.0 to embed in the frame
  const H = 3.2;
  const D = 3.6;
  const T = 0.10;

  const [sonomaTex, filcTex] = useTexture([
    '/textures/Lamele/Veneer/Veneer/Tekstury/LAM_P3_SONOMA.jpg',
    '/textures/Lamele/Veneer/Veneer/Tekstury/LAM_P3_FILC_CZARNY.jpg'
  ]);

  const wedgeBumpTex = useMemo(() => makeWedgeBumpMap(), []);

  useLayoutEffect(() => {
    sonomaTex.wrapS = sonomaTex.wrapT = THREE.RepeatWrapping;
    filcTex.wrapS = filcTex.wrapT = THREE.RepeatWrapping;
    filcTex.repeat.set(W, H); // ~1 unit per meter for density

    wedgeBumpTex.wrapS = wedgeBumpTex.wrapT = THREE.RepeatWrapping;
    const wallRepeatX = D / 1.2; // 4 tiles in bump map, ~1.2m per repeat
    const wallRepeatY = H / 1.2;
    wedgeBumpTex.repeat.set(wallRepeatX, wallRepeatY);
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/immutability
  }, [sonomaTex, filcTex, wedgeBumpTex, W, H, D]);

  
  const foamMat = { 
    color: '#1a1816' as THREE.ColorRepresentation, 
    roughness: 0.95, 
    metalness: 0.0,
    bumpMap: wedgeBumpTex,
    bumpScale: 0.08
  };

  const slatCount = 104; // 5.2m wide, each is 0.03m wide with 0.02m gap -> 0.05m pitch
  const slatMatrix = useMemo(() => new THREE.Matrix4(), []);
  const instancedSlatsRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (instancedSlatsRef.current) {
      for (let i = 0; i < slatCount; i++) {
        const x = -W / 2 + (i + 0.5) * 0.05;
        // Position at Z = -D - T/2 + 0.02 (slightly recessed / inset from wall max bounds)
        // Actually, back wall felt face is at -D. Slat thickness is 0.03. Center is -D + 0.015.
        slatMatrix.setPosition(x, H / 2, -D + 0.015);
        instancedSlatsRef.current.setMatrixAt(i, slatMatrix);
      }
      instancedSlatsRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [W, H, D, slatCount, slatMatrix]);

  const light = useControls('Vocal Booth Lighting', {
    mainIntensity:   { value: 38, min: 0, max: 100, step: 1, label: 'Main (overhead)' },
    fillIntensity:   { value: 12, min: 0, max: 80,  step: 1, label: 'Fill (front)' },
    accentIntensity: { value: 6,  min: 0, max: 40,  step: 1, label: 'Accent (mic rim)' },
    ceilingIntensity:{ value: 4,  min: 0, max: 40,  step: 1, label: 'Ceiling bounce' },
    ambientIntensity:{ value: 2.10, min: 0, max: 3,  step: 0.05, label: 'Ambient' },
    lightColor:      { value: '#ffe8c0', label: 'Light color' },
  });

  return (
    <group position={position}>

      {/* ── Lighting ── */}
      {/* Main warm overhead flood */}
      <pointLight position={[0, H - 0.3, -D * 0.5]} intensity={light.mainIntensity}   color={light.lightColor} distance={5}  decay={1.8} />
      {/* Bright front fill – visible through the glass */}
      <pointLight position={[0, H * 0.55, -0.15]}   intensity={light.fillIntensity}   color={light.lightColor} distance={4}  decay={2} />
      {/* Warm accent behind mic */}
      <pointLight position={[0.3, 1.7, -D * 0.45]}  intensity={light.accentIntensity} color="#ff9944"          distance={2.5} decay={2} />
      {/* Ceiling bounce */}
      <pointLight position={[0, H - 0.1, -D * 0.3]} intensity={light.ceilingIntensity} color={light.lightColor} distance={4}  decay={2} />
      {/* Booth ambient */}
      <ambientLight intensity={light.ambientIntensity} color="#fff8ee" />

      {/* ── Floor (dark carpet for vocal booth) ── */}
      <mesh position={[0, 0.02, -D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={filcTex} roughness={0.9} color="#666" side={THREE.DoubleSide} />
      </mesh>

      {/* ── Ceiling ── */}
      <mesh position={[0, H, -D / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0e0e0e" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Walls ── */}
      {/* Back wall - Acoustic Felt Base */}
      <mesh position={[0, H / 2, -D - 0.01]}> 
        {/* Flat plane is enough to house the felt texture safely behind lamellas */}
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={filcTex} roughness={0.95} color="#111" />
      </mesh>

      {/* Back wall - Wooden Slats (Lamellas) via InstancedMesh */}
      <instancedMesh ref={instancedSlatsRef} args={[undefined, undefined, slatCount]}>
        <boxGeometry args={[0.03, H, 0.03]} />
        <meshStandardMaterial map={sonomaTex} roughness={0.65} />
      </instancedMesh>

      {/* Left wall - Wedge Acoustic Foam */}
      <mesh position={[-W / 2 - T / 2, H / 2, -D / 2]}>
        <boxGeometry args={[T, H, D]} />
        <meshStandardMaterial 
          {...foamMat} 
          bumpMap={wedgeBumpTex} // Clone map per material instance to adjust repeat
          onBeforeCompile={() => {
            // Apply scale explicitly if map object reuse causes conflicts, but here we just use native map repeat.
          }} 
        />
      </mesh>

      {/* Right wall - Wedge Acoustic Foam */}
      <mesh position={[W / 2 + T / 2, H / 2, -D / 2]}>
        <boxGeometry args={[T, H, D]} />
        <meshStandardMaterial {...foamMat} />
      </mesh>

      {/* ── Mic stand ── */}
      {/* Base */}
      <mesh position={[0.3, 0.04, -D * 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.27, 0.07, 24]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.25} metalness={0.95} />
      </mesh>
      {/* Vertical pole */}
      <mesh position={[0.3, 0.92, -D * 0.5]}>
        <cylinderGeometry args={[0.018, 0.022, 1.8, 12]} />
        <meshStandardMaterial color="#222" roughness={0.2} metalness={0.95} />
      </mesh>
      {/* Boom arm */}
      <mesh position={[0.3 - 0.17, 1.76, -D * 0.5]} rotation={[0, 0, Math.PI / 7]}>
        <cylinderGeometry args={[0.013, 0.015, 0.68, 10]} />
        <meshStandardMaterial color="#333" roughness={0.25} metalness={0.9} />
      </mesh>
      {/* Boom collar */}
      <mesh position={[0.3, 1.7, -D * 0.5]}>
        <cylinderGeometry args={[0.032, 0.032, 0.055, 12]} />
        <meshStandardMaterial color="#444" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* ── Microphone (procedural condenser) ── */}
      <ProceduralMic position={[0.07, 1.95, -D * 0.48]} />

      {/* ── Pop filter ── */}
      <mesh position={[0.07, 1.95, -D * 0.42]}>
        <torusGeometry args={[0.085, 0.012, 8, 28]} />
        <meshStandardMaterial color="#888" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.07, 1.95, -D * 0.42]}>
        <circleGeometry args={[0.085, 32]} />
        <meshStandardMaterial color="#999" transparent opacity={0.28} side={THREE.DoubleSide} />
      </mesh>
      {/* Pop filter arm */}
      <mesh position={[0.18, 1.82, -D * 0.42]} rotation={[0, 0, -Math.PI / 5]}>
        <cylinderGeometry args={[0.007, 0.007, 0.22, 8]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
      </mesh>

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

      {/* ── ON AIR neon strip (above the glass opening, above the open face) ── */}
      <mesh position={[0, H - 0.08, -0.05]}>
        <boxGeometry args={[0.62, 0.1, 0.04]} />
        <meshBasicMaterial color="#cc0000" />
      </mesh>
      <pointLight position={[0, H - 0.08, -0.05]} intensity={2} color="#ff2200" distance={1.2} decay={2} />

      {/* ── Floor skirting ── */}
      <mesh position={[0, 0.02, -D]}>
        <boxGeometry args={[W, 0.04, 0.05]} />
        <meshStandardMaterial color="#3a2010" roughness={0.4} metalness={0.2} />
      </mesh>

    </group>
  );
}
