"use client";

import { useMemo } from 'react';
import { Html, useTexture } from '@react-three/drei';
import { WarmWhiteMaterial, MatteDarkAccentMaterial, FoliageGreenMaterial } from '../../core/AcousticDarkMaterial';
import { RoomDoor } from '../../modules/doors/RoomDoor';
import * as THREE from 'three';

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

export function LeftWingCorridor({ onEnterRoom }: { onEnterRoom: (id: string) => void }) {
  const textures = useTexture({
    map: '/textures/drewno/Concrete035_2K-JPG/Concrete035_2K-JPG_Color.jpg',
    normalMap: '/textures/drewno/Concrete035_2K-JPG/Concrete035_2K-JPG_NormalGL.jpg',
    roughnessMap: '/textures/drewno/Concrete035_2K-JPG/Concrete035_2K-JPG_Roughness.jpg',
    woodMap: '/textures/oak_veneer_01_diff_2k.jpg',
    woodNormalMap: '/textures/oak_veneer_01_nor_gl_2k.jpg',
    woodRoughnessMap: '/textures/oak_veneer_01_rough_2k.jpg',
    floorMap: '/textures/granite_tile_diff_2k.jpg',
    floorNormalMap: '/textures/granite_tile_nor_gl_2k.jpg',
    floorRoughnessMap: '/textures/granite_tile_rough_2k.jpg',
  });

  const materials = useMemo(() => {
    // Klonowanie tekstur przed modyfikacją (hook immutability)
    const concreteTex = textures.map.clone();
    const concreteNormTex = textures.normalMap.clone();
    const concreteRoughTex = textures.roughnessMap.clone();
    [concreteTex, concreteNormTex, concreteRoughTex].forEach(t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true;
    });
    concreteTex.colorSpace = THREE.SRGBColorSpace;
    concreteTex.repeat.set(10, 3);
    concreteNormTex.repeat.set(10, 3);
    concreteRoughTex.repeat.set(10, 3);

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

    const concreteWall = new THREE.MeshStandardMaterial({
      map: concreteTex,
      normalMap: concreteNormTex, roughnessMap: concreteRoughTex,
      color: '#e8e0d5', roughness: 0.55, metalness: 0.02,
    });
    const woodSlat = new THREE.MeshStandardMaterial({
      map: woodTex, normalMap: woodNormTex, roughnessMap: woodRoughTex,
      color: '#c4a882', roughness: 0.45, metalness: 0.04,
    });
    const graniteFloor = new THREE.MeshStandardMaterial({
      map: floorTex, normalMap: floorNormTex, roughnessMap: floorRoughTex,
      color: '#d8d0c4', roughness: 0.3, metalness: 0.05,
    });

    return { concreteWall, woodSlat, graniteFloor };
  }, [textures]);

  return (
    <group position={[-10, 0, -5]}>

      {/* ═══════════════ PODŁOGA — 30×8, dębowa ═══════════════ */}
      <mesh position={[-15, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <primitive object={materials.graniteFloor} attach="material" />
      </mesh>
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
        <primitive object={WarmWhiteMaterial} attach="material" />
      </mesh>
      <mesh position={[-15, 5.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 4.5]} />
        <meshStandardMaterial color="#e8e2d8" roughness={0.7} metalness={0.03} />
      </mesh>
      <mesh position={[-15, 5.82, -2.23]}>
        <boxGeometry args={[28, 0.04, 0.04]} />
        <primitive object={materials.woodSlat} attach="material" />
      </mesh>
      <mesh position={[-15, 5.82, 2.23]}>
        <boxGeometry args={[28, 0.04, 0.04]} />
        <primitive object={materials.woodSlat} attach="material" />
      </mesh>
      {[-2.15, 2.15].map((z, i) => (
        <mesh key={`cove-${i}`} position={[-15, 5.79, z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[27.6, 0.03]} />
          <meshBasicMaterial color="#f5e6d0" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}

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
      {[-8, -3, 2, 7, -24.5, -19.5, -32, -27].map((x, i) => (
        <mesh key={`las-${i}`} position={[x, 3, 3.73]} castShadow>
          <boxGeometry args={[0.03, 5.4, 0.04]} />
          <primitive object={materials.woodSlat} attach="material" />
        </mesh>
      ))}

      {/* ═══════════════ ŚCIANA PRAWA ═══════════════ */}
      <mesh position={[-15, 3, -4]} castShadow receiveShadow>
        <boxGeometry args={[30, 6, 0.5]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>
      {/* Poziomy pas lameli */}
      {[...Array(42)].map((_, i) => (
        <mesh key={`hrs-${i}`} position={[-28 + i * 0.7, 2.0, -3.73]} castShadow>
          <boxGeometry args={[0.04, 3.6, 0.05]} />
          <primitive object={materials.woodSlat} attach="material" />
        </mesh>
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
            <coneGeometry args={[0.3, 1.3, 10]} />
            <primitive object={FoliageGreenMaterial} attach="material" />
          </mesh>
          <mesh position={[0.05, 1.6, 0.05]} castShadow>
            <coneGeometry args={[0.2, 0.8, 10]} />
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
