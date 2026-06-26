"use client";

import { useMemo } from 'react';
import * as THREE from 'three';
import type { EventRoomMaterials } from './EventRoomMaterials';
import { EventRoomInstancedBoxes, type EventRoomInstanceTransform } from './EventRoomInstancing';

function Box({
  position,
  size,
  material,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  material: THREE.Material;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function EventRoomShell({ materials }: { materials: EventRoomMaterials }) {
  const tribuneSteps = useMemo<EventRoomInstanceTransform[]>(() => {
    const rows: EventRoomInstanceTransform[] = [];

    for (let row = 0; row < 4; row += 1) {
      rows.push({
        position: [-3.35 - row * 0.18, 0.22 + row * 0.34, 3.1 + row * 0.95],
        scale: [0.46 - row * 0.02, 1, 1],
      });
      rows.push({
        position: [3.35 + row * 0.18, 0.22 + row * 0.34, 3.1 + row * 0.95],
        scale: [0.46 - row * 0.02, 1, 1],
      });
      rows.push({
        position: [-4.2 - row * 0.35, 0.22 + row * 0.34, 1.3 + row * 0.65],
        rotation: [0, -0.38, 0],
        scale: [0.72, 1, 1],
      });
      rows.push({
        position: [4.2 + row * 0.35, 0.22 + row * 0.34, 1.3 + row * 0.65],
        rotation: [0, 0.38, 0],
        scale: [0.72, 1, 1],
      });
    }

    return rows;
  }, []);

  const seats = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];

    for (let row = 0; row < 4; row += 1) {
      for (let col = -4; col <= 4; col += 1) {
        if (Math.abs(col) < 2) continue;
        transforms.push({ position: [col * 0.82, 0.58 + row * 0.34, 3.0 + row * 0.95] });
      }
    }

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        transforms.push({
          position: [-4.35 - row * 0.35, 0.58 + row * 0.34, -0.35 + col * 0.86],
          rotation: [0, -0.38, 0],
        });
        transforms.push({
          position: [4.35 + row * 0.35, 0.58 + row * 0.34, -0.35 + col * 0.86],
          rotation: [0, 0.38, 0],
        });
      }
    }

    return transforms;
  }, []);

  const woodRibs = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];

    for (let x = -6.8; x <= 6.8; x += 0.48) {
      if (Math.abs(x) > 5.05) {
        transforms.push({ position: [x, 2.8, -5.42] });
      }
    }

    for (let z = -4.6; z <= 5.2; z += 0.58) {
      transforms.push({ position: [-7.18, 2.5, z], rotation: [0, Math.PI / 2, 0] });
      transforms.push({ position: [7.18, 2.5, z], rotation: [0, Math.PI / 2, 0] });
    }

    return transforms;
  }, []);

  const screenFrameRibs = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];

    for (let x = -4.7; x <= 4.7; x += 0.42) {
      transforms.push({ position: [x, 4.0, -5.4], scale: [0.85, 0.34, 1] });
      transforms.push({ position: [x, 1.04, -5.4], scale: [0.85, 0.18, 1] });
    }

    return transforms;
  }, []);

  const sidePanels = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];

    for (let z = -3.9; z <= 4.6; z += 1.18) {
      transforms.push({ position: [-7.62, 1.35, z], rotation: [0, Math.PI / 2, 0] });
      transforms.push({ position: [7.62, 1.35, z], rotation: [0, Math.PI / 2, 0] });
    }

    return transforms;
  }, []);

  const ceilingSlats = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];

    for (let x = -6.4; x <= 6.4; x += 0.52) {
      transforms.push({ position: [x, 4.74, 0.2] });
    }

    return transforms;
  }, []);

  const ledStrips = useMemo<EventRoomInstanceTransform[]>(() => [
    { position: [0, 0.1, -2.28], scale: [0.62, 1, 1] },
    { position: [-1.28, 0.33, 1.55], scale: [0.08, 1, 1] },
    { position: [1.28, 0.33, 1.55], scale: [0.08, 1, 1] },
    { position: [-1.28, 0.44, 3.25], scale: [0.08, 1, 1] },
    { position: [1.28, 0.44, 3.25], scale: [0.08, 1, 1] },
    { position: [-1.28, 0.55, 4.95], scale: [0.08, 1, 1] },
    { position: [1.28, 0.55, 4.95], scale: [0.08, 1, 1] },
    { position: [-3.2, 0.1, -1.2], rotation: [0, 0.48, 0], scale: [0.52, 1, 1] },
    { position: [3.2, 0.1, -1.2], rotation: [0, -0.48, 0], scale: [0.52, 1, 1] },
    { position: [-5.9, 1.9, -2.0], rotation: [0, Math.PI / 2, 0], scale: [0.36, 1, 1] },
    { position: [5.9, 1.9, -2.0], rotation: [0, Math.PI / 2, 0], scale: [0.36, 1, 1] },
    { position: [-3.55, 4.68, 0.1], rotation: [0, Math.PI / 2, 0], scale: [1.38, 1, 1] },
    { position: [3.55, 4.68, 0.1], rotation: [0, Math.PI / 2, 0], scale: [1.38, 1, 1] },
  ], []);

  const warmLedStrips = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [
      { position: [0, 0.39, -2.25], scale: [0.6, 1, 1] },
      { position: [-1.12, 0.31, 1.25], scale: [0.22, 1, 1] },
      { position: [1.12, 0.31, 1.25], scale: [0.22, 1, 1] },
      { position: [-1.12, 0.4, 3.2], scale: [0.22, 1, 1] },
      { position: [1.12, 0.4, 3.2], scale: [0.22, 1, 1] },
      { position: [-1.12, 0.5, 5.05], scale: [0.22, 1, 1] },
      { position: [1.12, 0.5, 5.05], scale: [0.22, 1, 1] },
      { position: [-4.28, 0.74, 1.35], rotation: [0, -0.38, 0], scale: [0.5, 1, 1] },
      { position: [4.28, 0.74, 1.35], rotation: [0, 0.38, 0], scale: [0.5, 1, 1] },
      { position: [-4.62, 1.08, 2.0], rotation: [0, -0.38, 0], scale: [0.48, 1, 1] },
      { position: [4.62, 1.08, 2.0], rotation: [0, 0.38, 0], scale: [0.48, 1, 1] },
      { position: [-4.96, 1.42, 2.65], rotation: [0, -0.38, 0], scale: [0.46, 1, 1] },
      { position: [4.96, 1.42, 2.65], rotation: [0, 0.38, 0], scale: [0.46, 1, 1] },
    ];

    for (let side = -1; side <= 1; side += 2) {
      for (let index = 0; index <= 10; index += 1) {
        const t = index / 10;
        const x = side * (2.55 + Math.sin(t * Math.PI * 0.5) * 3.15);
        const z = 0.55 + t * 4.65;
        transforms.push({
          position: [x, 0.82 + t * 0.24, z],
          rotation: [0, side * (0.55 + t * 0.36), 0],
          scale: [0.18, 1, 1],
        });
      }
    }

    return transforms;
  }, []);

  const vipTables = useMemo<EventRoomInstanceTransform[]>(() => [
    { position: [-6.05, 0.42, 4.75], scale: [0.45, 1, 0.7] },
    { position: [6.05, 0.42, 4.75], scale: [0.45, 1, 0.7] },
    { position: [-6.1, 0.42, 1.55], rotation: [0, -0.32, 0], scale: [0.42, 1, 0.64] },
    { position: [6.1, 0.42, 1.55], rotation: [0, 0.32, 0], scale: [0.42, 1, 0.64] },
  ], []);

  const tableLamps = useMemo<EventRoomInstanceTransform[]>(() => [
    { position: [-6.05, 0.74, 4.75], scale: [0.18, 1, 0.18] },
    { position: [6.05, 0.74, 4.75], scale: [0.18, 1, 0.18] },
    { position: [-6.1, 0.74, 1.55], rotation: [0, -0.32, 0], scale: [0.16, 1, 0.16] },
    { position: [6.1, 0.74, 1.55], rotation: [0, 0.32, 0], scale: [0.16, 1, 0.16] },
  ], []);

  return (
    <group>
      <Box position={[0, -0.06, 0]} size={[16, 0.12, 14]} material={materials.floor} />
      <Box position={[0, 2.45, -5.85]} size={[15.6, 4.9, 0.3]} material={materials.stone} />
      <Box position={[-7.85, 2.45, 0]} size={[0.3, 4.9, 12]} material={materials.stone} />
      <Box position={[7.85, 2.45, 0]} size={[0.3, 4.9, 12]} material={materials.stone} />
      <Box position={[-4.55, 2.45, 6.68]} size={[6.9, 4.9, 0.28]} material={materials.stone} />
      <Box position={[4.55, 2.45, 6.68]} size={[6.9, 4.9, 0.28]} material={materials.stone} />
      <Box position={[0, 4.12, 6.68]} size={[2.4, 1.55, 0.28]} material={materials.woodDark} />
      <Box position={[0, 4.92, 0]} size={[16, 0.16, 14]} material={materials.metal} />

      <Box position={[0, 0.16, -2.25]} size={[4.4, 0.32, 2.2]} material={materials.stone} />
      <Box position={[0, 0.11, 1.68]} size={[2.34, 0.22, 7.65]} material={materials.stone} />
      <Box position={[0, 0.27, 1.68]} size={[2.02, 0.07, 7.42]} material={materials.metal} />

      <EventRoomInstancedBoxes size={[8.8, 0.26, 0.72]} material={materials.woodDark} transforms={tribuneSteps} />
      <EventRoomInstancedBoxes size={[0.58, 0.24, 0.52]} material={materials.seat} transforms={seats} />
      <EventRoomInstancedBoxes size={[0.1, 4.15, 0.12]} material={materials.wood} transforms={woodRibs} />
      <EventRoomInstancedBoxes size={[0.12, 1.25, 0.12]} material={materials.wood} transforms={screenFrameRibs} />
      <EventRoomInstancedBoxes size={[0.18, 2.15, 0.72]} material={materials.woodDark} transforms={sidePanels} />
      <EventRoomInstancedBoxes size={[0.12, 0.08, 10.4]} material={materials.woodDark} transforms={ceilingSlats} />
      <EventRoomInstancedBoxes size={[7.4, 0.035, 0.055]} material={materials.led} transforms={ledStrips} />
      <EventRoomInstancedBoxes size={[7.1, 0.035, 0.05]} material={materials.warmLed} transforms={warmLedStrips} />
      <EventRoomInstancedBoxes size={[1.15, 0.16, 0.82]} material={materials.woodDark} transforms={vipTables} />
      <EventRoomInstancedBoxes size={[0.28, 0.42, 0.28]} material={materials.warmLed} transforms={tableLamps} />

      <Box position={[-5.95, 1.0, -2.0]} size={[1.2, 1.8, 3.1]} material={materials.woodDark} rotation={[0, -0.18, 0]} />
      <Box position={[5.95, 1.0, -2.0]} size={[1.2, 1.8, 3.1]} material={materials.woodDark} rotation={[0, 0.18, 0]} />
    </group>
  );
}
