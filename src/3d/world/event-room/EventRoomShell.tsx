"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { EventRoomLoungeBanks } from './EventRoomLoungeBanks';
import { EventRoomInstancedBoxes, type EventRoomInstanceTransform } from './EventRoomInstancing';
import type { EventRoomMaterials } from './EventRoomMaterials';
import { EventRoomPodium } from './EventRoomPodium';
import type { EventRoomQualityTier } from './EventRoomTypes';
import {
  ARENA_RX,
  ARENA_RZ,
  ARENA_SHELL_THETA_FROM,
  ARENA_SHELL_THETA_TO,
  arenaPoint,
  arenaTangentYaw,
} from '../../navigation/eventRoomGeometrySpec';

function Box({
  position,
  size,
  material,
  rotation = [0, 0, 0],
  bevelRadius = 0,
  bevelSegments = 1,
}: {
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  material: THREE.Material;
  bevelRadius?: number;
  bevelSegments?: number;
}) {
  const [width, height, depth] = size;
  const geometry = useMemo(() => (
    bevelRadius > 0
      ? new RoundedBoxGeometry(width, height, depth, bevelSegments, bevelRadius)
      : new THREE.BoxGeometry(width, height, depth)
  ), [bevelRadius, bevelSegments, depth, height, width]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} material={material} position={position} rotation={rotation} />;
}

// ── Arena wall (Stage 3 — powłoka) ────────────────────────────────────────────
// First renderer to consume `eventRoomGeometrySpec.ts`. Only the XZ footprint
// comes from the arena ellipse; wall height/thickness match the unmodified
// ceiling and back-wall interface (Stage 4/6 own those).

const ARENA_WALL_HEIGHT = 6.6;
const ARENA_WALL_CENTER_Y = ARENA_WALL_HEIGHT / 2;
const ARENA_WALL_THICKNESS = 0.3;
const ARENA_WALL_THETA_STEP = THREE.MathUtils.degToRad(2.4);
const ARENA_WALL_SEGMENT_LENGTH = 0.62;

/**
 * Door opening half-width, borrowed from the exit LED strip already rendered in
 * `EventRoomScene.tsx` (3.9 m) — not a new number. Converted to an exact ellipse
 * azimuth via x = ARENA_RX · sin θ, so the curved wall meets the unchanged door
 * frame without a seam.
 */
const ARENA_DOOR_GAP_HALF_WIDTH = 1.95;
const ARENA_DOOR_GAP_HALF_THETA = Math.asin(ARENA_DOOR_GAP_HALF_WIDTH / ARENA_RX);
const ARENA_WALL_RIGHT_THETA_TO = Math.PI - ARENA_DOOR_GAP_HALF_THETA;
const ARENA_WALL_LEFT_THETA_FROM = Math.PI + ARENA_DOOR_GAP_HALF_THETA;
const ARENA_DOOR_HEADER_Z = arenaPoint(1, Math.PI)[1];

/**
 * Legacy back-wall corner (screen backdrop, Stage 6 territory, frozen). The
 * ellipse's natural reach (RX 12.6) falls short of it, so each side gets one
 * straight return panel closing the shell between the arena mouth and the
 * existing screen backdrop.
 */
const BACK_WALL_HALF_WIDTH = 13.25;
const BACK_WALL_Z = -10.55;

type ArenaWallSample = { x: number; z: number; yaw: number };

function sampleArenaWallArc(thetaFrom: number, thetaTo: number, step: number): ArenaWallSample[] {
  const span = thetaTo - thetaFrom;
  const count = Math.max(1, Math.round(span / step));
  const samples: ArenaWallSample[] = [];
  for (let index = 0; index <= count; index += 1) {
    const theta = thetaFrom + (span * index) / count;
    const [x, z] = arenaPoint(1, theta);
    samples.push({ x, z, yaw: arenaTangentYaw(1, theta, 1) });
  }
  return samples;
}

/** Both curved side arcs (right, then left), split around the door opening. */
function sampleArenaWallSides(step: number): ArenaWallSample[] {
  return [
    ...sampleArenaWallArc(ARENA_SHELL_THETA_FROM, ARENA_WALL_RIGHT_THETA_TO, step),
    ...sampleArenaWallArc(ARENA_WALL_LEFT_THETA_FROM, ARENA_SHELL_THETA_TO, step),
  ];
}

function arenaWallTransforms(y: number, step: number): EventRoomInstanceTransform[] {
  return sampleArenaWallSides(step).map(({ x, z, yaw }) => ({ position: [x, y, z], rotation: [0, yaw, 0] }));
}

function arenaThetaStepForSpacing(spacingMeters: number) {
  return spacingMeters / ((ARENA_RX + ARENA_RZ) / 2);
}

/** Straight return panel from an arena mouth point to the legacy back-wall corner. */
function arenaReturnPanel(mouthTheta: number, cornerX: number): {
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
} {
  const [fx, fz] = arenaPoint(1, mouthTheta);
  const dx = cornerX - fx;
  const dz = BACK_WALL_Z - fz;
  return {
    position: [(fx + cornerX) / 2, ARENA_WALL_CENTER_Y, (fz + BACK_WALL_Z) / 2],
    rotation: [0, Math.atan2(dx, dz), 0],
    length: Math.hypot(dx, dz),
  };
}

export function EventRoomShell({
  materials,
  qualityTier,
}: {
  materials: EventRoomMaterials;
  qualityTier: EventRoomQualityTier;
}) {
  const woodRibs = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];
    for (let x = -11.4; x <= 11.4; x += 0.62) {
      if (Math.abs(x) > 7.15) transforms.push({ position: [x, 3.45, -10.12] });
    }
    transforms.push(...arenaWallTransforms(3.12, arenaThetaStepForSpacing(0.72)));
    return transforms;
  }, []);

  const screenFrameRibs = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];
    for (let x = -7.8; x <= 7.8; x += 0.54) {
      transforms.push({ position: [x, 5.54, -10.12], scale: [0.95, 0.34, 1] });
      transforms.push({ position: [x, 1.04, -10.12], scale: [0.95, 0.18, 1] });
    }
    return transforms;
  }, []);

  const sidePanels = useMemo<EventRoomInstanceTransform[]>(
    () => arenaWallTransforms(1.5, arenaThetaStepForSpacing(1.35)),
    [],
  );

  const ceilingSlats = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];
    for (let x = -11.6; x <= 11.6; x += 0.64) transforms.push({ position: [x, 6.52, 0.6] });
    return transforms;
  }, []);

  const ceilingLedStrips = useMemo<EventRoomInstanceTransform[]>(() => [
    { position: [-5.65, 6.45, 0.1], rotation: [0, Math.PI / 2, 0], scale: [1.85, 1, 1] },
    { position: [5.65, 6.45, 0.1], rotation: [0, Math.PI / 2, 0], scale: [1.85, 1, 1] },
    { position: [-9.85, 2.2, -4.6], rotation: [0, Math.PI / 2, 0], scale: [0.34, 1, 1] },
    { position: [9.85, 2.2, -4.6], rotation: [0, Math.PI / 2, 0], scale: [0.34, 1, 1] },
  ], []);

  const rearCovePanels = useMemo<EventRoomInstanceTransform[]>(() => [
    { position: [-9.6, 3.18, -10.28] },
    { position: [9.6, 3.18, -10.28] },
    { position: [0, 5.92, -10.22], rotation: [0, 0, Math.PI / 2], scale: [0.38, 1, 1] },
    { position: [0, 0.7, -10.2], rotation: [0, 0, Math.PI / 2], scale: [0.18, 1, 1] },
  ], []);

  const softWallPilasters = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];
    for (let x = -11.4; x <= 11.4; x += 3.8) {
      if (Math.abs(x) >= 7.2) transforms.push({ position: [x, 3.18, -10.22] });
    }
    transforms.push(...arenaWallTransforms(3.12, arenaThetaStepForSpacing(4.15)));
    return transforms;
  }, []);

  const arenaWallSegments = useMemo<EventRoomInstanceTransform[]>(
    () => arenaWallTransforms(ARENA_WALL_CENTER_Y, ARENA_WALL_THETA_STEP),
    [],
  );

  const arenaReturnPanels = useMemo(() => [
    arenaReturnPanel(ARENA_SHELL_THETA_FROM, BACK_WALL_HALF_WIDTH),
    arenaReturnPanel(ARENA_SHELL_THETA_TO, -BACK_WALL_HALF_WIDTH),
  ], []);

  return (
    <group>
      <Box position={[0, -0.06, 0.75]} size={[27, 0.12, 25.4]} material={materials.floor} />
      <Box position={[0, 3.3, -10.55]} size={[26.5, 6.6, 0.3]} material={materials.stone} />
      <Box
        position={arenaReturnPanels[0].position}
        rotation={arenaReturnPanels[0].rotation}
        size={[ARENA_WALL_THICKNESS, ARENA_WALL_HEIGHT, arenaReturnPanels[0].length]}
        material={materials.stone}
      />
      <Box
        position={arenaReturnPanels[1].position}
        rotation={arenaReturnPanels[1].rotation}
        size={[ARENA_WALL_THICKNESS, ARENA_WALL_HEIGHT, arenaReturnPanels[1].length]}
        material={materials.stone}
      />
      <EventRoomInstancedBoxes
        size={[ARENA_WALL_THICKNESS, ARENA_WALL_HEIGHT, ARENA_WALL_SEGMENT_LENGTH]}
        material={materials.stone}
        transforms={arenaWallSegments}
      />
      <Box position={[0, 5.38, ARENA_DOOR_HEADER_Z]} size={[3.6, 2.45, 0.28]} material={materials.woodDark} />
      <Box position={[0, 6.72, 0.75]} size={[27, 0.16, 25.4]} material={materials.metal} />

      <Box position={[0, 3.25, -10.4]} size={[14.7, 5.2, 0.1]} material={materials.woodDark} bevelRadius={0.05} />
      <Box position={[0, 5.96, -10.18]} size={[16.2, 0.34, 0.16]} material={materials.metal} bevelRadius={0.04} />
      <Box position={[0, 0.62, -10.16]} size={[15.6, 0.28, 0.16]} material={materials.metal} bevelRadius={0.035} />
      <Box position={[-8.22, 3.2, -10.17]} size={[0.28, 4.9, 0.18]} material={materials.metal} bevelRadius={0.035} />
      <Box position={[8.22, 3.2, -10.17]} size={[0.28, 4.9, 0.18]} material={materials.metal} bevelRadius={0.035} />

      <EventRoomPodium materials={materials} />
      <EventRoomLoungeBanks materials={materials} qualityTier={qualityTier} />

      <EventRoomInstancedBoxes size={[0.1, 5.1, 0.12]} material={materials.wood} transforms={woodRibs} />
      <EventRoomInstancedBoxes size={[0.12, 1.42, 0.12]} material={materials.wood} transforms={screenFrameRibs} />
      <EventRoomInstancedBoxes size={[0.18, 2.15, 0.72]} material={materials.woodDark} transforms={sidePanels} bevelRadius={0.035} />
      <EventRoomInstancedBoxes size={[0.12, 0.08, 21]} material={materials.woodDark} transforms={ceilingSlats} />
      <EventRoomInstancedBoxes size={[7.4, 0.035, 0.055]} material={materials.led} transforms={ceilingLedStrips} />
      <EventRoomInstancedBoxes size={[0.34, 4.55, 0.14]} material={materials.metal} transforms={rearCovePanels} bevelRadius={0.035} />
      <EventRoomInstancedBoxes size={[0.22, 3.35, 0.16]} material={materials.metal} transforms={softWallPilasters} bevelRadius={0.04} />
    </group>
  );
}
