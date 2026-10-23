"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { InstancedLobbyBoxes, MergedLobbyBoxes, MergedLobbyGlow, type LobbyBoxSpec, type LobbyInstanceTransform, type LobbyPlaneSpec } from './LobbyMeshes';
import type { LobbyMaterials } from './LobbyMaterials';
import type { LobbyQualityProfile } from './lobbyConfig';
import { LobbySignage, type LobbySign } from './LobbySignage';
import { LobbyCharacter } from './LobbyCharacter';
import { LobbyEntry } from './LobbyEntry';
import { LobbyFurniture } from './LobbyFurniture';
import { LobbyWayfinding } from './LobbyWayfinding';
import {
  LOBBY_ACCENT_GLOW, LOBBY_ACCENT_LED, LOBBY_DOWNLIGHTS, LOBBY_LIGHT_POOLS, LOBBY_PLANTER_POSITIONS, LOBBY_PLANTER_POT,
  RECEPTION_WOOD,
} from './lobbyFurnitureLayout';
import { LOBBY_CEILING_ARC, LOBBY_COVE_LED } from './lobbyLightLayout';

const HUB_STONE: LobbyBoxSpec[] = [
  { position: [0, -0.045, 0], size: [30, 0.09, 20] },
];

const HUB_PLASTER: LobbyBoxSpec[] = [
  { position: [0, 2.4, -10], size: [28, 4.8, 0.36] },
  { position: [-5.95, 2.4, 10], size: [16.1, 4.8, 0.36] },
  { position: [9.95, 2.4, 10], size: [8.1, 4.8, 0.36] },
  { position: [10, 2.4, 0], size: [20, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
  // A shallow niche behind the original wall plane; now the reception backdrop.
  { position: [-10, 2.4, -2.4], size: [2.8, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
  { position: [-10, 2.4, 7.1], size: [5.8, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
  { position: [-10, 4.2, 1.6], size: [5.2, 1.2, 0.36], rotation: [0, Math.PI / 2, 0] },
  { position: [-10.48, 1.8, -1.1], size: [1.3, 3.6, 0.2] },
  { position: [-10.48, 1.8, 4.3], size: [1.3, 3.6, 0.2] },
  { position: [-10, 2.4, -8.1], size: [3.8, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
];

const HUB_DARK: LobbyBoxSpec[] = [
  { position: [0, 4.82, 0], size: [30, 0.18, 20] },
];

const HUB_WOOD: LobbyBoxSpec[] = [
  { position: [-10.95, 1.8, 1.6], size: [5.2, 3.6, 0.36], rotation: [0, Math.PI / 2, 0] },
  { position: [0, 0.12, -9.78], size: [28, 0.16, 0.12] },
  { position: [9.78, 0.12, 0], size: [0.12, 0.16, 19.5] },
  { position: [-9.78, 2.35, -6.3], size: [0.12, 4.5, 0.14] },
  { position: [-9.78, 2.35, -3.7], size: [0.12, 4.5, 0.14] },
  { position: [-9.78, 4.58, -5], size: [0.12, 0.14, 2.74] },
  ...RECEPTION_WOOD,
];

// Downlights and trims join the existing LED batch: no extra draw call.
const HUB_LED: LobbyBoxSpec[] = [
  { position: [0, 4.66, -7.2], size: [25.5, 0.035, 0.045] },
  { position: [0, 4.66, 7.2], size: [25.5, 0.035, 0.045] },
  { position: [-8.8, 4.66, 0], size: [0.045, 0.035, 13.8] },
  { position: [8.8, 4.66, 0], size: [0.045, 0.035, 13.8] },
  ...LOBBY_DOWNLIGHTS,
  ...LOBBY_ACCENT_LED,
  ...LOBBY_COVE_LED,
];

const HUB_GLOW: LobbyPlaneSpec[] = [
  { position: [0, 4.63, -7.2], size: [25.5, 0.65], rotation: [Math.PI / 2, 0, 0] },
  { position: [0, 4.63, 7.2], size: [25.5, 0.65], rotation: [Math.PI / 2, 0, 0] },
  { position: [-8.8, 4.63, 0], size: [13.8, 0.65], rotation: [Math.PI / 2, Math.PI / 2, 0] },
  { position: [8.8, 4.63, 0], size: [13.8, 0.65], rotation: [Math.PI / 2, Math.PI / 2, 0] },
];

const HUB_SIGNS: LobbySign[] = [
  { tile: 0, position: [0, 2.65, -9.48], size: [6.8, 3.4] },
  { tile: 1, position: [-7.15, 3.45, -9.48], size: [2.3, 1.15] },
];

// Floor to the cove line, and only between the side walls (faces at x = ±9.82).
const SLAT_TOP = 4.625;
const SLAT_COUNT = 36;
const SLAT_STEP = 0.55;
const WALL_SLATS: LobbyInstanceTransform[] = Array.from({ length: SLAT_COUNT }, (_, index) => ({
  position: [(index - (SLAT_COUNT - 1) / 2) * SLAT_STEP, SLAT_TOP / 2, -9.77],
}));

const CEILING_BAFFLES: LobbyInstanceTransform[] = Array.from({ length: 35 }, (_, index) => ({
  position: [-13.6 + index * 0.8, 4.7, 0],
}));

const { radius: POT_RADIUS, height: POT_HEIGHT } = LOBBY_PLANTER_POT;
const UP = new THREE.Vector3(0, 1, 0);

/** Poly Haven "Pachira Aquatica 01", variant d (CC0; public/models/lobby/ASSETS.md, scripts/build-lobby-tree.mjs). */
const TREE_URL = '/models/lobby/pachira_aquatica_01.glb';
/** The plant is 1.9 m tall: scaled up and sunk a little into the pot, the crown tops out near 3.4 m. */
const TREE_SCALE = 1.35;
const TREE_BASE = POT_HEIGHT - 0.04;

type TreePart = { geometry: THREE.BufferGeometry; material: THREE.Material; matrix: THREE.Matrix4 };

/** Bark and leaves, one instanced mesh each; the node matrix (meshopt dequantisation) rides along. */
function LobbyTrees({ positions }: { positions: Array<[number, number, number]> }) {
  const { scene } = useGLTF(TREE_URL);
  const parts = useMemo<TreePart[]>(() => {
    scene.updateMatrixWorld(true);
    const found: TreePart[] = [];
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        found.push({ geometry: object.geometry, material: object.material as THREE.Material, matrix: object.matrixWorld.clone() });
      }
    });
    return found;
  }, [scene]);
  const meshes = useRef<Array<THREE.InstancedMesh | null>>([]);

  useLayoutEffect(() => {
    const placement = new THREE.Matrix4();
    const matrix = new THREE.Matrix4();
    const turn = new THREE.Quaternion();
    const scale = new THREE.Vector3(TREE_SCALE, TREE_SCALE, TREE_SCALE);
    const at = new THREE.Vector3();
    parts.forEach((part, partIndex) => {
      const mesh = meshes.current[partIndex];
      if (!mesh) return;
      positions.forEach(([x, , z], index) => {
        placement.compose(at.set(x, TREE_BASE, z), turn.setFromAxisAngle(UP, index * 1.3), scale);
        mesh.setMatrixAt(index, matrix.multiplyMatrices(placement, part.matrix));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [parts, positions]);

  return (
    <>
      {parts.map((part, index) => (
        <instancedMesh
          key={`${index}:${positions.length}`}
          ref={mesh => { meshes.current[index] = mesh; }}
          args={[part.geometry, part.material, positions.length]}
          frustumCulled
          raycast={() => {}}
        />
      ))}
    </>
  );
}
useGLTF.preload(TREE_URL);

/** Tall black pots (Lobby.B) with contact shadows; the trees load on their own, the pots never wait. */
function LobbyPlanters({ count, materials }: { count: number; materials: LobbyMaterials }) {
  const visiblePositions = useMemo(() => LOBBY_PLANTER_POSITIONS.slice(0, count), [count]);
  const potRef = useRef<THREE.InstancedMesh>(null);
  const shadowRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const helper = new THREE.Object3D();
    visiblePositions.forEach(([x, , z], index) => {
      helper.position.set(x, POT_HEIGHT / 2, z);
      helper.rotation.set(0, 0, 0);
      helper.scale.set(1, 1, 1);
      helper.updateMatrix();
      potRef.current?.setMatrixAt(index, helper.matrix);

      helper.position.set(x, 0.012, z);
      helper.rotation.set(-Math.PI / 2, 0, 0);
      helper.scale.set(1.5, 1.5, 1);
      helper.updateMatrix();
      shadowRef.current?.setMatrixAt(index, helper.matrix);
    });

    for (const ref of [potRef, shadowRef]) {
      if (!ref.current) continue;
      ref.current.instanceMatrix.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [visiblePositions]);

  return (
    <>
      <instancedMesh ref={potRef} args={[undefined, undefined, count]} material={materials.counter} frustumCulled>
        <cylinderGeometry args={[POT_RADIUS, POT_RADIUS - 0.06, POT_HEIGHT, 24]} />
      </instancedMesh>
      <instancedMesh ref={shadowRef} args={[undefined, undefined, count]} material={materials.softShadow} frustumCulled renderOrder={-1}>
        <planeGeometry args={[1.1, 1.1]} />
      </instancedMesh>
      <Suspense fallback={null}>
        <LobbyTrees positions={visiblePositions} />
      </Suspense>
    </>
  );
}

/** Curved LED line across the ceiling (Lobby.B), facing down; shares the LED material. */
function LobbyCeilingArc({ materials }: { materials: LobbyMaterials }) {
  const geometry = useMemo(() => {
    const { radius, width, thetaStart, thetaLength, center, y } = LOBBY_CEILING_ARC;
    // Ring in XY, turned flat so +y becomes +z and the face looks down at the floor.
    return new THREE.RingGeometry(radius - width / 2, radius + width / 2, 96, 1, thetaStart, thetaLength)
      .rotateX(Math.PI / 2).translate(center[0], y, center[1]);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh name="lobby-ceiling-arc" geometry={geometry} material={materials.led} raycast={() => {}} />;
}

/** Tier-gated transparent accents: the only lobby additions with mobile fill-rate cost. */
function LobbyAccents({ quality, materials }: { quality: LobbyQualityProfile; materials: LobbyMaterials }) {
  const pools = useMemo(() => LOBBY_LIGHT_POOLS.slice(0, quality.poolCount), [quality.poolCount]);
  return (
    <>
      {quality.accentGlow && <MergedLobbyGlow planes={LOBBY_ACCENT_GLOW} material={materials.glow} />}
      {pools.length > 0 && <MergedLobbyGlow planes={pools} material={materials.pool} />}
    </>
  );
}

export function HubShell({
  materials,
  quality,
}: {
  materials: LobbyMaterials;
  quality: LobbyQualityProfile;
}) {
  return (
    <group>
      <MergedLobbyBoxes boxes={HUB_STONE} surface="stone" material={materials.floor} />
      <MergedLobbyBoxes boxes={HUB_PLASTER} surface="plaster" material={materials.plaster} />
      <MergedLobbyBoxes boxes={HUB_DARK} surface="dark" material={materials.dark} />
      <MergedLobbyBoxes boxes={HUB_WOOD} surface="wood" material={materials.wood} />
      <MergedLobbyBoxes boxes={HUB_LED} surface="wood" material={materials.led} />
      <LobbyCeilingArc materials={materials} />
      <MergedLobbyGlow planes={HUB_GLOW} material={materials.glow} />
      <LobbySignage signs={HUB_SIGNS} materials={materials} />

      <InstancedLobbyBoxes
        size={[0.13, SLAT_TOP, 0.11]}
        surface="wood"
        material={materials.wood}
        transforms={WALL_SLATS}
      />
      <InstancedLobbyBoxes
        size={[0.13, 0.12, 18.2]}
        surface="dark"
        material={materials.dark}
        transforms={CEILING_BAFFLES}
      />
      <LobbyFurniture materials={materials} />
      <LobbyAccents quality={quality} materials={materials} />
      <LobbyPlanters count={quality.planterCount} materials={materials} />
      <LobbyWayfinding materials={materials} />
      <LobbyCharacter materials={materials} low={quality.id.endsWith('-low')} />
      <LobbyEntry />
    </group>
  );
}
