"use client";

import { useMemo } from 'react';
import { useControls } from 'leva';
import * as THREE from 'three';

// ─── Procedural wood-plank texture ─────────────────────────────────────────
function makeWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const planks = ['#6b3f20','#7a4f2e','#855a35','#6f4525','#7d5030','#8a5c38'];
  const pH = 512 / planks.length;
  planks.forEach((c, i) => {
    ctx.fillStyle = c; ctx.fillRect(0, i * pH, 512, pH - 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1;
    for (let x = 0; x < 512; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, i * pH); ctx.lineTo(x + 5, (i + 1) * pH - 2); ctx.stroke();
    }
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1);
  return tex;
}

// ─── Procedural foam texture ────────────────────────────────────────────────
function makeFoamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c8bfa8'; ctx.fillRect(0, 0, 256, 256);
  const s = 28;
  for (let x = 0; x < 256; x += s) for (let y = 0; y < 256; y += s) {
    const g = ctx.createRadialGradient(x+s/2,y+s/2,2,x+s/2,y+s/2,s/2);
    g.addColorStop(0,'rgba(255,255,255,0.20)'); g.addColorStop(1,'rgba(0,0,0,0.15)');
    ctx.fillStyle = g; ctx.fillRect(x, y, s-1, s-1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2);
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
  const W = 4.6;
  const H = 3.2;
  const D = 3.6;
  const T = 0.10;

  const woodTex = useMemo(() => makeWoodTexture(), []);
  const foamTex = useMemo(() => makeFoamTexture(), []);
  const foamMat = { color: '#cabfad' as THREE.ColorRepresentation, roughness: 0.92, metalness: 0.0 };

  const light = useControls('Vocal Booth Lighting', {
    mainIntensity:   { value: 22, min: 0, max: 100, step: 1, label: 'Main (overhead)' },
    fillIntensity:   { value: 12, min: 0, max: 80,  step: 1, label: 'Fill (front)' },
    accentIntensity: { value: 6,  min: 0, max: 40,  step: 1, label: 'Accent (mic rim)' },
    ceilingIntensity:{ value: 8,  min: 0, max: 40,  step: 1, label: 'Ceiling bounce' },
    ambientIntensity:{ value: 0.6, min: 0, max: 3,  step: 0.05, label: 'Ambient' },
    lightColor:      { value: '#ffe8c0', label: 'Light color' },
  });

  return (
    <group position={position}>

      {/* ── Lighting ── */}
      {/* Main warm overhead flood */}
      <pointLight position={[0, H - 0.3, -D * 0.5]} intensity={light.mainIntensity}   color={light.lightColor} distance={9}  decay={1.4} />
      {/* Bright front fill – visible through the glass */}
      <pointLight position={[0, H * 0.55, -0.15]}   intensity={light.fillIntensity}   color={light.lightColor} distance={7}  decay={1.6} />
      {/* Warm accent behind mic */}
      <pointLight position={[0.3, 1.7, -D * 0.45]}  intensity={light.accentIntensity} color="#ff9944"          distance={2.5} decay={2} />
      {/* Ceiling bounce */}
      <pointLight position={[0, H - 0.1, -D * 0.3]} intensity={light.ceilingIntensity} color={light.lightColor} distance={5}  decay={2} />
      {/* Booth ambient */}
      <ambientLight intensity={light.ambientIntensity} color="#fff8ee" />

      {/* ── Floor (wood) ── */}
      <mesh position={[0, 0, -D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={woodTex} roughness={0.55} metalness={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Ceiling ── */}
      <mesh position={[0, H, -D / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#e8e0d4" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Walls (box = double-sided automatically) ── */}
      {/* Back wall */}
      <mesh position={[0, H / 2, -D - T / 2]}>
        <boxGeometry args={[W, H, T]} />
        <meshStandardMaterial map={foamTex} {...foamMat} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-W / 2 - T / 2, H / 2, -D / 2]}>
        <boxGeometry args={[T, H, D + T]} />
        <meshStandardMaterial map={foamTex} {...foamMat} />
      </mesh>
      {/* Right wall */}
      <mesh position={[W / 2 + T / 2, H / 2, -D / 2]}>
        <boxGeometry args={[T, H, D + T]} />
        <meshStandardMaterial map={foamTex} {...foamMat} />
      </mesh>

      {/* ── Wood wainscoting (lower ~0.6m strip on three walls) ── */}
      {[
        { pos: [0, 0.3, -D - T + 0.02] as [number,number,number], args: [W - 0.02, 0.6, 0.04] as [number,number,number], rotY: 0 },
        { pos: [-W / 2 + 0.06, 0.3, -D / 2] as [number,number,number], args: [D, 0.6, 0.04] as [number,number,number], rotY: Math.PI / 2 },
        { pos: [W / 2 - 0.06, 0.3, -D / 2] as [number,number,number], args: [D, 0.6, 0.04] as [number,number,number], rotY: Math.PI / 2 },
      ].map((w, i) => (
        <mesh key={i} position={w.pos} rotation={[0, w.rotY, 0]}>
          <boxGeometry args={w.args} />
          <meshStandardMaterial map={woodTex} roughness={0.45} metalness={0.05} />
        </mesh>
      ))}

      {/* ── Acoustic panel tiles (back wall decoration) ── */}
      {[-1.3, 0, 1.3].flatMap((x, i) =>
        [0.95, 1.75, 2.55].map((y, j) => (
          <mesh key={`p${i}${j}`} position={[x, y, -D + 0.05]}>
            <boxGeometry args={[0.88, 0.62, 0.07]} />
            <meshStandardMaterial color="#b5a98a" roughness={1} />
          </mesh>
        ))
      )}

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
      <pointLight position={[0, H - 0.08, -0.03]} intensity={4} color="#ff2200" distance={1.2} decay={2} />

      {/* ── Floor skirting ── */}
      <mesh position={[0, 0.02, -D]}>
        <boxGeometry args={[W, 0.04, 0.05]} />
        <meshStandardMaterial color="#3a2010" roughness={0.4} metalness={0.2} />
      </mesh>

    </group>
  );
}
