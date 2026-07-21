"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { EventRoomLoungeBanks } from './EventRoomLoungeBanks';
import { EventRoomInstancedBoxes, type EventRoomInstanceTransform } from './EventRoomInstancing';
import type { EventRoomMaterials } from './EventRoomMaterials';
import { EventRoomPodium } from './EventRoomPodium';
import type { EventRoomQualityTier } from './EventRoomTypes';

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
    for (let z = -8.8; z <= 10.6; z += 0.72) {
      transforms.push({ position: [-12.18, 3.12, z], rotation: [0, Math.PI / 2, 0] });
      transforms.push({ position: [12.18, 3.12, z], rotation: [0, Math.PI / 2, 0] });
    }
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

  const sidePanels = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];
    for (let z = -8.0; z <= 10.0; z += 1.35) {
      transforms.push({ position: [-12.62, 1.5, z], rotation: [0, Math.PI / 2, 0] });
      transforms.push({ position: [12.62, 1.5, z], rotation: [0, Math.PI / 2, 0] });
    }
    return transforms;
  }, []);

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
    for (let z = -7.8; z <= 8.8; z += 4.15) {
      transforms.push({ position: [-12.06, 3.12, z], rotation: [0, Math.PI / 2, 0] });
      transforms.push({ position: [12.06, 3.12, z], rotation: [0, Math.PI / 2, 0] });
    }
    return transforms;
  }, []);

  return (
    <group>
      <Box position={[0, -0.06, 0.75]} size={[27, 0.12, 25.4]} material={materials.floor} />
      <Box position={[0, 3.3, -10.55]} size={[26.5, 6.6, 0.3]} material={materials.stone} />
      <Box position={[-13.25, 3.3, 0.75]} size={[0.3, 6.6, 25.4]} material={materials.stone} />
      <Box position={[13.25, 3.3, 0.75]} size={[0.3, 6.6, 25.4]} material={materials.stone} />
      <Box position={[-7.55, 3.3, 12.35]} size={[11.2, 6.6, 0.28]} material={materials.stone} />
      <Box position={[7.55, 3.3, 12.35]} size={[11.2, 6.6, 0.28]} material={materials.stone} />
      <Box position={[0, 5.38, 12.35]} size={[3.6, 2.45, 0.28]} material={materials.woodDark} />
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
