"use client";

import { useMemo } from 'react';
import { useTexture, useGLTF } from '@react-three/drei';
import { useControls } from 'leva';
import { WarmWhiteMaterial, MatteDarkAccentMaterial, FoliageGreenMaterial } from '../../core/AcousticDarkMaterial';
import * as THREE from 'three';

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const { scene } = useGLTF('/models/new/stylized_tree.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  return (
    <primitive 
      object={clonedScene} 
      position={position} 
      scale={scale * 0.4} // Adjusted scale based on model units
      castShadow 
      receiveShadow 
    />
  );
}

function VenetianSofa({ position, scale = 1, rotation = 0 }: { position: [number, number, number]; scale?: number; rotation?: number }) {
  const { scene } = useGLTF('/models/new/Nowy folder/refined_venetian_3-seater_sofa_bin.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  
  return (
    <primitive 
      object={clonedScene} 
      position={position} 
      scale={scale * 0.01} // Corrected scale multiplier
      rotation={[0, rotation, 0]} 
      castShadow 
      receiveShadow 
    />
  );
}
function Shrub({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.35, 16, 12]} />
        <meshStandardMaterial color="#4a6b3a" roughness={0.9} metalness={0.0} />
      </mesh>
      <mesh position={[0.15, 0.45, 0.1]} castShadow>
        <sphereGeometry args={[0.25, 12, 10]} />
        <meshStandardMaterial color="#4a6b3a" roughness={0.9} metalness={0.0} />
      </mesh>
    </group>
  );
}


export function HubShell() {
  const tree1 = useControls('Stylized Tree 01', {
    t1x: { value: -8.3, min: -15, max: 15, step: 0.1 },
    t1y: { value: 0.0, min: -2, max: 10, step: 0.1 },
    t1z: { value: -8.0, min: -15, max: 15, step: 0.1 },
    t1s: { value: 5.80, min: 0.1, max: 8, step: 0.05 },
    t1r: { value: 0.30, min: -Math.PI, max: Math.PI, step: 0.01 },
  });
  const tree2 = useControls('Stylized Tree 02', {
    t2x: { value: 8.0, min: -15, max: 15, step: 0.1 },
    t2y: { value: 0.0, min: -2, max: 10, step: 0.1 },
    t2z: { value: -8.0, min: -15, max: 15, step: 0.1 },
    t2s: { value: 6.15, min: 0.1, max: 8, step: 0.05 },
    t2r: { value: -0.40, min: -Math.PI, max: Math.PI, step: 0.01 },
  });
  const tree3 = useControls('Stylized Tree 03', {
    t3x: { value: -8.0, min: -15, max: 15, step: 0.1 },
    t3y: { value: 0.0, min: -2, max: 10, step: 0.1 },
    t3z: { value: 8.8, min: -15, max: 15, step: 0.1 },
    t3s: { value: 2.00, min: 0.1, max: 8, step: 0.05 },
    t3r: { value: 0.10, min: -Math.PI, max: Math.PI, step: 0.01 },
  });
  const sofaControls = useControls('Venetian Sofa v5 - SCALE FIX', {
    x: { value: -8.8, min: -15, max: 15, step: 0.1 },
    y: { value: 0.0, min: -2, max: 10, step: 0.1 }, // Default to floor
    z: { value: 2.8, min: -15, max: 15, step: 0.1 },
    scale: { value: 1.0, min: 0.01, max: 50, step: 0.1 },
    rotation: { value: 1.61, min: -Math.PI, max: Math.PI, step: 0.01 },
  });

  const textures = useTexture({
    map: '/textures/Concrete035_2K.jpg',
    woodMap: '/textures/oak_veneer_01_diff_2k.jpg',
    woodNormalMap: '/textures/oak_veneer_01_nor_gl_2k.jpg',
    woodRoughnessMap: '/textures/oak_veneer_01_rough_2k.jpg',
    barkMap: '/textures/bark_brown_02_diff_2k.jpg',
    barkNormalMap: '/textures/bark_brown_02_nor_gl_2k.jpg',
    barkRoughnessMap: '/textures/bark_brown_02_rough_2k.jpg',
    floorMap: '/textures/granite_tile_diff_2k.jpg',
    floorNormalMap: '/textures/granite_tile_nor_gl_2k.jpg',
    floorRoughnessMap: '/textures/granite_tile_rough_2k.jpg',
  });

  const materials = useMemo(() => {
    // Klonowanie tekstur przed modyfikacją (hook immutability)
    const concreteTex = textures.map.clone();
    concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
    concreteTex.colorSpace = THREE.SRGBColorSpace;
    concreteTex.repeat.set(8, 3);
    concreteTex.needsUpdate = true;

    const barkTex = textures.barkMap.clone();
    barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
    barkTex.colorSpace = THREE.SRGBColorSpace;
    barkTex.repeat.set(4, 2);
    barkTex.needsUpdate = true;

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
    floorTex.repeat.set(12, 8);

    const concreteWall = new THREE.MeshStandardMaterial({
      map: concreteTex, color: '#e8e0d5', roughness: 0.55, metalness: 0.02,
    });
    const woodSlat = new THREE.MeshStandardMaterial({
      map: woodTex, normalMap: woodNormTex, roughnessMap: woodRoughTex,
      color: '#c4a882', roughness: 0.45, metalness: 0.04,
    });
    const graniteFloor = new THREE.MeshStandardMaterial({
      map: floorTex, normalMap: floorNormTex, roughnessMap: floorRoughTex,
      color: '#d8d0c4', roughness: 0.3, metalness: 0.05,
    });
    const barkAccent = new THREE.MeshStandardMaterial({
      map: barkTex, normalMap: textures.barkNormalMap.clone(), roughnessMap: textures.barkRoughnessMap.clone(),
      color: '#8b6b4a', roughness: 0.9, metalness: 0.0,
    });
    const blockerMat = new THREE.MeshStandardMaterial({
      color: '#d8cfc0', roughness: 0.8, metalness: 0.02,
    });

    return { concreteWall, woodSlat, graniteFloor, barkAccent, blockerMat };
  }, [textures]);

  return (
    <group>
      {/* ═══════════════ PODŁOGA — 30×20, dębowa ═══════════════ */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <primitive object={materials.graniteFloor} attach="material" />
      </mesh>

      {/* ═══════════════ SUFIT — ciepła biel z recessem ═══════════════ */}
      <mesh position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <primitive object={WarmWhiteMaterial} attach="material" />
      </mesh>
      <mesh position={[0, 7.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color="#e8e2d8" roughness={0.7} metalness={0.03} />
      </mesh>
      {/* Drewniane krawędzie recessu */}
      {[[-9, 0], [9, 0], [0, -7], [0, 7]].map(([px, pz], i) => (
        <mesh key={`cove-${i}`} position={[px, 7.82, pz]} rotation={i >= 2 ? [0, 0, 0] : [0, Math.PI / 2, 0]}>
          <boxGeometry args={[i >= 2 ? 14 : 18, 0.04, 0.06]} />
          <primitive object={materials.woodSlat} attach="material" />
        </mesh>
      ))}
      {/* Cove LED */}
      {[[-8.8, 0], [8.8, 0], [0, -6.8], [0, 6.8]].map(([px, pz], i) => (
        <mesh key={`cove-led-${i}`} position={[px, 7.79, pz]} rotation={i >= 2 ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]}>
          <planeGeometry args={[i >= 2 ? 13.6 : 17.6, 0.04]} />
          <meshBasicMaterial color="#f5e6d0" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}

      {/* ═══════════════ ŚCIANA TYLNA (Z=-10) — beton + lamele drewniane ═══════════════ */}
      <mesh position={[0, 4, -10]} castShadow receiveShadow>
        <boxGeometry args={[28, 8, 0.6]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>
      {/* Pionowe lamele — dębowy fornir */}
      {[...Array(41)].map((_, i) => (
        <mesh key={`bs-${i}`} position={[-10 + i * 0.5, 4, -9.65]} castShadow>
          <boxGeometry args={[0.06, 7.4, 0.08]} />
          <primitive object={materials.woodSlat} attach="material" />
        </mesh>
      ))}
      {/* Szerokie panele akcentowe — kora */}
      {[-6, 0, 6].map((x, i) => (
        <mesh key={`bp-${i}`} position={[x, 4, -9.5]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 7.2, 0.25]} />
          <primitive object={materials.barkAccent} attach="material" />
        </mesh>
      ))}

      {/* ═══════════════ ŚCIANA FRONTOWA (Z=10) ═══════════════ */}
      <mesh position={[-5.5, 4, 10]} castShadow receiveShadow>
        <boxGeometry args={[17, 8, 0.6]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>
      <mesh position={[9.5, 4, 10]} castShadow receiveShadow>
        <boxGeometry args={[9, 8, 0.6]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>
      {/* Drewniane lamele akcentowe na froncie */}
      {[-10, -7, -4, -1, 2, 5, 8, 11, 14].map((x, i) => (
        <mesh key={`fs-${i}`} position={[x, 4, 9.65]} castShadow>
          <boxGeometry args={[0.05, 7.2, 0.08]} />
          <primitive object={materials.woodSlat} attach="material" />
        </mesh>
      ))}
      {/* Narożne słupy */}
      {[-13.8, 13.8].map((x, i) => (
        <mesh key={`fc-${i}`} position={[x, 4, 9.8]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 8, 0.6]} />
          <primitive object={materials.concreteWall} attach="material" />
        </mesh>
      ))}

      {/* ═══════════════ BLOKERY za lewą ścianą ═══════════════ */}
      {[
        { pos: [-10.6, 4, -5], args: [2.4, 8, 1.0] },
        { pos: [-10.6, 4, -8.1], args: [3.8, 8, 1.0] },
        { pos: [-10.6, 4, 3.1], args: [13.8, 8, 1.0] },
      ].map((b, i) => (
        <mesh key={`blocker-${i}`} position={b.pos as [number, number, number]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={b.args as [number, number, number]} />
          <primitive object={materials.blockerMat} attach="material" />
        </mesh>
      ))}
      <mesh position={[-10.5, 0.2, -5]}>
        <boxGeometry args={[0.8, 0.4, 2.4]} />
        <primitive object={materials.blockerMat} attach="material" />
      </mesh>

      {/* ═══════════════ ŚCIANY BOCZNE ═══════════════ */}
      <mesh position={[-10, 4, 3.1]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[13.8, 8, 0.6]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>
      <mesh position={[-10, 4, -8.1]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 8, 0.6]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>
      {/* Drewniane obramowanie portalu */}
      {[
        { pos: [-9.68, 4, -3.8], args: [0.06, 7.6, 0.08] },
        { pos: [-9.68, 4, -6.2], args: [0.06, 7.6, 0.08] },
      ].map((f, i) => (
        <mesh key={`pf-${i}`} position={f.pos as [number, number, number]}>
          <boxGeometry args={f.args as [number, number, number]} />
          <primitive object={materials.woodSlat} attach="material" />
        </mesh>
      ))}

      {/* Prawa ściana */}
      <mesh position={[10, 4, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[20, 8, 0.6]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>
      {[-7, -5, -3, -1, 1, 3, 5, 7].map((z, i) => (
        <mesh key={`rs-${i}`} position={[9.68, 4, z]} castShadow>
          <boxGeometry args={[0.05, 7.2, 0.04]} />
          <primitive object={materials.woodSlat} attach="material" />
        </mesh>
      ))}

      {/* ═══════════════ NADPROŻE NAD PORTALEM ═══════════════ */}
      <mesh position={[-10, 6.2, -5]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 3.6, 0.6]} />
        <primitive object={materials.concreteWall} attach="material" />
      </mesh>
      <mesh position={[-10, 6.1, -5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[2.6, 0.2, 0.15]} />
        <primitive object={materials.woodSlat} attach="material" />
      </mesh>

      {/* ═══════════════ PORTAL ═══════════════ */}
      <group position={[-9.5, 0, -5]} rotation={[0, Math.PI / 2, 0]}>
        <pointLight position={[0, 2.5, 1.2]} intensity={2.0} distance={7} decay={2} color="#f5e6d0" />
        {[1.35, -1.35].map((x, i) => (
          <group key={`col-${i}`}>
            <mesh position={[x, 2.0, 0.3]} castShadow receiveShadow>
              <boxGeometry args={[0.45, 4.0, 0.7]} />
              <primitive object={materials.concreteWall} attach="material" />
            </mesh>
            <mesh position={[x, 2.0, 0.67]}>
              <boxGeometry args={[0.38, 3.6, 0.04]} />
              <primitive object={materials.woodSlat} attach="material" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 3.8, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.5, 0.6]} />
          <primitive object={materials.concreteWall} attach="material" />
        </mesh>
        <mesh position={[0, 3.8, 0.52]}>
          <boxGeometry args={[2.8, 0.35, 0.04]} />
          <primitive object={materials.woodSlat} attach="material" />
        </mesh>
        <mesh position={[0, 0.02, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.7, 0.6]} />
          <meshBasicMaterial color="#f5e6d0" transparent opacity={0.08} blending={2} />
        </mesh>
      </group>

      {/* ═══════════════ ZIELEŃ ═══════════════ */}
      <Tree position={[9.2, 0, -7]} scale={1.0} />
      <Tree position={[9.2, 0, -2]} scale={0.85} />
      <Tree position={[9.2, 0, 3]} scale={0.9} />
      <Tree position={[9.2, 0, 8]} scale={1.0} />
      <Tree position={[-8, 0, 8.8]} scale={1.1} />
      <Shrub position={[-6, 0, 8.8]} scale={1.0} />
      <Shrub position={[8.8, 0, -4.5]} scale={0.8} />
      <Shrub position={[8.8, 0, 0.5]} scale={0.9} />
      <Shrub position={[8.8, 0, 5.5]} scale={0.85} />
      {/* Dodatkowe proceduralne drzewa */}
      <Tree position={[tree1.t1x, tree1.t1y, tree1.t1z]} scale={tree1.t1s} />
      <Tree position={[tree2.t2x, tree2.t2y, tree2.t2z]} scale={tree2.t2s} />
      <Tree position={[tree3.t3x, tree3.t3y, tree3.t3z]} scale={tree3.t3s} />
      <VenetianSofa position={[sofaControls.x, sofaControls.y, sofaControls.z]} scale={sofaControls.scale} rotation={sofaControls.rotation} />

      {/* ═══════════════ OŚWIETLENIE ═══════════════ */}
      {/* Back wall cove — 2 słabsze pointLight zamiast 3 */}
      <pointLight position={[-8, 5.5, -9]} intensity={1.8} distance={7} decay={2} color="#f5e6d0" />
      <pointLight position={[8, 5.5, -9]} intensity={1.8} distance={7} decay={2} color="#f5e6d0" />
      {/* Górny akcent */}
      <pointLight position={[0, 7.0, -7]} intensity={2.0} distance={10} decay={2} color="#f5e6d0" />
      {/* Front fill */}
      <pointLight position={[0, 5, 5]} intensity={1.5} distance={14} decay={2} color="#faf5ed" />
      {/* Boczny akcent dla głębi */}
      <pointLight position={[8.5, 3, 0]} intensity={1.2} distance={8} decay={2} color="#f0ebe0" />
    </group>
  );
}
