'use client';

import { useState, useRef, Suspense, useEffect, useMemo, useCallback } from 'react';
import { Html, useTexture, useGLTF, useAnimations } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EditingTable } from '../../modules/furniture/EditingTable';
import { DistanceCulledModel } from '../../systems/DistanceCulledModel';
import { VocalBooth } from './VocalBooth';
import { useControls } from 'leva';
import { useHudStore } from '../../../stores/useHudStore';
import { useAudioStore } from '../../../stores/useAudioStore';
import { ParticleWaveFloor } from '../../modules/fx/ParticleWaveFloor';
import { PortalEffect } from '../../modules/fx/PortalEffect';
import { RoomDoor } from '../../modules/doors/RoomDoor';

// ══════════════════════════════════════════════════════════════════════════
// 0. PRELOAD HEAVY MODELS — start loading at module import, before any component renders
// useGLTF.preload() from drei caches per URL — actual network request fires once
// ══════════════════════════════════════════════════════════════════════════
useGLTF.preload('/models/optimized/golden_play_button.glb');
useGLTF.preload('/models/optimized/ipad_pro_2024.glb');
useGLTF.preload('/models/optimized/office_chair.glb');
useGLTF.preload('/models/optimized/organizer.glb');
useGLTF.preload('/models/optimized/modern_wooden_cabinet.glb');
useGLTF.preload('/models/optimized/sofa.glb');

// ══════════════════════════════════════════════════════════════════════════
// 1. Loading Diagnostics & Asset Performance Monitoring
// ══════════════════════════════════════════════════════════════════════════
// THREE.DefaultLoadingManager diagnostics disabled for performance
// THREE.DefaultLoadingManager.onStart = (url, itemsLoaded, itemsTotal) => { ... };
// THREE.DefaultLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => { ... };

type SceneObjectProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
};

// 1. Oświetlenie obwodowe LED — listwy przysufitowe audio-reaktywne
function RoomPerimeterNeon({ y = 4.95 }: { y?: number }) {
  const hudAnalyser = useAudioStore(s => s.analyserNode);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Stabilny materiał tworzony raz
  const ledMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#00f3ff',
      emissiveIntensity: 1.2,
      toneMapped: false,
      depthWrite: false,
    });
    materialRef.current = mat;
    return mat;
  }, []);

  useFrame(() => {
    const mat = materialRef.current;
    const light = lightRef.current;
    if (!mat || !light) return;

    if (!hudAnalyser) {
      mat.emissiveIntensity = 0.8;
      light.intensity = 0.3;
      return;
    }

    const data = new Uint8Array(hudAnalyser.frequencyBinCount);
    hudAnalyser.getByteFrequencyData(data);

    let sum = 0;
    for (let i = 0; i < 16; i++) sum += data[i];
    const avg = sum / 16 / 255;

    const intensity = 0.8 + avg * 12.0;
    mat.emissiveIntensity = intensity;
    light.intensity = intensity * 0.7;
  });

  // Wymiary pokoju
  const roomW = 14.0;
  const roomD = 14.6;
  const halfW = roomW / 2;
  const halfD = roomD / 2;
  const centerZ = -0.3;
  // Profil listwy: 0.12 szeroka, 0.025 wysoka (płaska taśma LED)
  const stripW = 0.12;
  const stripH = 0.025;

  return (
    <group position={[0, y, centerZ]}>
      {/* Front — listwa LED przy suficie, przednia ściana */}
      <mesh position={[0, 0, halfD]} material={ledMaterial}>
        <boxGeometry args={[roomW, stripH, stripW]} />
      </mesh>
      {/* Back — tylna ściana */}
      <mesh position={[0, 0, -halfD]} material={ledMaterial}>
        <boxGeometry args={[roomW, stripH, stripW]} />
      </mesh>
      {/* Left — lewa ściana */}
      <mesh position={[-halfW, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={ledMaterial}>
        <boxGeometry args={[roomD, stripH, stripW]} />
      </mesh>
      {/* Right — prawa ściana */}
      <mesh position={[halfW, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={ledMaterial}>
        <boxGeometry args={[roomD, stripH, stripW]} />
      </mesh>

      {/* Centralny pointLight — audio-reaktywny glow */}
      <pointLight
        ref={lightRef}
        position={[0, -0.15, 0]}
        color="#00f3ff"
        distance={14}
        intensity={0.4}
        decay={1.5}
      />
    </group>
  );
}

// 2. Global shared material dla TechnicalTrim (Optymalizacja)
const globalTrimMaterial = new THREE.MeshStandardMaterial({ color: "#080808", roughness: 0.95, metalness: 0 });

function TechnicalTrim({ args, position, rotation = [0, 0, 0] }: { args: [number, number, number], position: [number, number, number], rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow material={globalTrimMaterial}>
      <boxGeometry args={args} />
    </mesh>
  );
}

function BrickWall({ args, position }: { args: [number, number, number], position: [number, number, number] }) {
  const textures = useTexture([
    '/textures/drewno/Bricks061_2K-JPG/Bricks061_2K-JPG_Color.jpg',
    '/textures/drewno/Bricks061_2K-JPG/Bricks061_2K-JPG_AmbientOcclusion.jpg',
    '/textures/drewno/Bricks061_2K-JPG/Bricks061_2K-JPG_NormalGL.jpg',
    '/textures/drewno/Bricks061_2K-JPG/Bricks061_2K-JPG_Roughness.jpg',
  ]);

  const maps = useMemo(() => {
    return textures.map(tex => {
      const clone = tex.clone();
      clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
      clone.repeat.set(args[0] / 3, args[1] / 3);
      // Align textures in world space so seams match perfectly
      const leftEdge = position[0] - args[0] / 2;
      const bottomEdge = position[1] - args[1] / 2;
      clone.offset.set(leftEdge / 3, bottomEdge / 3);
      clone.needsUpdate = true;
      return clone;
    });
  }, [textures, args, position]);

  useEffect(() => {
    return () => {
      maps.forEach(m => m.dispose());
    };
  }, [maps]);

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial 
        map={maps[0]} 
        aoMap={maps[1]} 
        normalMap={maps[2]} 
        roughnessMap={maps[3]} 
        color="#888888" // darken slightly
      />
    </mesh>
  );
}

export function AcousticFoamWall({ args, position, rotation = [0, 0, 0], repeat, textureOffset = [0, 0] }: { args: [number, number, number], position: [number, number, number], rotation?: [number, number, number], repeat?: [number, number], textureOffset?: [number, number] }) {
  const textures = useTexture([
    '/textures/drewno/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_Color.jpg',
    '/textures/drewno/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_NormalGL.jpg',
    '/textures/drewno/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_Roughness.jpg',
    '/textures/drewno/AcousticFoam002_2K-JPG/AcousticFoam002_2K-JPG_Metalness.jpg',
  ]);

  const maps = useMemo(() => {
    return textures.map(tex => {
      const clone = tex.clone();
      clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
      if (repeat) {
        clone.repeat.set(repeat[0], repeat[1]);
      } else {
        clone.repeat.set(args[0] / 2, args[1] / 2);
      }
      clone.offset.set(textureOffset[0], textureOffset[1]);
      clone.needsUpdate = true;
      return clone;
    });
  }, [textures, args, repeat, textureOffset]);

  useEffect(() => {
    return () => {
      maps.forEach(m => m.dispose());
    };
  }, [maps]);

  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial 
        map={maps[0]} 
        normalMap={maps[1]} 
        roughnessMap={maps[2]} 
        metalnessMap={maps[3]} 
        color="#a0a0a0" // Brighter so grooves are more visible
        normalScale={new THREE.Vector2(3, 3)} // Much stronger normal map for deep grooves
        roughness={0.7}
      />
    </mesh>
  );
}

function DiamondPlateFloor({ args, position }: { args: [number, number], position: [number, number, number] }) {
  const textures = useTexture([
    '/textures/DiamondPlate/DiamondPlate006C_2K-JPG_Color.jpg',
    '/textures/DiamondPlate/DiamondPlate006C_2K-JPG_NormalGL.jpg',
    '/textures/DiamondPlate/DiamondPlate006C_2K-JPG_Roughness.jpg',
    '/textures/DiamondPlate/DiamondPlate006C_2K-JPG_Metalness.jpg',
    '/textures/DiamondPlate/DiamondPlate006C_2K-JPG_AmbientOcclusion.jpg',
  ]);

  const maps = useMemo(() => {
    return textures.map(tex => {
      const clone = tex.clone();
      clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
      clone.repeat.set(args[0] / 1.5, args[1] / 1.5);
      clone.needsUpdate = true;
      return clone;
    });
  }, [textures, args]);

  useEffect(() => {
    return () => {
      maps.forEach(m => m.dispose());
    };
  }, [maps]);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={args} />
      <meshStandardMaterial 
        map={maps[0]} 
        normalMap={maps[1]} 
        roughnessMap={maps[2]} 
        metalnessMap={maps[3]} 
        aoMap={maps[4]}
        color="#999999" // Brighter base color
        normalScale={new THREE.Vector2(2.5, 2.5)} // Stronger normal map to pop the diamond plate
        roughness={0.75} // Less shiny for cleaner e-voting look
        metalness={0.55} // Subtler metallic feel
      />
    </mesh>
  );
}

function GoldenPlayButton(props: SceneObjectProps) {
  const { scene } = useGLTF("/models/optimized/golden_play_button.glb") as { scene: THREE.Group };
  const processedScene = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        // Map based on discovered names: Object_2, Object_3, Object_4
        if (node.name === 'Object_4') {
          // Play protrusion = white
          node.material = new THREE.MeshStandardMaterial({
            color: "#ffffff",
            roughness: 0.2,
            metalness: 0.1,
          });
        } else if (node.name === 'Object_3') {
          // Triangular indentation = gold
          node.material = new THREE.MeshStandardMaterial({
            color: "#ffd700",
            metalness: 0.9,
            roughness: 0.1,
          });
        } else {
          // Main plate (Object_2) = red
          node.material = new THREE.MeshStandardMaterial({
            color: "#ff0000",
            roughness: 0.4,
            metalness: 0.0,
          });
        }
      }
    });
    return clone;
  }, [scene]);

  return <primitive object={processedScene} {...props} />;
}

function createSoftFrameTexture({ color, strength, bottomFactor = 0.35, shadow = false }: { color: [number, number, number], strength: number, bottomFactor?: number, shadow?: boolean }) {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const frameX = shadow ? 0.74 : 0.72;
  const frameY = shadow ? 0.65 : 0.65;
  const spread = shadow ? 0.18 : 0.058;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const nx = (u - 0.5) * 2;
      const ny = (v - 0.5) * 2;
      const ax = Math.abs(nx);
      const ay = Math.abs(ny);

      const dx = ax - frameX;
      const dy = ay - frameY;
      const outsideX = Math.max(dx, 0);
      const outsideY = Math.max(dy, 0);
      const outsideDistance = Math.hypot(outsideX, outsideY);
      const outsideMask = THREE.MathUtils.smoothstep(Math.max(dx, dy), -0.006, 0.012);
      const edgeFalloff = Math.exp(-Math.pow(outsideDistance / spread, 2));
      const edgeBlend = THREE.MathUtils.smoothstep(dy - dx, -0.025, 0.025);
      const sideBlend = 1 - edgeBlend;
      const sideVariation = 1 + (nx > 0 ? -0.12 : 0.06) + Math.sin((ny * 4.7 + nx * 1.3) * Math.PI) * 0.045;
      const horizontalBias = ny > 0 ? 0.82 : bottomFactor;
      const sideBias = 0.42 * sideVariation * THREE.MathUtils.clamp(1.05 - Math.max(-ny, 0) * 0.45, 0.58, 1.08);
      const directionalBias = shadow ? 0.65 : edgeBlend * horizontalBias + sideBlend * sideBias;
      const outerFeather = 1 - THREE.MathUtils.smoothstep(Math.max(ax, ay), 0.94, 1);
      const shadowFill = shadow ? Math.exp(-(Math.pow(ax / 0.84, 4) + Math.pow(ay / 0.74, 4))) * 0.16 : 0;
      const alpha = Math.min(1, ((edgeFalloff * outsideMask * directionalBias * outerFeather) + shadowFill) * strength);
      const i = (y * size + x) * 4;

      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = Math.round(alpha * 255);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function Thr3StyleWallArt({ url, offsetX = 0, offsetY = 0, repeatX = 1, repeatY = 1, ...props }: { url: string, offsetX?: number, offsetY?: number, repeatX?: number, repeatY?: number } & SceneObjectProps) {
  const texture = useTexture(url) as THREE.Texture;

  // Apply an offset to perfectly center the logo
  useMemo(() => {
    if (url.includes('logo3s.jpeg')) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      // offset.x: negative moves image right, positive moves image left
      texture.offset.set(offsetX, offsetY); 
      texture.repeat.set(repeatX, repeatY); 
      texture.needsUpdate = true;
    }
  }, [texture, url, offsetX, offsetY, repeatX, repeatY]);

  const logoAspect = useMemo(() => {
    const image = texture.image as { width?: number; height?: number } | undefined;
    if (image?.width && image?.height) {
      return image.width / image.height;
    }
    return 1344 / 768;
  }, [texture]);
  const glowTexture = useMemo(() => createSoftFrameTexture({ color: [255, 170, 96], strength: 1.1, bottomFactor: 0.065 }), []);
  const shadowTexture = useMemo(() => createSoftFrameTexture({ color: [0, 0, 0], strength: 0.58, bottomFactor: 0.72, shadow: true }), []);
  const artworkHeight = 1.45;
  const padding = 0.18; // Uniform padding (passe-partout)
  const logoHeight = artworkHeight - padding;
  const logoWidth = logoHeight * logoAspect;
  const artworkWidth = logoWidth + padding;

  return (
    <group {...props}>
      <mesh position={[0, 0.06, -0.118]} renderOrder={1}>
        <planeGeometry args={[artworkWidth + 1.34, artworkHeight + 1.08]} />
        <meshBasicMaterial map={glowTexture} transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0.045, -0.035, -0.108]} renderOrder={2}>
        <planeGeometry args={[artworkWidth + 0.5, artworkHeight + 0.38]} />
        <meshBasicMaterial map={shadowTexture} transparent opacity={0.5} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0, -0.055]} castShadow receiveShadow renderOrder={4}>
        <boxGeometry args={[artworkWidth + 0.18, artworkHeight + 0.18, 0.09]} />
        <meshStandardMaterial color="#050403" roughness={0.82} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0, 0]} receiveShadow renderOrder={5}>
        <planeGeometry args={[artworkWidth, artworkHeight]} />
        <meshStandardMaterial
          color="#0d0a08"
          roughness={0.7}
          metalness={0.06}
          emissive="#0d0603"
          emissiveIntensity={0.08}
        />
      </mesh>

      <mesh position={[0, artworkHeight / 2 + 0.055, 0.04]} castShadow>
        <boxGeometry args={[artworkWidth + 0.22, 0.1, 0.1]} />
        <meshStandardMaterial color="#050505" roughness={0.58} metalness={0.32} />
      </mesh>
      <mesh position={[0, -artworkHeight / 2 - 0.055, 0.04]} castShadow>
        <boxGeometry args={[artworkWidth + 0.22, 0.1, 0.1]} />
        <meshStandardMaterial color="#050505" roughness={0.58} metalness={0.32} />
      </mesh>
      <mesh position={[-artworkWidth / 2 - 0.055, 0, 0.04]} castShadow>
        <boxGeometry args={[0.1, artworkHeight + 0.2, 0.1]} />
        <meshStandardMaterial color="#050505" roughness={0.58} metalness={0.32} />
      </mesh>
      <mesh position={[artworkWidth / 2 + 0.055, 0, 0.04]} castShadow>
        <boxGeometry args={[0.1, artworkHeight + 0.2, 0.1]} />
        <meshStandardMaterial color="#050505" roughness={0.58} metalness={0.32} />
      </mesh>

      <mesh position={[0, artworkHeight / 2 - 0.08, 0.06]}>
        <boxGeometry args={[artworkWidth - 0.18, 0.018, 0.018]} />
        <meshBasicMaterial color="#d59a58" transparent opacity={0.18} />
      </mesh>
      <mesh position={[0, -artworkHeight / 2 + 0.08, 0.06]}>
        <boxGeometry args={[artworkWidth - 0.18, 0.018, 0.018]} />
        <meshBasicMaterial color="#d59a58" transparent opacity={0.08} />
      </mesh>

      <mesh position={[0.04, -0.04, 0.035]} renderOrder={8}>
        <planeGeometry args={[logoWidth * 1.06, logoHeight * 1.08]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.095]} renderOrder={20}>
        <planeGeometry args={[logoWidth, logoHeight]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.02} side={THREE.DoubleSide} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.08, 0.075]} renderOrder={9}>
        <planeGeometry args={[artworkWidth - 0.22, artworkHeight - 0.22]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.035} depthWrite={false} />
      </mesh>
    </group>
  );
}

function StudioDisplayWall({
  videoTexture,
  fallbackVisible,
}: {
  videoTexture: THREE.VideoTexture | null;
  fallbackVisible: boolean;
}) {
  const screenWidth = 3.2;
  const screenHeight = 1.8;

  return (
    <group>
      {/* 1. Main outer wood casing (backplane) */}
      <mesh position={[0, 0, -0.08]} castShadow receiveShadow>
        <boxGeometry args={[3.98, 2.44, 0.10]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.72} metalness={0.06} />
      </mesh>

      {/* 2. Inner dark wood casing */}
      <mesh position={[0, 0.03, -0.04]} castShadow receiveShadow>
        <boxGeometry args={[3.72, 2.16, 0.06]} />
        <meshStandardMaterial color="#1c130e" roughness={0.84} metalness={0.08} />
      </mesh>

      {/* 3. The black panel behind the screen */}
      <mesh position={[0, 0.015, -0.01]} castShadow receiveShadow>
        <boxGeometry args={[3.46, 1.98, 0.04]} />
        <meshStandardMaterial color="#050505" roughness={0.9} metalness={0.08} />
      </mesh>

      {/* 4. Raised front bezel (top/bottom/sides) defining the screen cavity */}
      {/* Top Bezel */}
      <mesh position={[0, 0.95, 0.025]} castShadow>
        <boxGeometry args={[3.42, 0.06, 0.05]} />
        <meshStandardMaterial color="#0b0b0b" roughness={0.62} metalness={0.22} />
      </mesh>
      {/* Bottom Bezel */}
      <mesh position={[0, -0.95, 0.025]} castShadow>
        <boxGeometry args={[3.42, 0.06, 0.05]} />
        <meshStandardMaterial color="#0b0b0b" roughness={0.62} metalness={0.22} />
      </mesh>
      {/* Left Bezel */}
      <mesh position={[-1.71, 0, 0.025]} castShadow>
        <boxGeometry args={[0.06, 1.94, 0.05]} />
        <meshStandardMaterial color="#0b0b0b" roughness={0.62} metalness={0.22} />
      </mesh>
      {/* Right Bezel */}
      <mesh position={[1.71, 0, 0.025]} castShadow>
        <boxGeometry args={[0.06, 1.94, 0.05]} />
        <meshStandardMaterial color="#0b0b0b" roughness={0.62} metalness={0.22} />
      </mesh>

      {/* Glowing inner edge for the bezel */}
      <mesh position={[0, 0.92, 0.015]}>
        <boxGeometry args={[3.22, 0.018, 0.02]} />
        <meshBasicMaterial color="#d49b62" transparent opacity={0.16} />
      </mesh>
      <mesh position={[-1.61, 0, 0.015]}>
        <boxGeometry args={[0.018, 1.82, 0.02]} />
        <meshBasicMaterial color="#d49b62" transparent opacity={0.08} />
      </mesh>
      <mesh position={[1.61, 0, 0.015]}>
        <boxGeometry args={[0.018, 1.82, 0.02]} />
        <meshBasicMaterial color="#d49b62" transparent opacity={0.12} />
      </mesh>

      {/* Bottom shadow lip */}
      <mesh position={[0, -1.08, 0.01]} receiveShadow>
        <boxGeometry args={[2.86, 0.1, 0.03]} />
        <meshStandardMaterial color="#24160f" roughness={0.52} metalness={0.14} />
      </mesh>

      {/* 5. The Video Display Surface (Front-most plain, properly placed above the black panel) */}
      <mesh position={[0, 0, 0.011]} renderOrder={20}>
        <planeGeometry args={[screenWidth, screenHeight]} />
        <meshBasicMaterial
          map={videoTexture && (videoTexture.image?.width > 0) ? videoTexture : null}
          color={videoTexture && (videoTexture.image?.width > 0) ? "#ffffff" : "#0d0d0d"}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* 6. Fallback Branding Layer */}
      {fallbackVisible && (
        <Thr3StyleScreenBranding
          screenUrl="/textures/branding/logo3s.jpeg"
          panelHeight={screenHeight}
          showBase={false}
          position={[0, 0, 0.012]}
        />
      )}
    </group>
  );
}

function Thr3StyleScreenBranding({ screenUrl, panelHeight = 0.92, showBase = true, ...props }: { screenUrl: string, panelHeight?: number, showBase?: boolean } & SceneObjectProps) {
  const sourceTexture = useTexture(screenUrl) as THREE.Texture;
  const screenTexture = useMemo(() => {
    const clone = sourceTexture.clone();
    clone.colorSpace = THREE.SRGBColorSpace;
    clone.minFilter = THREE.LinearFilter;
    clone.magFilter = THREE.LinearFilter;
    clone.needsUpdate = true;
    return clone;
  }, [sourceTexture]);
  const screenAspect = useMemo(() => {
    const image = screenTexture.image as { width?: number; height?: number } | undefined;
    if (image?.width && image?.height) {
      return image.width / image.height;
    }
    return 1344 / 768;
  }, [screenTexture]);
  const panelWidth = panelHeight * screenAspect;

  return (
    <group {...props}>
      {showBase && (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[panelWidth + 0.02, panelHeight + 0.02, 0.02]} />
          <meshStandardMaterial color="#06080a" roughness={0.94} metalness={0.04} />
        </mesh>
      )}
      <mesh position={[0, 0, showBase ? 0.012 : 0.001]} renderOrder={4}>
        <planeGeometry args={[panelWidth, panelHeight]} />
        <meshBasicMaterial map={screenTexture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function AutoCenteredModel({ url, ...props }: { url: string } & SceneObjectProps) {
  const { scene, animations } = useGLTF(url) as { scene: THREE.Group, animations: THREE.AnimationClip[] };
  const groupRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, groupRef);

  const processed = useMemo(() => {
    const clone = scene.clone(true);

    // Force double-side rendering, ensure visibility.
    // frustumCulled=false on imported models — GLTF bounding spheres are unreliable
    // after clone+recenter, causing false culling and visual regressions.
    clone.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.visible = true;
        node.frustumCulled = false;
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((mat) => {
            mat.side = THREE.DoubleSide;
            mat.transparent = false;
            mat.opacity = 1;
            mat.visible = true;
            mat.needsUpdate = true;
          });
        }
      }
    });

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // If bounding box is valid, center it
    if (size.length() > 0.0001) {
      clone.position.sub(center);
    }

    return clone;
  }, [scene, url]);

  const [isOpen, setIsOpen] = useState(false);

  const handleInteract = useCallback((e: any) => {
    e.stopPropagation();
    if (actions) {
      setIsOpen(prev => {
        const nextState = !prev;
        Object.values(actions).forEach(action => {
          if (action) {
            action.paused = false;
            action.timeScale = nextState ? 1 : -1;
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            
            // If opening, ensure we play from start
            if (nextState) {
              if (action.time === 0 || action.time >= action.getClip().duration) {
                action.time = 0;
              }
            } else {
              // If closing, ensure we play from the end
              if (action.time === 0 || action.time >= action.getClip().duration) {
                action.time = action.getClip().duration;
              }
            }
            action.play();
          }
        });
        return nextState;
      });
    }
  }, [actions]);

  return (
    <group ref={groupRef} onClick={handleInteract} {...props}>
      <primitive object={processed} />
    </group>
  );
}

function SofaRaw() {
  const { scene } = useGLTF('/models/optimized/sofa.glb') as { scene: THREE.Group };
  const processed = useMemo(() => {
    const clone = scene.clone(true);

    // Force materials. frustumCulled=false — see AutoCenteredModel note above.
    clone.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.frustumCulled = false;
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        mats.forEach((mat) => {
          if (mat) {
            mat.side = THREE.DoubleSide;
            mat.transparent = false;
            mat.opacity = 1;
            mat.needsUpdate = true;
          }
        });
      }
    });

    // updateMatrixWorld so bbox includes full hierarchy transforms
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());

    // Shift entire root so center is at [0,0,0] in local space,
    // BEFORE scale is applied by the parent group
    clone.position.sub(center);

    return clone;
  }, [scene]);

  return <primitive object={processed} />;
}

export function CreatorRoomMVP({ position = [0, 0, 0], rotation = [0, 0, 0], onExit }: { position?: [number, number, number], rotation?: [number, number, number], onExit?: () => void }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const spotLightTarget = useMemo(() => new THREE.Object3D(), []);

  const openHud = useHudStore((s) => s.openHud);
  const closeHud = useHudStore((s) => s.closeHud);
  const isOpen = useHudStore((s) => s.isOpen);
  const masterVideoRef = useHudStore((s) => s.masterVideoRef);
  const [laptopHovered, setLaptopHovered] = useState(false);
  const laptopPlaneRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const hudCooldownRef = useRef(0);

  // Blokuj re-open HUD przez 2s po zamknięciu (niezależnie czy przez E, klik, czy guzik Close)
  // Cooldown ustawiany synchronicznie w toggleHud() + useEffect jako safety net dla Close buttona
  useEffect(() => {
    if (!isOpen) {
      hudCooldownRef.current = performance.now() + 2000;
    }
  }, [isOpen]);

  function toggleHud() {
    const now = performance.now();
    if (!isOpen && now < hudCooldownRef.current) return;
    if (isOpen) {
      closeHud();
      hudCooldownRef.current = performance.now() + 2000;
    } else {
      openHud('master_catalog');
    }
  }

  // E key opens HUD when crosshair is on the laptop screen
  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const forward = new THREE.Vector3(0, 0, -1);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat) return;

      // Always check if looking at the laptop plane (works with or without pointer lock)
      if (laptopPlaneRef.current) {
        forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
        raycaster.set(camera.position, forward);
        const hits = raycaster.intersectObject(laptopPlaneRef.current);
        if (hits.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          requestAnimationFrame(() => toggleHud());
          return;
        }
      }

      // Fallback: mouse hovering over laptop (not pointer-locked)
      if (laptopHovered) {
        e.preventDefault();
        requestAnimationFrame(() => toggleHud());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [laptopHovered, isOpen, camera]);

  // diagnostic: confirm re-renders happen when masterVideoRef changes
  // console.log('[MVP] render – masterVideoRef:', !!masterVideoRef);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Native Video Texture Pipeline + Selfie Camera Override
  // ══════════════════════════════════════════════════════════════════════════
  const [videoTex, setVideoTex] = useState<THREE.VideoTexture | null>(null);
  const camEnabled = useHudStore(s => s.camEnabled);
  const camFacingMode = useHudStore(s => s.camFacingMode);
  const camVideoElement = useHudStore(s => s.camVideoElement);
  const [camTex, setCamTex] = useState<THREE.VideoTexture | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);

  // Selfie camera toggle — prefers persistent camVideoElement, falls back to DOM-attached el
  useEffect(() => {
    if (!camEnabled) {
      camStreamRef.current?.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
      if (camVideoElement) {
        camVideoElement.pause();
        camVideoElement.srcObject = null;
      }
      if (camTex) { camTex.dispose(); setCamTex(null); }
      return;
    }

    let cancelled = false;
    let fallbackEl: HTMLVideoElement | null = null;

    const videoEl: HTMLVideoElement | null = camVideoElement ?? (() => {
      console.log('[SelfieCam] camVideoElement is null, creating fallback DOM element');
      const el = document.createElement('video');
      el.muted = true;
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.001;pointer-events:none';
      document.body.appendChild(el);
      fallbackEl = el;
      return el;
    })();

    if (!videoEl) {
      useHudStore.getState().setCamEnabled(false);
      return;
    }

    console.log('[SelfieCam] Starting getUserMedia, facing:', camFacingMode, 'videoEl:', videoEl === camVideoElement ? 'store' : 'fallback');

    if (!navigator.mediaDevices) {
      console.error('[SelfieCam] navigator.mediaDevices is not available — need HTTPS');
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: camFacingMode },
      audio: false,
    }).then(stream => {
      if (cancelled) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      console.log('[SelfieCam] Got stream, tracks:', stream.getTracks().length);
      camStreamRef.current = stream;
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});

      // Czekaj na loadedmetadata — inaczej VideoTexture ma 0×0 = biały ekran
      function createCamTex() {
        if (cancelled) return;
        if (videoEl!.videoWidth === 0 || videoEl!.videoHeight === 0) {
          videoEl!.addEventListener('loadedmetadata', createCamTex, { once: true });
          return;
        }
        console.log('[SelfieCam] Creating VideoTexture:', videoEl!.videoWidth, 'x', videoEl!.videoHeight);
        const tex = new THREE.VideoTexture(videoEl!);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        setCamTex(tex as any);
      }
      createCamTex();
    }).catch(err => {
      if (cancelled) return;
      console.warn('[SelfieCam] getUserMedia failed:', err.message);
    });

    return () => {
      cancelled = true;
      camStreamRef.current?.getTracks().forEach(t => t.stop());
      camStreamRef.current = null;
      if (fallbackEl && fallbackEl.parentNode) {
        fallbackEl.parentNode.removeChild(fallbackEl);
      }
      setCamTex(prev => {
        if (prev) prev.dispose();
        return null;
      });
    };
  }, [camEnabled, camFacingMode, camVideoElement]);

  const screenTex = camEnabled ? (camTex || null) : videoTex;

  useEffect(() => {
    const video: HTMLVideoElement | null = masterVideoRef || document.querySelector('video');
    if (!video) {
      setVideoTex(null);
      return;
    }

    // Norrow to non-null for closure
    const vid = video;
    let cancelled = false;

    function createTex() {
      if (cancelled) return;
      // Video musi mieć załadowane metadane — inaczej dimensions 0x0 = black screen
      if (vid.videoWidth === 0 || vid.videoHeight === 0) {
        const onMeta = () => {
          vid.removeEventListener('loadedmetadata', onMeta);
          createTex();
        };
        vid.addEventListener('loadedmetadata', onMeta, { once: true });
        // Spróbuj też load() jeśli src już jest ale meta niezaładowane
        if (vid.src && vid.readyState < 2) vid.load();
        return;
      }

      const tex = new THREE.VideoTexture(vid);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.format = THREE.RGBAFormat;
      setVideoTex(tex);
    }

    createTex();

    return () => {
      cancelled = true;
      setVideoTex(prev => {
        if (prev) prev.dispose();
        return null;
      });
    };
  }, [masterVideoRef]);

  useFrame(({ invalidate }) => {
    const activeTex = screenTex;
    if (activeTex) {
      // Zawsze invalidate gdy mamy aktywną teksturę — video/cam wymaga ciągłego odświeżania
      invalidate();
      // Upewnij się że tekstura czyta aktualny frame z video elementu
      if (!activeTex.image) return;
      const vid = activeTex.image as HTMLVideoElement;
      if (vid && vid.readyState >= 2) {
        activeTex.needsUpdate = true;
      }
    }
  });

  const tableControls = useControls('Editing Table', {
    posX: { value: 3.5, min: -10, max: 10, step: 0.1 },
    posY: { value: -0.1, min: -5, max: 5, step: 0.1 },
    posZ: { value: -3.4, min: -15, max: 10, step: 0.1 },
    rotY: { value: 0, min: -180, max: 180, step: 1 },
    scale: { value: 1.85, min: 0.1, max: 5, step: 0.05 },
  });

  const hudControls = useControls('HUD Screen', {
    hudPosX: { value: 3.6, min: -10, max: 10, step: 0.1 },
    hudPosY: { value: 3.0, min: -5, max: 10, step: 0.1 },
    hudPosZ: { value: -5.6, min: -15, max: 10, step: 0.1 },
    hudRotX: { value: 0, min: -180, max: 180, step: 1 },
    hudRotY: { value: 0, min: -180, max: 180, step: 1 },
    hudRotZ: { value: 0, min: -180, max: 180, step: 1 },
    hudScale: { value: 1.55, min: 0.1, max: 5, step: 0.05 },
  });

  const lightControls = useControls('Lighting', {
    lightPosX: { value: -3.6, min: -10, max: 10, step: 0.1 },
    lightPosY: { value: 5.3, min: 0, max: 10, step: 0.1 },
    lightPosZ: { value: -6.3, min: -15, max: 10, step: 0.1 },
    conePosX: { value: -3.0, min: -10, max: 10, step: 0.1 },
    conePosY: { value: 4.6, min: 0, max: 10, step: 0.1 },
    conePosZ: { value: -5.5, min: -15, max: 10, step: 0.1 }, // moved even further forward to clear wall textures
    targetPosX: { value: 7.2, min: -10, max: 10, step: 0.1 },
    targetPosY: { value: 4.2, min: 0, max: 10, step: 0.1 },
    targetPosZ: { value: 9.8, min: -15, max: 10, step: 0.1 },
  });

  const boothControls = useControls('Vocal Booth Glass', {
    posX:   { value: -6.7,  min: -7.2, max: -6.2, step: 0.01 }, // left wall depth
    posY:   { value: 2.2,   min: 0,    max: 10,   step: 0.1 },
    posZ:   { value: -2.5,  min: -5.2, max: 4.8,  step: 0.1 },  // along left wall
    rotY:   { value: 0,     min: -12,  max: 12,   step: 1 },
    width:  { value: 4.4,   min: 1.0,  max: 6.2,  step: 0.1 },
    height: { value: 1.4,   min: 0.6,  max: 2.5,  step: 0.1 },
  });

  const decorControls = useControls('Room Decor', {
    chairPosX: { value: 3.8, min: -10, max: 10, step: 0.1 },
    chairPosY: { value: 0.7, min: -5, max: 5, step: 0.1 },
    chairPosZ: { value: -2.0, min: -10, max: 10, step: 0.1 }, // Tucked in more towards the desk
    chairRotY: { value: -78, min: -180, max: 180, step: 1 },
    chairScale: { value: 0.5, min: 0.1, max: 5, step: 0.05 },

    organizerPosX: { value: 4.85, min: -10, max: 10, step: 0.05 },
    organizerPosY: { value: 1.55, min: -5, max: 5, step: 0.01 },
    organizerPosZ: { value: -4.4, min: -10, max: 10, step: 0.05 },
    organizerRotY: { value: 0, min: -180, max: 180, step: 1 },
    organizerScale: { value: 1.96, min: 0.01, max: 2, step: 0.01 },

    buttonPosX: { value: 6.3, min: -10, max: 10, step: 0.1 },
    buttonPosY: { value: 1.9, min: -5, max: 5, step: 0.1 },
    buttonPosZ: { value: -2.2, min: -10, max: 10, step: 0.1 },
    buttonRotY: { value: 180, min: -180, max: 180, step: 1 },
    buttonScale: { value: 0.7, min: 0.1, max: 10, step: 0.1 },

    laptopPosX: { value: 6.0, min: -10, max: 10, step: 0.1 },
    laptopPosY: { value: 1.4, min: -5, max: 5, step: 0.05 },
    laptopPosZ: { value: -2.0, min: -10, max: 10, step: 0.1 },
    laptopRotY: { value: -157, min: -180, max: 180, step: 1 },
    laptopScale: { value: 3.3, min: 0.01, max: 50, step: 0.1 },

    sofaPosX: { value: 4.2, min: -10, max: 10, step: 0.1 },
    sofaPosY: { value: 0.7, min: -5, max: 5, step: 0.1 },
    sofaPosZ: { value: 3.2, min: -10, max: 10, step: 0.1 },
    sofaRotY: { value: -180, min: -180, max: 180, step: 1 },
    sofaScale: { value: 0.72, min: 0.01, max: 5, step: 0.01 },

    rtvPosX: { value: -6.0, min: -12, max: 12, step: 0.1 },
    rtvPosY: { value: 0.60, min: -5, max: 5, step: 0.05 },
    rtvPosZ: { value: 3.2, min: -12, max: 12, step: 0.1 },
    rtvRotY: { value: 90, min: -180, max: 180, step: 1 },
    rtvScale: { value: 2.5, min: 0.01, max: 10, step: 0.1 },
  });

  const logoControls = useControls('Wall Logo', {
    logoPosX: { value: -2.8, min: -10, max: 10, step: 0.1 },
    logoPosY: { value: 3.0, min: 0, max: 10, step: 0.1 },
    logoPosZ: { value: -5.6, min: -15, max: 10, step: 0.01 },
    logoScale: { value: 1.4, min: 0.1, max: 5, step: 0.1 },
  });

  const artControls = useControls('Wall Artwork', {
    offsetX: { value: 0, min: -0.5, max: 0.5, step: 0.001 },
    offsetY: { value: 0, min: -0.5, max: 0.5, step: 0.001 },
    repeatX: { value: 1, min: 0.5, max: 2, step: 0.001 },
    repeatY: { value: 1, min: 0.5, max: 2, step: 0.001 },
  });

  const roomBackZ = -6;
  const roomFrontZ = 7;
  const leftWallX = -7;
  const wallHeight = 5.2;
  const boothWindowBottom = boothControls.posY - boothControls.height / 2;
  const boothWindowTop = boothControls.posY + boothControls.height / 2;
  const boothWindowBackZ = boothControls.posZ - boothControls.width / 2;
  const boothWindowFrontZ = boothControls.posZ + boothControls.width / 2;
  const boothBackSegmentLength = boothWindowBackZ - roomBackZ;
  const boothFrontSegmentLength = roomFrontZ - boothWindowFrontZ;

  return (
    <group position={new THREE.Vector3(...position)} rotation={new THREE.Euler(...rotation)}>
      <ambientLight intensity={0.2} color="#ddeeff" />

      {/* Górny sufit — 2 słabsze pointLight zamiast przepalającego directionala */}
      <pointLight position={[0, 4.9, 0]} intensity={0.9} color="#ffa95c" distance={10} decay={1.5} />
      <pointLight position={[-4, 4.9, -4]} intensity={0.8} color="#ffa95c" distance={8} decay={1.5} />

      {/* Desk SpotLight (Soft & Focused) */}
      <spotLight
        position={[3.5, 4.5, -3.4]}
        intensity={40}
        angle={0.8}
        penumbra={0.8}
        decay={1.5}
        color="#ffecd6"
        distance={9}
        castShadow
      >
        <object3D position={[3.5, 0, -3.4]} attach="target" />
      </spotLight>

      {/* RTV Cabinet SpotLight (Soft) */}
      <spotLight
        position={[-5.0, 4.0, 3.2]}
        intensity={35}
        angle={0.9}
        penumbra={1}
        decay={1.5}
        color="#ffe4c4"
        distance={8}
        castShadow
      >
        <object3D position={[-6.0, 0.6, 3.2]} attach="target" />
      </spotLight>

      {/* Soft fill z frontu */}
      <directionalLight position={[0, 3, 5]} intensity={0.4} color="#ffffff" />

      {/* STAGE 1: Static Architecture (Fastest Load) */}
      <Suspense fallback={null}>
        {/* Floor - Diamond Plate */}
        <DiamondPlateFloor args={[14.2, 15.2]} position={[0, 0, -0.5]} />
        {/* Ceiling */}
        <AcousticFoamWall position={[0, 5.1, -0.5]} args={[14.2, 0.2, 15.2]} repeat={[14.2 / 2, 15.2 / 2]} />

        {/* Entrance Area -> Front Wall + Elevator Hole */}
        <group position={[0, 0, 7]}> {/* Z=7 is the front wall */}
          {/* Front Wall - Left of door */}
          <BrickWall 
            position={[-4.15, 2.5, 0]} 
            args={[5.7, 5.2, 0.5]} 
          />
          {/* Front Wall - Right of door */}
          <BrickWall 
            position={[4.15, 2.5, 0]} 
            args={[5.7, 5.2, 0.5]} 
          />
          {/* Front Wall - Above door */}
          <BrickWall 
            position={[0, 4.6, 0]} 
            args={[2.6, 1.0, 0.5]} 
          />
          
          {/* RoomDoor removed - we use the physical ElevatorA now */}
          {/* Portal effect — DISABLED */}
          {/* {!isMobile && (
            <PortalEffect position={[0, 2.5, 0.3]} radius={1.2} active={true} />
          )} */}
          <pointLight position={[0, 2.5, -2]} intensity={5} color="#ff8c42" distance={6} decay={2} />
        </group>

        {/* Back wall — ciepły akcent */}
        <pointLight position={[1.9, 3.0, -4.8]} intensity={3.5} color="#ffe0a0" distance={5} decay={2} />
        {/* Cool rim fill — przełamuje pomarańczową paletę */}
        <pointLight position={[-6.5, 4.0, -4.5]} intensity={2.0} color="#8899cc" distance={10} decay={2} />
        <mesh position={[0, 2.5, -6]} castShadow receiveShadow>
          <boxGeometry args={[14, 5, 0.5]} />
          <meshStandardMaterial color="#5c3a1e" roughness={0.65} metalness={0.05} />
        </mesh>

        <TechnicalTrim position={[-6.72, 2.5, -5.74]} args={[0.06, 5.0, 0.04]} />
        <TechnicalTrim position={[6.72, 2.5, -5.74]} args={[0.06, 5.0, 0.04]} />
        <TechnicalTrim position={[0, 4.97, -5.74]} args={[13.44, 0.06, 0.04]} />
        <TechnicalTrim position={[0, 0.03, -5.74]} args={[13.44, 0.06, 0.04]} />

        {/* Side walls architecture */}
        {/* Left acoustic wall: segmented around the horizontal vocal booth window to keep it clear. */}
        {boothBackSegmentLength > 0.08 && (
          <AcousticFoamWall
            position={[leftWallX, wallHeight / 2, roomBackZ + boothBackSegmentLength / 2]}
            rotation={[0, Math.PI / 2, 0]}
            args={[boothBackSegmentLength, wallHeight, 0.5]}
            repeat={[boothBackSegmentLength / 2, wallHeight / 2]}
            textureOffset={[0, 0]}
          />
        )}
        {boothFrontSegmentLength > 0.08 && (
          <AcousticFoamWall
            position={[leftWallX, wallHeight / 2, boothWindowFrontZ + boothFrontSegmentLength / 2]}
            rotation={[0, Math.PI / 2, 0]}
            args={[boothFrontSegmentLength, wallHeight, 0.5]}
            repeat={[boothFrontSegmentLength / 2, wallHeight / 2]}
            textureOffset={[(boothWindowFrontZ - roomBackZ) / 2, 0]}
          />
        )}
        {boothWindowBottom > 0.08 && (
          <AcousticFoamWall
            position={[leftWallX, boothWindowBottom / 2, boothControls.posZ]}
            rotation={[0, Math.PI / 2, 0]}
            args={[boothControls.width, boothWindowBottom, 0.5]}
            repeat={[boothControls.width / 2, boothWindowBottom / 2]}
            textureOffset={[(boothWindowBackZ - roomBackZ) / 2, 0]}
          />
        )}
        {boothWindowTop < wallHeight - 0.08 && (
          <AcousticFoamWall
            position={[leftWallX, (boothWindowTop + wallHeight) / 2, boothControls.posZ]}
            rotation={[0, Math.PI / 2, 0]}
            args={[boothControls.width, wallHeight - boothWindowTop, 0.5]}
            repeat={[boothControls.width / 2, (wallHeight - boothWindowTop) / 2]}
            textureOffset={[(boothWindowBackZ - roomBackZ) / 2, boothWindowTop / 2]}
          />
        )}

        {/* Right acoustic wall remains the desk/screen zone boundary. */}
        <AcousticFoamWall position={[7, wallHeight / 2, -0.5]} rotation={[0, -Math.PI / 2, 0]} args={[15.2, wallHeight, 0.5]} />
      </Suspense>

      {/* STAGE 2: Primary Furniture (Mid-weight assets) */}
      <Suspense fallback={null}>
        {/* Production Desk */}
        <EditingTable 
          position={[tableControls.posX, tableControls.posY, tableControls.posZ]} 
          rotation={[0, THREE.MathUtils.degToRad(tableControls.rotY), 0]} 
          scale={tableControls.scale}
        />

        {/* Vocal booth interior sits outside the left wall */}
        <group position={[leftWallX - 0.06, 0, boothControls.posZ]} rotation={[0, Math.PI / 2, 0]}>
          <VocalBooth />
        </group>

        {/* RTV Cabinet — heavy 4K model, distance-culled */}
        <DistanceCulledModel maxDistance={16}>
          <AutoCenteredModel
            url="/models/optimized/modern_wooden_cabinet.glb"
            position={[decorControls.rtvPosX, decorControls.rtvPosY, decorControls.rtvPosZ]}
            rotation={[0, THREE.MathUtils.degToRad(decorControls.rtvRotY), 0]}
            scale={decorControls.rtvScale}
          />
        </DistanceCulledModel>
      </Suspense>

      {/* STAGE 3: Props & Interactive Elements (Heaviest/Lowest Priority) */}
      <Suspense fallback={null}>

        {/* Office Chair */}
        <AutoCenteredModel 
          url="/models/optimized/office_chair.glb" 
          position={[decorControls.chairPosX, decorControls.chairPosY, decorControls.chairPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.chairRotY), 0]}
          scale={decorControls.chairScale}
        />

        {/* Organizer on table */}
        <AutoCenteredModel 
          url="/models/optimized/organizer.glb" 
          position={[decorControls.organizerPosX, decorControls.organizerPosY, decorControls.organizerPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.organizerRotY), 0]}
          scale={decorControls.organizerScale}
        />

        {/* Golden Play Button as a secondary accent near the desk zone */}
        <GoldenPlayButton 
          position={[decorControls.buttonPosX, decorControls.buttonPosY, decorControls.buttonPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.buttonRotY), 0]}
          scale={decorControls.buttonScale}
        />

        {/* Framed 3S artwork on the brown identity wall */}
        <Thr3StyleWallArt
          url="/textures/branding/logo3s.jpeg"
          position={[logoControls.logoPosX, logoControls.logoPosY, logoControls.logoPosZ]}
          scale={[logoControls.logoScale, logoControls.logoScale, 1]}
          offsetX={artControls.offsetX}
          offsetY={artControls.offsetY}
          repeatX={artControls.repeatX}
          repeatY={artControls.repeatY}
        />

        {/* iPad Pro on table (replacing laptop) */}
        <AutoCenteredModel 
          url="/models/optimized/ipad_pro_2024.glb" 
          position={[decorControls.laptopPosX, decorControls.laptopPosY, decorControls.laptopPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.laptopRotY), 0]}
          scale={decorControls.laptopScale}
        />

        {/* Sofa in the room — heavy model, distance-culled */}
        <DistanceCulledModel maxDistance={16}>
          <group
            position={[decorControls.sofaPosX, decorControls.sofaPosY, decorControls.sofaPosZ]}
            rotation={[0, THREE.MathUtils.degToRad(decorControls.sofaRotY), 0]}
            scale={decorControls.sofaScale}
          >
            {/* SofaRaw self-centers via bbox; scale is on the GROUP, not on primitive */}
            <SofaRaw />
          </group>
        </DistanceCulledModel>

        {/* Horizontal vocal booth window integrated into the left acoustic wall. */}
        <group
          position={[boothControls.posX, boothControls.posY, boothControls.posZ]}
          rotation={[0, THREE.MathUtils.degToRad(boothControls.rotY), 0]}
        >
          <mesh position={[-0.04, boothControls.height / 2 + 0.16, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.24, boothControls.width + 0.65]} />
            <meshStandardMaterial color="#030303" roughness={0.88} metalness={0.18} />
          </mesh>
          <mesh position={[-0.04, -boothControls.height / 2 - 0.16, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.24, boothControls.width + 0.65]} />
            <meshStandardMaterial color="#030303" roughness={0.88} metalness={0.18} />
          </mesh>
          <mesh position={[-0.04, 0, -boothControls.width / 2 - 0.16]} castShadow receiveShadow>
            <boxGeometry args={[0.08, boothControls.height + 0.32, 0.24]} />
            <meshStandardMaterial color="#030303" roughness={0.88} metalness={0.18} />
          </mesh>
          <mesh position={[-0.04, 0, boothControls.width / 2 + 0.16]} castShadow receiveShadow>
            <boxGeometry args={[0.08, boothControls.height + 0.32, 0.24]} />
            <meshStandardMaterial color="#030303" roughness={0.88} metalness={0.18} />
          </mesh>
          <mesh renderOrder={2}>
            <boxGeometry args={[0.06, boothControls.height, boothControls.width]} />
            <meshStandardMaterial
              color="#cfefff"
              transparent
              opacity={0.055}
              roughness={0.02}
              metalness={0}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0.045, boothControls.height * 0.23, 0]} rotation={[0, Math.PI / 2, 0]} renderOrder={3}>
            <planeGeometry args={[boothControls.width * 0.82, 0.035]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.047, -boothControls.height * 0.18, 0]} rotation={[0, Math.PI / 2, 0]} renderOrder={3}>
            <planeGeometry args={[boothControls.width * 0.64, 0.024]} />
            <meshBasicMaterial color="#bfefff" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <TechnicalTrim position={[0.08, boothControls.height / 2 + 0.12, 0]} args={[0.16, 0.16, boothControls.width + 0.64]} />
          <TechnicalTrim position={[0.08, -boothControls.height / 2 - 0.12, 0]} args={[0.16, 0.16, boothControls.width + 0.64]} />
          <TechnicalTrim position={[0.08, 0, -boothControls.width / 2 - 0.12]} args={[0.16, boothControls.height + 0.32, 0.16]} />
          <TechnicalTrim position={[0.08, 0, boothControls.width / 2 + 0.12]} args={[0.16, boothControls.height + 0.32, 0.16]} />
        </group>

        {/* Vocal booth interior sits outside the left wall, aligned with the window. */}
        <group position={[leftWallX - 0.06, 0, boothControls.posZ]} rotation={[0, Math.PI / 2, 0]}>
          <VocalBooth />
        </group>

        {/* Focal screen: always rendered, texture swapped imperatively. */}
        <group
           position={[hudControls.hudPosX, hudControls.hudPosY, hudControls.hudPosZ]}
           rotation={[
             THREE.MathUtils.degToRad(hudControls.hudRotX),
             THREE.MathUtils.degToRad(hudControls.hudRotY),
             THREE.MathUtils.degToRad(hudControls.hudRotZ)
           ]}
           scale={[hudControls.hudScale, hudControls.hudScale, hudControls.hudScale]}
        >
           <pointLight position={[0, 0, 0.34]} intensity={4.0} color="#ff8c42" distance={4.5} decay={2} />
           <StudioDisplayWall
             videoTexture={screenTex}
             fallbackVisible={!screenTex}
           />
        </group>

        {/* ── AUDIO REACTIVE CEILING NEON ── */}
        <RoomPerimeterNeon y={5.05} />

        {/* ── LAPTOP INTERACTIVE ZONE – otwiera HUD panel ── */}
        <group
          position={[decorControls.laptopPosX, decorControls.laptopPosY, decorControls.laptopPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.laptopRotY), 0]}
          scale={[decorControls.laptopScale, decorControls.laptopScale, decorControls.laptopScale]}
        >
          {/* Invisible hit-test plane — większa, skalowana z iPadem, bez Y-offset */}
          <mesh
            ref={laptopPlaneRef}
            onClick={(e) => {
              e.stopPropagation();
              if (document.pointerLockElement) {
                document.exitPointerLock();
              }
              requestAnimationFrame(() => toggleHud());
            }}
            onPointerDown={(e) => {
              // Duplikacja onClick dla lepszej responsywności (touch/pointer)
              e.stopPropagation();
              if (document.pointerLockElement) {
                document.exitPointerLock();
              }
              requestAnimationFrame(() => toggleHud());
            }}
            onPointerOver={() => setLaptopHovered(true)}
            onPointerOut={() => setLaptopHovered(false)}
          >
            <planeGeometry args={[2.0, 1.5]} />
            <meshBasicMaterial transparent opacity={0.001} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>

          {/* Hover hint + E key interaction */}
          {laptopHovered && (
            <Html position={[0, 1.1, 0]} center pointerEvents="none" zIndexRange={[10, 11]}>
              <div style={{
                fontFamily: 'monospace',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                letterSpacing: '0.2em',
                background: 'rgba(0,0,0,0.85)',
                padding: '8px 18px',
                borderRadius: 6,
                border: '1px solid rgba(255,140,66,0.6)',
                whiteSpace: 'nowrap',
                boxShadow: '0 0 12px rgba(255,140,66,0.3)',
              }}>
                {isOpen ? '[E] CLOSE STUDIO HUD' : '[E] OPEN STUDIO HUD'}
              </div>
            </Html>
          )}
        </group>

        {/* ── PARTICLE WAVE FLOOR — DISABLED */}
        {/* {!isMobile && <ParticleWaveFloor count={5000} size={16} />} */}

      </Suspense>
    </group>
  );
}
