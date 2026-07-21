"use client";

import { useMemo } from 'react';
import {
  EVENT_ROOM_DESKTOP_LOUNGE_SEGMENT_LENGTH,
  EVENT_ROOM_DESKTOP_LOUNGE_Z,
  EVENT_ROOM_INNER_LOUNGE_SURFACE_Y,
  EVENT_ROOM_MOBILE_LOUNGE_SEGMENT_LENGTH,
  EVENT_ROOM_MOBILE_LOUNGE_Z,
  EVENT_ROOM_OUTER_LOUNGE_SURFACE_Y,
  centerYFromBottom,
  getEventRoomLoungeAbsX,
  getEventRoomLoungeYaw,
  type EventRoomLoungeTier,
  type EventRoomSide,
} from '../../navigation/eventRoomLayout';
import type { EventRoomMaterials } from './EventRoomMaterials';
import {
  EventRoomInstancedBoxes,
  EventRoomInstancedCylinders,
  type EventRoomInstanceTransform,
} from './EventRoomInstancing';
import type { EventRoomQualityTier } from './EventRoomTypes';

type LoungeSegment = {
  side: EventRoomSide;
  tier: EventRoomLoungeTier;
  platformWidth: number;
  surfaceY: number;
  length: number;
  position: [number, number, number];
  rotationY: number;
};

const SIDES: readonly EventRoomSide[] = [-1, 1];
const TIERS: readonly EventRoomLoungeTier[] = ['inner', 'outer'];
const TABLE_Z = [-0.5, 2.4, 5.3] as const;

function getTierDimensions(tier: EventRoomLoungeTier) {
  return tier === 'inner'
    ? { platformWidth: 2.25, surfaceY: EVENT_ROOM_INNER_LOUNGE_SURFACE_Y }
    : { platformWidth: 2.55, surfaceY: EVENT_ROOM_OUTER_LOUNGE_SURFACE_Y };
}

function createLoungeSegments(qualityTier: EventRoomQualityTier): LoungeSegment[] {
  const isMobile = qualityTier !== 'desktop';
  const zCenters = isMobile ? EVENT_ROOM_MOBILE_LOUNGE_Z : EVENT_ROOM_DESKTOP_LOUNGE_Z;
  const length = isMobile
    ? EVENT_ROOM_MOBILE_LOUNGE_SEGMENT_LENGTH
    : EVENT_ROOM_DESKTOP_LOUNGE_SEGMENT_LENGTH;

  return SIDES.flatMap(side => TIERS.flatMap((tier) => {
    const { platformWidth, surfaceY } = getTierDimensions(tier);
    return zCenters.map(z => ({
      side,
      tier,
      platformWidth,
      surfaceY,
      length,
      position: [side * getEventRoomLoungeAbsX(tier, z), 0, z] as [number, number, number],
      rotationY: getEventRoomLoungeYaw(tier, z, side),
    }));
  }));
}

function localTransform(
  segment: LoungeSegment,
  offset: [number, number, number],
): EventRoomInstanceTransform {
  const [localX, localY, localZ] = offset;
  const cosine = Math.cos(segment.rotationY);
  const sine = Math.sin(segment.rotationY);
  return {
    position: [
      segment.position[0] + localX * cosine + localZ * sine,
      localY,
      segment.position[2] - localX * sine + localZ * cosine,
    ],
    rotation: [0, segment.rotationY, 0],
  };
}

export function EventRoomLoungeBanks({
  materials,
  qualityTier,
}: {
  materials: EventRoomMaterials;
  qualityTier: EventRoomQualityTier;
}) {
  const geometry = useMemo(() => {
    const segments = createLoungeSegments(qualityTier);
    const innerSegments = segments.filter(segment => segment.tier === 'inner');
    const outerSegments = segments.filter(segment => segment.tier === 'outer');
    const segmentLength = segments[0]?.length ?? EVENT_ROOM_DESKTOP_LOUNGE_SEGMENT_LENGTH;

    const platformTransforms = (items: LoungeSegment[]) => items.map(segment => localTransform(segment, [
      0,
      centerYFromBottom(0, segment.surfaceY),
      0,
    ]));

    const plinths = segments.map(segment => localTransform(segment, [
      segment.side * (segment.platformWidth / 2 - 0.525),
      centerYFromBottom(segment.surfaceY, 0.28),
      0,
    ]));
    const seats = segments.map(segment => localTransform(segment, [
      segment.side * (segment.platformWidth / 2 - 0.48),
      centerYFromBottom(segment.surfaceY + 0.22, 0.18),
      0,
    ]));
    const backs = segments.map(segment => localTransform(segment, [
      segment.side * (segment.platformWidth / 2 - 0.11),
      centerYFromBottom(segment.surfaceY + 0.28, 0.64),
      0,
    ]));
    const fasciaLeds = segments.map(segment => localTransform(segment, [
      -segment.side * (segment.platformWidth / 2 - 0.026),
      segment.surfaceY * 0.58,
      0,
    ]));

    const frontSegments = segments.filter((segment) => {
      const tierSegments = segment.tier === 'inner' ? innerSegments : outerSegments;
      const firstZ = Math.min(...tierSegments.map(item => item.position[2]));
      return segment.position[2] === firstZ;
    });
    const innerPartitions = frontSegments
      .filter(segment => segment.tier === 'inner')
      .map(segment => localTransform(segment, [
        0,
        centerYFromBottom(segment.surfaceY, 0.76),
        -segment.length / 2 + 0.08,
      ]));
    const outerPartitions = frontSegments
      .filter(segment => segment.tier === 'outer')
      .map(segment => localTransform(segment, [
        0,
        centerYFromBottom(segment.surfaceY, 0.76),
        -segment.length / 2 + 0.08,
      ]));

    const tableTops: EventRoomInstanceTransform[] = [];
    const tableBases: EventRoomInstanceTransform[] = [];
    const tableLamps: EventRoomInstanceTransform[] = [];
    for (const side of SIDES) {
      for (const z of TABLE_Z) {
        const x = side * (getEventRoomLoungeAbsX('inner', z) - 1.35);
        tableBases.push({ position: [x, centerYFromBottom(0, 0.58), z] });
        tableTops.push({ position: [x, centerYFromBottom(0.59, 0.09), z] });
        tableLamps.push({ position: [x, centerYFromBottom(0.685, 0.25), z] });
      }
    }

    return {
      segmentLength,
      innerPlatforms: platformTransforms(innerSegments),
      outerPlatforms: platformTransforms(outerSegments),
      plinths,
      seats,
      backs,
      fasciaLeds,
      innerPartitions,
      outerPartitions,
      tableTops,
      tableBases,
      tableLamps,
    };
  }, [qualityTier]);

  const bevelSegments = qualityTier === 'desktop' ? 2 : 1;
  const cylinderSegments = qualityTier === 'desktop' ? 20 : 12;

  return (
    <group>
      <EventRoomInstancedBoxes
        size={[2.25, EVENT_ROOM_INNER_LOUNGE_SURFACE_Y, geometry.segmentLength]}
        material={materials.woodDark}
        transforms={geometry.innerPlatforms}
      />
      <EventRoomInstancedBoxes
        size={[2.55, EVENT_ROOM_OUTER_LOUNGE_SURFACE_Y, geometry.segmentLength]}
        material={materials.woodDark}
        transforms={geometry.outerPlatforms}
      />
      <EventRoomInstancedBoxes
        size={[1.05, 0.28, geometry.segmentLength]}
        material={materials.wood}
        transforms={geometry.plinths}
        bevelRadius={0.055}
        bevelSegments={bevelSegments}
      />
      <EventRoomInstancedBoxes
        size={[0.88, 0.18, geometry.segmentLength - 0.1]}
        material={materials.seat}
        transforms={geometry.seats}
        bevelRadius={0.075}
        bevelSegments={bevelSegments}
      />
      <EventRoomInstancedBoxes
        size={[0.22, 0.64, geometry.segmentLength - 0.1]}
        material={materials.seat}
        transforms={geometry.backs}
        bevelRadius={0.07}
        bevelSegments={bevelSegments}
      />
      <EventRoomInstancedBoxes
        size={[0.052, 0.045, geometry.segmentLength - 0.12]}
        material={materials.warmLed}
        transforms={geometry.fasciaLeds}
      />
      <EventRoomInstancedBoxes
        size={[2.25, 0.76, 0.16]}
        material={materials.wood}
        transforms={geometry.innerPartitions}
        bevelRadius={0.045}
        bevelSegments={bevelSegments}
      />
      <EventRoomInstancedBoxes
        size={[2.55, 0.76, 0.16]}
        material={materials.wood}
        transforms={geometry.outerPartitions}
        bevelRadius={0.045}
        bevelSegments={bevelSegments}
      />
      <EventRoomInstancedCylinders
        radius={0.12}
        height={0.58}
        radialSegments={cylinderSegments}
        material={materials.metal}
        transforms={geometry.tableBases}
      />
      <EventRoomInstancedCylinders
        radius={0.46}
        height={0.09}
        radialSegments={cylinderSegments}
        material={materials.stone}
        transforms={geometry.tableTops}
      />
      <EventRoomInstancedBoxes
        size={[0.18, 0.25, 0.18]}
        material={materials.warmLed}
        transforms={geometry.tableLamps}
        bevelRadius={0.07}
        bevelSegments={bevelSegments}
      />
    </group>
  );
}
