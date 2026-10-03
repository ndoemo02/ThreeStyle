"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getLoungeStairGeometry, type EventRoomSide } from '../../navigation/eventRoomGeometrySpec';
import { EventRoomInstancedBoxes, type EventRoomInstanceTransform } from './EventRoomInstancing';
import type { EventRoomMaterials } from './EventRoomMaterials';

const TREAD_THICKNESS = 0.018;
const NOSING_DEPTH = 0.03;

/** Visual tread/riser contrast; the overall step tops and footprints stay unchanged. */
export function EventRoomLoungeStairs({
  materials, treadMaterial,
}: { materials: EventRoomMaterials; treadMaterial: THREE.Material }) {
  const nosingMaterial = useMemo(() => {
    const material = materials.wood.clone();
    material.map = null;
    material.normalMap = null;
    material.roughnessMap = null;
    material.color.lerp(new THREE.Color('#c5a580'), 0.2);
    material.roughness = 0.7;
    return material;
  }, [materials]);
  useEffect(() => () => nosingMaterial.dispose(), [nosingMaterial]);

  const parts = useMemo(() => {
    const bodies: EventRoomInstanceTransform[] = [];
    const treads: EventRoomInstanceTransform[] = [];
    const nosings: EventRoomInstanceTransform[] = [];
    for (const side of [-1, 1] as const satisfies readonly EventRoomSide[]) {
      for (const { footprint, bottomY, surfaceTopY } of getLoungeStairGeometry(side).steps) {
        const x = (footprint.minX + footprint.maxX) / 2;
        const z = (footprint.minZ + footprint.maxZ) / 2;
        const width = footprint.maxX - footprint.minX;
        const depth = footprint.maxZ - footprint.minZ;
        const bodyHeight = surfaceTopY - bottomY - TREAD_THICKNESS;
        bodies.push({
          position: [x, bottomY + bodyHeight / 2, z],
          scale: [width, bodyHeight, depth],
        });
        treads.push({
          position: [x, surfaceTopY - TREAD_THICKNESS / 2, z - NOSING_DEPTH / 2],
          scale: [width, TREAD_THICKNESS, depth - NOSING_DEPTH],
        });
        nosings.push({
          position: [x, surfaceTopY - TREAD_THICKNESS / 2, footprint.maxZ - NOSING_DEPTH / 2],
          scale: [width, TREAD_THICKNESS, NOSING_DEPTH],
        });
      }
    }
    return { bodies, treads, nosings };
  }, []);

  return (
    <group name="event-room-lounge-stairs">
      <group name="lounge-stair-risers">
        <EventRoomInstancedBoxes size={[1, 1, 1]} material={materials.woodDark} transforms={parts.bodies} />
      </group>
      <group name="lounge-stair-treads">
        <EventRoomInstancedBoxes size={[1, 1, 1]} material={treadMaterial} transforms={parts.treads} />
      </group>
      <group name="lounge-stair-nosings">
        <EventRoomInstancedBoxes size={[1, 1, 1]} material={nosingMaterial} transforms={parts.nosings} />
      </group>
    </group>
  );
}
