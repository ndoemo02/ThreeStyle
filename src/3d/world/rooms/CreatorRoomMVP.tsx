'use client';

import { useState, useRef, Suspense, useEffect, useMemo, useCallback } from 'react';
import { Html, useTexture, useGLTF, useAnimations } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { EditingTable } from '../../modules/furniture/EditingTable';
import { DistanceCulledModel } from '../../systems/DistanceCulledModel';
import { VocalBooth } from './VocalBooth';
import { useHudStore } from '../../../stores/useHudStore';
import { CreatorRoomProfileContext, creatorModelUrl, creatorParameterMap, useCreatorRoomMobile } from './CreatorRoomProfile';
import { CreatorLightingProvider, CreatorRoomLightingRig, CreatorLight } from './CreatorLighting';
import { CreatorPerimeterLights } from './CreatorPerimeterLights';
import { prepareCreatorRoomMaterial, disposeCreatorRoomMaterials } from './creatorRoomMaterials';
import { useCreatorScreenTexture } from './useCreatorScreenTexture';
import { CreatorMediaSurface } from './CreatorMediaSurface';
import { useSceneInteraction } from '../../systems/useSceneInteraction';
import { isInteractionTap } from '../../systems/sceneInteractionPolicy';

// ══════════════════════════════════════════════════════════════════════════
// 0. Runtime loading diagnostics
// Heavy room assets are loaded by their owning components so mobile avoids eager GPU pressure.
// ══════════════════════════════════════════════════════════════════════════
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

const tableControls = {
  posX: 3.5,
  posY: -0.1,
  posZ: -3.4,
  rotY: 0,
  scale: 1.85,
};

const hudControls = {
  hudPosX: 3.6,
  hudPosY: 3.0,
  hudPosZ: -5.6,
  hudRotX: 0,
  hudRotY: 0,
  hudRotZ: 0,
  hudScale: 1.55,
};

const boothControls = {
  posX: -6.7,
  posY: 2.2,
  posZ: -2.5,
  rotY: 0,
  width: 4.4,
  height: 1.4,
};

const decorControls = {
  chairPosX: 3.8,
  chairPosY: 0.7,
  chairPosZ: -2.0,
  chairRotY: -78,
  chairScale: 0.5,
  organizerPosX: 4.85,
  organizerPosY: 1.55,
  organizerPosZ: -4.4,
  organizerRotY: 0,
  organizerScale: 1.96,
  buttonPosX: 6.3,
  buttonPosY: 1.9,
  buttonPosZ: -2.2,
  buttonRotY: 180,
  buttonScale: 0.7,
  laptopPosX: 6.0,
  laptopPosY: 1.4,
  laptopPosZ: -2.0,
  laptopRotY: -157,
  laptopScale: 3.3,
  sofaPosX: 4.2,
  sofaPosY: 0.7,
  sofaPosZ: 3.2,
  sofaRotY: -180,
  sofaScale: 0.72,
  rtvPosX: -6.0,
  rtvPosY: 0.60,
  rtvPosZ: 3.2,
  rtvRotY: 90,
  rtvScale: 2.5,
};

const logoControls = {
  logoPosX: -2.8,
  logoPosY: 3.0,
  logoPosZ: -5.6,
  logoScale: 1.4,
};

const artControls = {
  offsetX: 0,
  offsetY: 0,
  repeatX: 1,
  repeatY: 1,
};

function StageReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return null;
}

const globalTrimMaterial = new THREE.MeshStandardMaterial({ color: '#060504', roughness: 0.96, metalness: 0.02 });
const roomFallbackWallMaterial = new THREE.MeshStandardMaterial({ color: '#4b2f1f', roughness: 0.92 });
const roomFallbackSideMaterial = new THREE.MeshStandardMaterial({ color: '#12100e', roughness: 0.95 });
const roomFallbackFloorMaterial = new THREE.MeshStandardMaterial({ color: '#332820', roughness: 0.9 });

function TechnicalTrim({ args, position, rotation = [0, 0, 0] }: { args: [number, number, number], position: [number, number, number], rotation?: [number, number, number] }) {
  return <mesh position={position} rotation={rotation} castShadow receiveShadow material={globalTrimMaterial}><boxGeometry args={args} /></mesh>;
}

function BrickWall({ args, position }: { args: [number, number, number], position: [number, number, number] }) {
  const mobile = useCreatorRoomMobile();
  const { gl } = useThree();
  const anisotropy = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl]);
  const textures = useTexture([
    '/textures/runtime/bricks/color.webp',
    creatorParameterMap('bricks', 'ao', mobile),
    '/textures/runtime/bricks/normal.webp',
    creatorParameterMap('bricks', 'roughness', mobile),
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
      clone.anisotropy = anisotropy;
      clone.needsUpdate = true;
      return clone;
    });
  }, [textures, args, position, anisotropy]);

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
        color="#929292"
      />
    </mesh>
  );
}

export function AcousticFoamWall({ args, position, rotation = [0, 0, 0], repeat, textureOffset = [0, 0] }: { args: [number, number, number], position: [number, number, number], rotation?: [number, number, number], repeat?: [number, number], textureOffset?: [number, number] }) {
  const mobile = useCreatorRoomMobile();
  const { gl } = useThree();
  const anisotropy = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl]);
  const textures = useTexture([
    '/textures/runtime/acoustic/color.webp',
    '/textures/runtime/acoustic/normal.webp',
    creatorParameterMap('acoustic', 'roughness', mobile),
    creatorParameterMap('acoustic', 'metalness', mobile),
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
      clone.anisotropy = anisotropy;
      clone.needsUpdate = true;
      return clone;
    });
  }, [textures, args, repeat, textureOffset, anisotropy]);

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
        color="#2f2a25"
        normalScale={new THREE.Vector2(2.0, 2.0)}
        roughness={0.9}
      />
    </mesh>
  );
}

function DiamondPlateFloor({ args, position }: { args: [number, number], position: [number, number, number] }) {
  const mobile = useCreatorRoomMobile();
  const { gl } = useThree();
  const anisotropy = useMemo(() => Math.min(8, gl.capabilities.getMaxAnisotropy()), [gl]);
  const textures = useTexture([
    '/textures/runtime/diamond/color.webp',
    '/textures/runtime/diamond/normal.webp',
    creatorParameterMap('diamond', 'roughness', mobile),
    creatorParameterMap('diamond', 'metalness', mobile),
    '/textures/runtime/diamond/ao.webp',
  ]);

  const maps = useMemo(() => {
    return textures.map(tex => {
      const clone = tex.clone();
      clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
      clone.repeat.set(args[0] / 1.5, args[1] / 1.5);
      clone.anisotropy = anisotropy;
      clone.needsUpdate = true;
      return clone;
    });
  }, [textures, args, anisotropy]);

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
        color="#4a3329"
        normalScale={new THREE.Vector2(1.15, 1.15)}
        roughness={0.9}
        metalness={0.08}
      />
    </mesh>
  );
}

function RoomArchitectureFallback() {
  return (
    <group>
      <mesh position={[0, 0, -0.5]} rotation={[-Math.PI / 2, 0, 0]} material={roomFallbackFloorMaterial}>
        <planeGeometry args={[14.2, 15.2]} />
      </mesh>
      <mesh position={[0, 5.1, -0.5]} material={roomFallbackSideMaterial}>
        <boxGeometry args={[14.2, 0.2, 15.2]} />
      </mesh>
      <mesh position={[0, 2.5, -6]} material={roomFallbackWallMaterial}>
        <boxGeometry args={[14, 5, 0.5]} />
      </mesh>
      <mesh position={[3.45, 3.0, -5.68]}>
        <boxGeometry args={[4.1, 1.82, 0.08]} />
        <meshBasicMaterial color="#f1ebe4" toneMapped={false} />
      </mesh>
      <mesh position={[-2.65, 2.65, -5.68]}>
        <boxGeometry args={[2.15, 1.35, 0.08]} />
        <meshStandardMaterial color="#080605" roughness={0.82} metalness={0.12} />
      </mesh>
      <mesh position={[-7.02, 2.32, -2.55]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[3.95, 1.05, 0.08]} />
        <meshBasicMaterial color="#d8f1ff" transparent opacity={0.12} />
      </mesh>
      <mesh position={[-2.2, 0.72, -5.05]}>
        <boxGeometry args={[3.25, 0.72, 0.42]} />
        <meshStandardMaterial color="#5a321e" roughness={0.78} metalness={0.02} />
      </mesh>
      <mesh position={[-7, 2.6, -0.5]} rotation={[0, Math.PI / 2, 0]} material={roomFallbackSideMaterial}>
        <boxGeometry args={[15.2, 5.2, 0.5]} />
      </mesh>
      <mesh position={[7, 2.6, -0.5]} rotation={[0, -Math.PI / 2, 0]} material={roomFallbackSideMaterial}>
        <boxGeometry args={[15.2, 5.2, 0.5]} />
      </mesh>
      <group position={[0, 0, 7]}>
        <mesh position={[-4.15, 2.5, 0]} material={roomFallbackWallMaterial}>
          <boxGeometry args={[5.7, 5.2, 0.5]} />
        </mesh>
        <mesh position={[4.15, 2.5, 0]} material={roomFallbackWallMaterial}>
          <boxGeometry args={[5.7, 5.2, 0.5]} />
        </mesh>
        <mesh position={[0, 4.6, 0]} material={roomFallbackWallMaterial}>
          <boxGeometry args={[2.6, 1, 0.5]} />
        </mesh>
      </group>
    </group>
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
  const sourceTexture = useTexture(url) as THREE.Texture;
  const texture = useMemo(() => {
    const clone = sourceTexture.clone();
    if (url.includes('logo3s.jpeg')) {
      clone.wrapS = THREE.RepeatWrapping;
      clone.wrapT = THREE.RepeatWrapping;
      // offset.x: negative moves image right, positive moves image left
      clone.offset.set(offsetX, offsetY);
      clone.repeat.set(repeatX, repeatY);
    }
    clone.colorSpace = THREE.SRGBColorSpace;
    clone.needsUpdate = true;
    return clone;
  }, [sourceTexture, url, offsetX, offsetY, repeatX, repeatY]);

  useEffect(() => () => texture.dispose(), [texture]);

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
        <meshBasicMaterial map={texture} transparent alphaTest={0.02} side={THREE.DoubleSide} depthWrite={false} depthTest toneMapped={false} />
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
  videoTexture: THREE.Texture | null;
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

      {/* 5. The Video Display Surface. Skip the empty video plane so fallback branding stays visible. */}
      {videoTexture && (
        <CreatorMediaSurface texture={videoTexture} width={screenWidth} height={screenHeight} />
      )}

      {/* 6. Fallback Branding Layer */}
      {fallbackVisible && (
        <CreatorScreenFallback screenWidth={screenWidth} screenHeight={screenHeight} />
      )}
    </group>
  );
}

function CreatorScreenFallback({ screenWidth, screenHeight }: { screenWidth: number; screenHeight: number }) {
  return (
    <group position={[0, 0, 0.012]}>
      <mesh renderOrder={20}>
        <planeGeometry args={[screenWidth, screenHeight]} />
        <meshBasicMaterial color="#efe4d7" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.003]} renderOrder={21}>
        <planeGeometry args={[screenWidth * 0.88, screenHeight * 0.78]} />
        <meshBasicMaterial color="#f8f2ea" transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <mesh position={[0, -screenHeight * 0.34, 0.006]} renderOrder={22}>
        <planeGeometry args={[screenWidth * 0.48, 0.035]} />
        <meshBasicMaterial color="#8a4f2e" transparent opacity={0.42} toneMapped={false} />
      </mesh>
      <mesh position={[0, screenHeight * 0.32, 0.007]} renderOrder={22}>
        <planeGeometry args={[screenWidth * 0.22, 0.026]} />
        <meshBasicMaterial color="#2b211b" transparent opacity={0.18} toneMapped={false} />
      </mesh>
    </group>
  );
}

function prepareImportedRoomModel(root: THREE.Group) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;

    node.visible = true;
    node.frustumCulled = true;

    if (node.geometry) {
      if (!node.geometry.boundingSphere) node.geometry.computeBoundingSphere();
      if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    }

    if (!node.material) return;

    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const preparedMaterials = materials.map(prepareCreatorRoomMaterial);

    node.material = Array.isArray(node.material) ? preparedMaterials : preparedMaterials[0];
  });
}

function AutoCenteredModel({ url, ...props }: { url: string } & SceneObjectProps) {
  const mobile = useCreatorRoomMobile();
  const { scene, animations } = useGLTF(creatorModelUrl(url, mobile)) as { scene: THREE.Group, animations: THREE.AnimationClip[] };
  const groupRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, groupRef);

  const processed = useMemo(() => {
    const clone = scene.clone(true);

    prepareImportedRoomModel(clone);

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // If bounding box is valid, center it
    if (size.length() > 0.0001) {
      clone.position.sub(center);
    }

    clone.updateMatrixWorld(true);
    return clone;
  }, [scene]);

  useEffect(() => () => disposeCreatorRoomMaterials(processed), [processed]);

  const [, setIsOpen] = useState(false);

  const handleInteract = useCallback((e: ThreeEvent<MouseEvent>) => {
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

    prepareImportedRoomModel(clone);

    // updateMatrixWorld so bbox includes full hierarchy transforms
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());

    // Shift entire root so center is at [0,0,0] in local space,
    // BEFORE scale is applied by the parent group
    clone.position.sub(center);

    clone.updateMatrixWorld(true);
    return clone;
  }, [scene]);

  useEffect(() => () => disposeCreatorRoomMaterials(processed), [processed]);

  return <primitive object={processed} />;
}

export function CreatorRoomMVP({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onShellReady,
  mobile = false,
}: {
  position?: [number, number, number],
  rotation?: [number, number, number],
  onExit?: () => void,
  onShellReady?: () => void,
  mobile?: boolean,
}) {

  const openHud = useHudStore((s) => s.openHud);
  const closeHud = useHudStore((s) => s.closeHud);
  const isOpen = useHudStore((s) => s.isOpen);

  const plaqueRef = useRef<THREE.Group>(null);
  const deviceRef = useRef<THREE.Group>(null);
  const screenRef = useRef<THREE.Group>(null);
  const devicePointerStart = useRef<{ pointerId: number; clientX: number; clientY: number } | null>(null);
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
    if (!isOpen && now < hudCooldownRef.current) return false;
    if (isOpen) {
      closeHud();
      hudCooldownRef.current = performance.now() + 2000;
    } else {
      openHud('master_catalog');
    }
    return true;
  }

  const canOpenHud = () => !useHudStore.getState().isOpen && performance.now() >= hudCooldownRef.current;
  const plaqueInteraction = useSceneInteraction({
    object: plaqueRef, maxDistance: 3, canInteract: canOpenHud,
    activate: toggleHud, releasePointer: true,
  });
  const deviceInteraction = useSceneInteraction({
    object: deviceRef, maxDistance: 3, pointerMaxDistance: 20, canInteract: canOpenHud,
    activate: toggleHud, releasePointer: true,
  });
  const deviceScreenHovered = plaqueInteraction.isTargeted || deviceInteraction.isTargeted;

  const screenTex = useCreatorScreenTexture(screenRef, mobile);

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
    <CreatorRoomProfileContext.Provider value={mobile}>
    <CreatorLightingProvider>
    <group position={new THREE.Vector3(...position)} rotation={new THREE.Euler(...rotation)}>
      <CreatorRoomLightingRig />

      {/* STAGE 1: Static Architecture (Fastest Load) */}
      <Suspense fallback={<RoomArchitectureFallback />}>
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
        </group>

        <mesh position={[0, 2.5, -6]} castShadow receiveShadow>
          <boxGeometry args={[14, 5, 0.5]} />
          <meshStandardMaterial color="#4a2d1d" roughness={0.86} metalness={0.02} />
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
        <group position={[decorControls.rtvPosX, decorControls.rtvPosY, decorControls.rtvPosZ]} rotation={[0, THREE.MathUtils.degToRad(decorControls.rtvRotY), 0]} scale={decorControls.rtvScale}>
          <DistanceCulledModel maxDistance={16}>
            <AutoCenteredModel url="/models/optimized/modern_wooden_cabinet.glb" />
          </DistanceCulledModel>
        </group>
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

        {/* Golden play plaque marks the HUD interaction target. Clicks are left for pointer-lock; [E] opens HUD. */}
        <group
          ref={plaqueRef}
          position={[decorControls.buttonPosX, decorControls.buttonPosY, decorControls.buttonPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.buttonRotY), 0]}
          scale={decorControls.buttonScale}
        >
          <GoldenPlayButton />
          <mesh
            position={[0, 0, 0.12]}
            renderOrder={1002}
          >
            <planeGeometry args={[1.35, 1.05]} />
            <meshBasicMaterial
              transparent
              opacity={0.001}
              depthWrite={false}
              depthTest={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {deviceScreenHovered && (
            <Html
              position={[0, 1.0, 0]}
              center
              transform
              occlude={false}
              style={{
                pointerEvents: 'none',
                color: '#f8f8f2',
                fontSize: '12px',
                letterSpacing: '0.08em',
                textAlign: 'center',
                textTransform: 'uppercase',
                textShadow: '0 2px 8px rgba(0,0,0,0.85)',
                whiteSpace: 'nowrap',
              }}
            >
              {isOpen ? '[E] CLOSE STUDIO HUD' : 'KLIKNIJ TABLET · [E] Z BLISKA'}
            </Html>
          )}
        </group>

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

        {/* iPad Pro on the desk */}
        <group
          ref={deviceRef}
          onPointerDown={(event) => {
            devicePointerStart.current = {
              pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY,
            };
          }}
          onPointerUp={(event) => {
            const start = devicePointerStart.current;
            devicePointerStart.current = null;
            if (isInteractionTap(start, event)) {
              event.stopPropagation();
              deviceInteraction.activate(event.clientX, event.clientY);
            }
          }}
          onClick={(event) => {
            // Do not let the same click immediately relock the cursor behind the deck.
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
          }}
          position={[decorControls.laptopPosX, decorControls.laptopPosY, decorControls.laptopPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.laptopRotY), 0]}
          scale={decorControls.laptopScale}
        >
          <AutoCenteredModel url="/models/optimized/ipad_pro_2024.glb" />
        </group>

        {/* Sofa in the room — heavy model, distance-culled */}
          <group
            position={[decorControls.sofaPosX, decorControls.sofaPosY, decorControls.sofaPosZ]}
            rotation={[0, THREE.MathUtils.degToRad(decorControls.sofaRotY), 0]}
            scale={decorControls.sofaScale}
          >
            {/* SofaRaw self-centers via bbox; scale is on the GROUP, not on primitive */}
            <DistanceCulledModel maxDistance={16}><SofaRaw /></DistanceCulledModel>
          </group>

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

        {/* Focal screen: always rendered, texture swapped imperatively. */}
        <group
           ref={screenRef}
           position={[hudControls.hudPosX, hudControls.hudPosY, hudControls.hudPosZ]}
           rotation={[
             THREE.MathUtils.degToRad(hudControls.hudRotX),
             THREE.MathUtils.degToRad(hudControls.hudRotY),
             THREE.MathUtils.degToRad(hudControls.hudRotZ)
           ]}
           scale={[hudControls.hudScale, hudControls.hudScale, hudControls.hudScale]}
        >
           <CreatorLight name="screen-fill" channel="screen" position={[0, 0, 0.34]} intensity={2.4} distance={4.2} decay={2} />
           <StudioDisplayWall
             videoTexture={screenTex}
             fallbackVisible={!screenTex}
           />
        </group>

        {/* ── AUDIO REACTIVE CEILING NEON ── */}
        <CreatorPerimeterLights />

        {/* ── LAPTOP INTERACTIVE ZONE – otwiera HUD panel ── */}
        <group
          position={[decorControls.laptopPosX, decorControls.laptopPosY, decorControls.laptopPosZ]}
          rotation={[0, THREE.MathUtils.degToRad(decorControls.laptopRotY), 0]}
          scale={[decorControls.laptopScale, decorControls.laptopScale, decorControls.laptopScale]}
          visible={false}
        >
          {/* Invisible hit-test plane — większa, skalowana z iPadem, bez Y-offset */}
          <mesh
            position={[0, 0.035, 0.012]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.16, 0.11]} />
            <meshBasicMaterial transparent opacity={0.001} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>

          {/* Hover hint + E key interaction */}
          {false && deviceScreenHovered && (
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
        <StageReadySignal onReady={onShellReady} />

      </Suspense>
    </group>
    </CreatorLightingProvider>
    </CreatorRoomProfileContext.Provider>
  );
}
