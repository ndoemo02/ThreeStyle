"use client";

import { useMemo } from 'react';
import { Html, useTexture } from '@react-three/drei';
import { MatteDarkAccentMaterial, FoliageGreenMaterial } from '../../core/AcousticDarkMaterial';
import { RoomDoor } from '../../modules/doors/RoomDoor';
import * as THREE from 'three';

useTexture.preload('/textures/Concrete035_2K.jpg');
useTexture.preload('/textures/oak_veneer_01_diff_2k.jpg');
useTexture.preload('/textures/oak_veneer_01_nor_gl_2k.jpg');
useTexture.preload('/textures/oak_veneer_01_rough_2k.jpg');
useTexture.preload('/textures/granite_tile_diff_2k.jpg');
useTexture.preload('/textures/granite_tile_nor_gl_2k.jpg');
useTexture.preload('/textures/granite_tile_rough_2k.jpg');

const DOORS: Array<{
  id: string;
  label: string;
  status: 'active' | 'locked' | 'offline';
  users: number;
  pos: [number, number, number];
  rot: [number, number, number];
}> = [
  { id: 'room-2', label: 'LOFI BEATS', status: 'active', users: 8, pos: [-19, 0, 3.9], rot: [0, Math.PI, 0] },
  { id: 'room-3', label: 'PODCAST 1', status: 'locked', users: 0, pos: [-14, 0, -3.9], rot: [0, 0, 0] },
  { id: 'room-4', label: 'PRIVATE', status: 'offline', users: 0, pos: [-19, 0, -3.9], rot: [0, 0, 0] },
  { id: 'room-6', label: 'CHILLOUT', status: 'active', users: 5, pos: [-34, 0, 3.9], rot: [0, Math.PI, 0] },
  { id: 'room-7', label: 'MIX ROOM', status: 'locked', users: 1, pos: [-29, 0, -3.9], rot: [0, 0, 0] },
  { id: 'room-8', label: 'ARCHIVE', status: 'offline', users: 0, pos: [-34, 0, -3.9], rot: [0, 0, 0] },
];

type SlatPanelMaterials = {
  blackMetal: THREE.Material;
  darkPlaster: THREE.Material;
  warmLed: THREE.Material;
  woodSlat: THREE.Material;
};

function WallSlatPanel({
  centerX,
  z,
  width,
  materials,
}: {
  centerX: number;
  z: number;
  width: number;
  materials: SlatPanelMaterials;
}) {
  const slatCount = Math.max(3, Math.floor(width / 0.58));
  const spacing = width / (slatCount + 1);

  return (
    <group position={[centerX, 0, z]}>
      <mesh position={[0, 2.8, 0]}>
        <boxGeometry args={[width, 4.9, 0.06]} />
        <primitive object={materials.darkPlaster} attach="material" />
      </mesh>
      <mesh position={[0, 5.28, 0.015]}>
        <boxGeometry args={[width + 0.14, 0.12, 0.12]} />
        <primitive object={materials.blackMetal} attach="material" />
      </mesh>
      <mesh position={[0, 0.32, 0.015]}>
        <boxGeometry args={[width + 0.14, 0.12, 0.12]} />
        <primitive object={materials.blackMetal} attach="material" />
      </mesh>
      <mesh position={[-width / 2 - 0.03, 2.8, 0.015]}>
        <boxGeometry args={[0.12, 4.98, 0.12]} />
        <primitive object={materials.blackMetal} attach="material" />
      </mesh>
      <mesh position={[width / 2 + 0.03, 2.8, 0.015]}>
        <boxGeometry args={[0.12, 4.98, 0.12]} />
        <primitive object={materials.blackMetal} attach="material" />
      </mesh>
      {Array.from({ length: slatCount }).map((_, i) => (
        <mesh key={`slat-${i}`} position={[-width / 2 + spacing * (i + 1), 2.8, 0.08]} castShadow>
          <boxGeometry args={[0.12, 4.55, 0.16]} />
          <primitive object={materials.woodSlat} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 5.12, 0.11]}>
        <boxGeometry args={[width - 0.28, 0.045, 0.04]} />
        <primitive object={materials.warmLed} attach="material" />
      </mesh>
    </group>
  );
}

export function LeftWingCorridor({ onEnterRoom }: { onEnterRoom: (id: string) => void }) {
  const textures = useTexture({
    map: '/textures/Concrete035_2K.jpg',
    woodMap: '/textures/oak_veneer_01_diff_2k.jpg',
    woodNormalMap: '/textures/oak_veneer_01_nor_gl_2k.jpg',
    woodRoughnessMap: '/textures/oak_veneer_01_rough_2k.jpg',
    floorMap: '/textures/granite_tile_diff_2k.jpg',
    floorNormalMap: '/textures/granite_tile_nor_gl_2k.jpg',
    floorRoughnessMap: '/textures/granite_tile_rough_2k.jpg',
  });

  const materials = useMemo(() => {
    // Klonowanie tekstur przed modyfikacją (hook immutability)
    const woodTex = textures.woodMap.clone();
    const woodNormTex = textures.woodNormalMap.clone();
    const woodRoughTex = textures.woodRoughnessMap.clone();
    [woodTex, woodNormTex, woodRoughTex].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; });
    woodTex.colorSpace = THREE.SRGBColorSpace;
    woodTex.repeat.set(1, 3);

    // Podłoga — granit
    const floorTex = textures.floorMap.clone();
    const floorNormTex = textures.floorNormalMap.clone();
    const floorRoughTex = textures.floorRoughnessMap.clone();
    [floorTex, floorNormTex, floorRoughTex].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; });
    floorTex.colorSpace = THREE.SRGBColorSpace;
    floorTex.repeat.set(12, 2);

    const warmPlaster = new THREE.MeshStandardMaterial({
      color: '#8b7a66',
      roughness: 0.86,
      metalness: 0.0,
    });
    const darkPlaster = new THREE.MeshStandardMaterial({
      color: '#3a332b',
      roughness: 0.9,
      metalness: 0.0,
    });
    const blackMetal = new THREE.MeshStandardMaterial({
      color: '#080808',
      roughness: 0.48,
      metalness: 0.5,
    });
    const smokedGlass = new THREE.MeshPhysicalMaterial({
      color: '#050505',
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.64,
      clearcoat: 1,
      reflectivity: 0.65,
    });
    const concreteWall = new THREE.MeshStandardMaterial({
      color: '#8b7a66', roughness: 0.8, metalness: 0.0,
    });
    const woodSlat = new THREE.MeshStandardMaterial({
      map: woodTex, normalMap: woodNormTex, roughnessMap: woodRoughTex,
      color: '#5a3821', roughness: 0.62, metalness: 0.04,
    });
    const graniteFloor = new THREE.MeshStandardMaterial({
      map: floorTex, normalMap: floorNormTex, roughnessMap: floorRoughTex,
      color: '#2c2925', roughness: 0.38, metalness: 0.08,
    });
    const ceilingDark = new THREE.MeshStandardMaterial({
      color: '#15110d',
      roughness: 0.72,
      metalness: 0.05,
    });
    const warmLed = new THREE.MeshBasicMaterial({
      color: '#ffd7a1',
      toneMapped: false,
    });

    return { warmPlaster, darkPlaster, blackMetal, smokedGlass, concreteWall, woodSlat, graniteFloor, ceilingDark, warmLed };
  }, [textures]);

  return (
    <group position={[-10, 0, -5]}>

      {/* ═══════════════ PODŁOGA — 30×8, dębowa ═══════════════ */}
      <mesh position={[-15, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <primitive object={materials.graniteFloor} attach="material" />
      </mesh>
      {[-3, -1.5, 0, 1.5, 3].map((z) => (
        <mesh key={`floor-z-${z}`} position={[-15, -0.044, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[30, 0.018]} />
          <meshBasicMaterial color="#151311" transparent opacity={0.34} depthWrite={false} />
        </mesh>
      ))}
      {[-27, -24, -21, -18, -15, -12, -9, -6, -3].map((x) => (
        <mesh key={`floor-x-${x}`} position={[x, -0.043, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[8, 0.018]} />
          <meshBasicMaterial color="#151311" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
      {/* Drewniane listwy przypodłogowe */}
      <mesh position={[-15, 0.12, -3.75]}>
        <boxGeometry args={[30, 0.12, 0.04]} />
        <primitive object={materials.woodSlat} attach="material" />
      </mesh>
      <mesh position={[-15, 0.12, 3.75]}>
        <boxGeometry args={[30, 0.12, 0.04]} />
        <primitive object={materials.woodSlat} attach="material" />
      </mesh>

      {/* ═══════════════ SUFIT ═══════════════ */}
      <mesh position={[-15, 6, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <primitive object={materials.ceilingDark} attach="material" />
      </mesh>
      <mesh position={[-15, 5.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 4.5]} />
        <primitive object={materials.ceilingDark} attach="material" />
      </mesh>
      {[-2.55, 2.55].map((z) => (
        <mesh key={`ceiling-led-${z}`} position={[-15, 5.81, z]}>
          <boxGeometry args={[28, 0.035, 0.05]} />
          <primitive object={materials.warmLed} attach="material" />
        </mesh>
      ))}
      {[-27, -25.8, -24.6, -23.4, -22.2, -21, -19.8, -18.6, -17.4, -16.2, -15, -13.8, -12.6, -11.4, -10.2, -9, -7.8, -6.6, -5.4, -4.2, -3].map((x) => (
        <mesh key={`ceiling-slat-${x}`} position={[x, 5.83, 0]}>
          <boxGeometry args={[0.06, 0.06, 4.15]} />
          <primitive object={materials.blackMetal} attach="material" />
        </mesh>
      ))}
      <pointLight position={[-22, 5.45, -2.4]} intensity={2.0} distance={8} decay={2} color="#ffd7a1" />
      <pointLight position={[-10, 5.45, 2.4]} intensity={1.8} distance={8} decay={2} color="#ffd7a1" />

      {/* ═══════════════ ŚCIANA LEWA (strona pokoi) ═══════════════ */}
      {[
        { pos: [-6.35, 3, 4], args: [12.7, 6, 0.5] },
        { pos: [-22.15, 3, 4], args: [13.7, 6, 0.5] },
        { pos: [-33.15, 3, 4], args: [3.7, 6, 0.5] },
      ].map((s, i) => (
        <mesh key={`lw-${i}`} position={s.pos as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={s.args as [number, number, number]} />
          <primitive object={materials.concreteWall} attach="material" />
        </mesh>
      ))}
      {[
        { pos: [-14, 4.5, 4], args: [2.6, 3, 0.5] },
        { pos: [-30, 4.5, 4], args: [2.6, 3, 0.5] },
      ].map((s, i) => (
        <mesh key={`lwt-${i}`} position={s.pos as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={s.args as [number, number, number]} />
          <primitive object={materials.concreteWall} attach="material" />
        </mesh>
      ))}
      {/* Drewniane lamele na lewej ścianie */}
      {[
        { centerX: -4.2, width: 4.2 },
        { centerX: -17.2, width: 5.8 },
        { centerX: -32.0, width: 4.2 },
      ].map((panel) => (
        <WallSlatPanel
          key={`left-panel-${panel.centerX}`}
          centerX={panel.centerX}
          z={3.63}
          width={panel.width}
          materials={materials}
        />
      ))}

      {/* ═══════════════ ŚCIANA PRAWA ═══════════════ */}
      <mesh position={[-15, 3, -4]} castShadow receiveShadow>
        <boxGeometry args={[30, 6, 0.5]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>
      <mesh position={[-15, 5.55, -3.71]}>
        <boxGeometry args={[28, 0.05, 0.04]} />
        <primitive object={materials.warmLed} attach="material" />
      </mesh>
      {[
        { centerX: -2.1, width: 3.2 },
        { centerX: -14.2, width: 5.0 },
        { centerX: -30.8, width: 5.4 },
      ].map((panel) => (
        <WallSlatPanel
          key={`right-panel-${panel.centerX}`}
          centerX={panel.centerX}
          z={-3.63}
          width={panel.width}
          materials={materials}
        />
      ))}

      {/* ═══════════════ WESTYBUL ═══════════════ */}
      <mesh position={[-0.25, 3, 2.6]} receiveShadow castShadow>
        <boxGeometry args={[0.5, 6, 2.8]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>
      <mesh position={[-0.25, 3, -2.6]} receiveShadow castShadow>
        <boxGeometry args={[0.5, 6, 2.8]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>

      {/* ═══════════════ ZIELEŃ ═══════════════ */}
      {[-24, -12, -3].map((x, i) => (
        <group key={`planter-${i}`} position={[x, 0, -3.5]}>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.7, 0.6, 0.5]} />
            <primitive object={MatteDarkAccentMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.74, 0.03, 0.54]} />
            <meshStandardMaterial color="#4a4540" roughness={0.5} metalness={0.1} />
          </mesh>
          <mesh position={[0, 1.3, 0]} castShadow>
            <sphereGeometry args={[0.36, 12, 8]} />
            <primitive object={FoliageGreenMaterial} attach="material" />
          </mesh>
          <mesh position={[0.12, 1.62, 0.06]} scale={[0.8, 1.15, 0.8]} castShadow>
            <sphereGeometry args={[0.28, 12, 8]} />
            <meshStandardMaterial color="#4b6f3a" roughness={0.9} metalness={0.0} />
          </mesh>
          <mesh position={[-0.12, 1.55, -0.04]} scale={[0.7, 1.0, 0.7]} castShadow>
            <sphereGeometry args={[0.24, 12, 8]} />
            <meshStandardMaterial color="#4a6b3a" roughness={0.9} metalness={0.0} />
          </mesh>
        </group>
      ))}

      {/* ═══════════════ POCKET TRANZYTOWY ═══════════════ */}
      <group position={[-21.5, 0, 0]}>
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4, 11]} />
          <primitive object={materials.graniteFloor} attach="material" />
        </mesh>
        <mesh position={[0, 3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.4, 6, 24]} />
          <primitive object={materials.concreteWall} attach="material" />
        </mesh>
        <mesh position={[0, 4.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.55, 32]} />
          <meshBasicMaterial color="#c4a882" transparent opacity={0.5} />
        </mesh>
        <pointLight position={[0, 4.5, 0]} intensity={2.5} distance={6} decay={2} color="#f5e6d0" />
      </group>

      {/* ═══════════════ END HUB — WEJŚCIE DO EVENT ROOMU ═══════════════ */}
      <group position={[-29.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[8, 7]} />
          <meshStandardMaterial color="#d4ccc0" roughness={0.3} metalness={0.05} />
        </mesh>
        <mesh position={[0, 3, -1.5]} castShadow receiveShadow>
          <boxGeometry args={[8, 6, 0.5]} />
          <primitive object={materials.concreteWall} attach="material" />
        </mesh>
        <mesh position={[0, 3, -1.15]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 5.4, 0.35]} />
          <primitive object={MatteDarkAccentMaterial} attach="material" />
        </mesh>
        {[
          { pos: [-2.0, 3, -0.95], args: [0.08, 5.2, 0.06] },
          { pos: [2.0, 3, -0.95], args: [0.08, 5.2, 0.06] },
          { pos: [0, 5.55, -0.95], args: [4.08, 0.08, 0.06] },
        ].map((f, i) => (
          <mesh key={`ef-${i}`} position={f.pos as [number, number, number]}>
            <boxGeometry args={f.args as [number, number, number]} />
            <primitive object={materials.woodSlat} attach="material" />
          </mesh>
        ))}
        <mesh position={[0, 3, -0.75]}>
          <boxGeometry args={[3.8, 5.0, 0.06]} />
          <meshStandardMaterial color="#1a1816" roughness={0.5} metalness={0.15} />
        </mesh>
        <mesh position={[0, 3, -0.7]}>
          <boxGeometry args={[4.0, 5.2, 0.02]} />
          <meshBasicMaterial color="#f5e6d0" transparent opacity={0.06} depthWrite={false} />
        </mesh>
        <pointLight position={[0, 3, 0.5]} intensity={3.5} distance={8} decay={2} color="#f5e6d0" />
        <Html transform occlude position={[0, 5.8, 0.2]} distanceFactor={3}>
          <div className="flex border border-[#c4a882]/50 bg-black/70 px-6 py-2 rounded text-white font-bold tracking-[0.3em] backdrop-blur text-sm">
            EVENT ROOM
          </div>
        </Html>
      </group>

      {/* ═══════════════ OŚWIETLENIE ═══════════════ */}
      <pointLight position={[-8, 4.5, 0]} intensity={2.5} distance={12} decay={2} color="#f5e6d0" />
      <pointLight position={[-18, 4.5, 0]} intensity={2.5} distance={12} decay={2} color="#f5e6d0" />
      <pointLight position={[-25, 4.5, 0]} intensity={2.5} distance={12} decay={2} color="#f5e6d0" />
      <pointLight position={[-32, 4.5, 0]} intensity={2.5} distance={12} decay={2} color="#f5e6d0" />

      {/* ═══════════════ DRZWI DO POKOJÓW ═══════════════ */}
      {DOORS.map(d => (
        <RoomDoor
          key={d.id}
          position={[(d.pos[0] + 10), d.pos[1], d.pos[2]] as [number, number, number]}
          rotation={d.rot as [number, number, number]}
          label={d.label}
          status={d.status}
          userCount={d.users}
          onEnter={() => onEnterRoom(d.id)}
        />
      ))}
    </group>
  );
}
