"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
  LOBBY_ACCENT_GLOW, LOBBY_ACCENT_LED, LOBBY_DOWNLIGHTS, LOBBY_LIGHT_POOLS, LOBBY_PLANTER_POSITIONS, RECEPTION_WOOD,
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

const WALL_SLATS: LobbyInstanceTransform[] = Array.from({ length: 45 }, (_, index) => ({
  position: [-12.1 + index * 0.55, 2.45, -9.77],
}));

const CEILING_BAFFLES: LobbyInstanceTransform[] = Array.from({ length: 35 }, (_, index) => ({
  position: [-13.6 + index * 0.8, 4.7, 0],
}));

/** Three leaf clumps per planter read as a shrub rather than a single ball. */
const FOLIAGE_CLUMPS: Array<{ offset: Vec3; scale: Vec3 }> = [
  { offset: [0, 1.72, 0], scale: [0.78, 0.92, 0.74] },
  { offset: [0.26, 1.34, 0.12], scale: [0.5, 0.56, 0.5] },
  { offset: [-0.22, 1.42, -0.16], scale: [0.54, 0.6, 0.52] },
];
type Vec3 = [number, number, number];

function LobbyPlanters({ count, materials }: { count: number; materials: LobbyMaterials }) {
  const visiblePositions = useMemo(() => LOBBY_PLANTER_POSITIONS.slice(0, count), [count]);
  const potRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const foliageRef = useRef<THREE.InstancedMesh>(null);
  const shadowRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const helper = new THREE.Object3D();
    visiblePositions.forEach(([x, , z], index) => {
      helper.position.set(x, 0.31, z);
      helper.rotation.set(0, 0, 0);
      helper.scale.set(1, 1, 1);
      helper.updateMatrix();
      potRef.current?.setMatrixAt(index, helper.matrix);

      helper.position.set(x, 0.98, z);
      helper.rotation.set(0, 0, index % 2 ? 0.06 : -0.05);
      helper.updateMatrix();
      trunkRef.current?.setMatrixAt(index, helper.matrix);

      FOLIAGE_CLUMPS.forEach((clump, clumpIndex) => {
        const turn = index * 0.8 + clumpIndex * 2.1;
        helper.position.set(
          x + clump.offset[0] * Math.cos(turn) - clump.offset[2] * Math.sin(turn),
          clump.offset[1],
          z + clump.offset[0] * Math.sin(turn) + clump.offset[2] * Math.cos(turn),
        );
        helper.rotation.set(0, turn, 0);
        helper.scale.set(...clump.scale);
        helper.updateMatrix();
        foliageRef.current?.setMatrixAt(index * FOLIAGE_CLUMPS.length + clumpIndex, helper.matrix);
      });

      helper.position.set(x, 0.012, z);
      helper.rotation.set(-Math.PI / 2, 0, 0);
      helper.scale.set(1.2, 1.2, 1);
      helper.updateMatrix();
      shadowRef.current?.setMatrixAt(index, helper.matrix);
    });

    for (const ref of [potRef, trunkRef, foliageRef, shadowRef]) {
      if (!ref.current) continue;
      ref.current.instanceMatrix.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [visiblePositions]);

  return (
    <>
      <instancedMesh ref={potRef} args={[undefined, undefined, count]} material={materials.counter} frustumCulled>
        <cylinderGeometry args={[0.36, 0.3, 0.62, 18]} />
      </instancedMesh>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, count]} material={materials.trunk} frustumCulled>
        <cylinderGeometry args={[0.045, 0.07, 1.15, 7]} />
      </instancedMesh>
      <instancedMesh ref={foliageRef} args={[undefined, undefined, count * FOLIAGE_CLUMPS.length]} material={materials.foliage} frustumCulled>
        <icosahedronGeometry args={[0.66, 1]} />
      </instancedMesh>
      <instancedMesh ref={shadowRef} args={[undefined, undefined, count]} material={materials.softShadow} frustumCulled renderOrder={-1}>
        <planeGeometry args={[1.1, 1.1]} />
      </instancedMesh>
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
        size={[0.13, 4.35, 0.11]}
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
