"use client";

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { InstancedLobbyBoxes, MergedLobbyBoxes, type LobbyBoxSpec, type LobbyInstanceTransform } from './LobbyMeshes';
import type { LobbyMaterials } from './LobbyMaterials';

const HUB_STONE: LobbyBoxSpec[] = [
  { position: [0, -0.045, 0], size: [30, 0.09, 20] },
];

const HUB_PLASTER: LobbyBoxSpec[] = [
  { position: [0, 2.4, -10], size: [28, 4.8, 0.36] },
  { position: [-5.5, 2.4, 10], size: [17, 4.8, 0.36] },
  { position: [9.5, 2.4, 10], size: [9, 4.8, 0.36] },
  { position: [10, 2.4, 0], size: [20, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
  { position: [-10, 2.4, 3.1], size: [13.8, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
  { position: [-10, 2.4, -8.1], size: [3.8, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
];

const HUB_DARK: LobbyBoxSpec[] = [
  { position: [0, 4.82, 0], size: [30, 0.18, 20] },
];

const HUB_WOOD: LobbyBoxSpec[] = [
  { position: [0, 0.12, -9.78], size: [28, 0.16, 0.12] },
  { position: [9.78, 0.12, 0], size: [0.12, 0.16, 19.5] },
  { position: [-9.78, 2.35, -6.3], size: [0.12, 4.5, 0.14] },
  { position: [-9.78, 2.35, -3.7], size: [0.12, 4.5, 0.14] },
  { position: [-9.78, 4.58, -5], size: [0.12, 0.14, 2.74] },
];

const HUB_LED: LobbyBoxSpec[] = [
  { position: [0, 4.66, -7.2], size: [25.5, 0.035, 0.045] },
  { position: [0, 4.66, 7.2], size: [25.5, 0.035, 0.045] },
  { position: [-8.8, 4.66, 0], size: [0.045, 0.035, 13.8] },
  { position: [8.8, 4.66, 0], size: [0.045, 0.035, 13.8] },
];

const WALL_SLATS: LobbyInstanceTransform[] = Array.from({ length: 45 }, (_, index) => ({
  position: [-12.1 + index * 0.55, 2.45, -9.77],
}));

const CEILING_BAFFLES: LobbyInstanceTransform[] = Array.from({ length: 35 }, (_, index) => ({
  position: [-13.6 + index * 0.8, 4.7, 0],
}));

const PLANTER_POSITIONS: Array<[number, number, number]> = [
  [-7.2, 0, -8.8],
  [8.7, 0, -4.3],
  [8.7, 0, 5.4],
];

function LobbyPlanters({ count, materials }: { count: number; materials: LobbyMaterials }) {
  const visiblePositions = useMemo(() => PLANTER_POSITIONS.slice(0, count), [count]);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const foliageRef = useRef<THREE.InstancedMesh>(null);
  const shadowRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const helper = new THREE.Object3D();
    visiblePositions.forEach(([x, , z], index) => {
      helper.position.set(x, 0.98, z);
      helper.rotation.set(0, 0, index % 2 ? 0.06 : -0.05);
      helper.scale.set(1, 1, 1);
      helper.updateMatrix();
      trunkRef.current?.setMatrixAt(index, helper.matrix);

      helper.position.set(x + (index % 2 ? 0.08 : -0.06), 1.72, z);
      helper.rotation.set(0, index * 0.8, 0);
      helper.scale.set(0.85, 1.35, 0.85);
      helper.updateMatrix();
      foliageRef.current?.setMatrixAt(index, helper.matrix);

      helper.position.set(x, 0.012, z);
      helper.rotation.set(-Math.PI / 2, 0, 0);
      helper.scale.set(1.2, 0.72, 1);
      helper.updateMatrix();
      shadowRef.current?.setMatrixAt(index, helper.matrix);
    });

    for (const ref of [trunkRef, foliageRef, shadowRef]) {
      if (!ref.current) continue;
      ref.current.instanceMatrix.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [visiblePositions]);

  const potTransforms = useMemo<LobbyInstanceTransform[]>(
    () => visiblePositions.map(([x, , z]) => ({ position: [x, 0.34, z] })),
    [visiblePositions],
  );

  return (
    <>
      <InstancedLobbyBoxes
        size={[0.72, 0.68, 0.62]}
        surface="dark"
        material={materials.dark}
        transforms={potTransforms}
      />
      <instancedMesh ref={trunkRef} args={[undefined, undefined, count]} material={materials.trunk} frustumCulled>
        <cylinderGeometry args={[0.055, 0.085, 1.15, 7]} />
      </instancedMesh>
      <instancedMesh ref={foliageRef} args={[undefined, undefined, count]} material={materials.foliage} frustumCulled>
        <icosahedronGeometry args={[0.58, 1]} />
      </instancedMesh>
      <instancedMesh ref={shadowRef} args={[undefined, undefined, count]} material={materials.shadow} frustumCulled renderOrder={-1}>
        <circleGeometry args={[0.72, 20]} />
      </instancedMesh>
    </>
  );
}

export function HubShell({
  materials,
  planterCount,
}: {
  materials: LobbyMaterials;
  planterCount: number;
}) {
  return (
    <group>
      <MergedLobbyBoxes boxes={HUB_STONE} surface="stone" material={materials.stone} />
      <MergedLobbyBoxes boxes={HUB_PLASTER} surface="plaster" material={materials.plaster} />
      <MergedLobbyBoxes boxes={HUB_DARK} surface="dark" material={materials.dark} />
      <MergedLobbyBoxes boxes={HUB_WOOD} surface="wood" material={materials.wood} />
      <MergedLobbyBoxes boxes={HUB_LED} surface="wood" material={materials.led} />

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
      <LobbyPlanters count={planterCount} materials={materials} />
    </group>
  );
}
