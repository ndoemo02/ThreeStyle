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

    for (let row = 0; row < 6; row += 1) {
      rows.push({
        position: [-4.35 - row * 0.08, 0.22 + row * 0.31, 5.9 + row * 1.02],
        scale: [0.48 - row * 0.015, 1, 1],
      });
      rows.push({
        position: [4.35 + row * 0.08, 0.22 + row * 0.31, 5.9 + row * 1.02],
        scale: [0.48 - row * 0.015, 1, 1],
      });

      if (row >= 5) continue;

      rows.push({
        position: [-6.85 - row * 0.55, 0.22 + row * 0.31, 1.45 + row * 1.05],
        rotation: [0, -0.58, 0],
        scale: [0.9, 1, 1],
      });
      rows.push({
        position: [6.85 + row * 0.55, 0.22 + row * 0.31, 1.45 + row * 1.05],
        rotation: [0, 0.58, 0],
        scale: [0.9, 1, 1],
      });
    }

    return rows;
  }, []);

  const seats = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];

    for (let row = 0; row < 6; row += 1) {
      for (let col = -6; col <= 6; col += 1) {
        if (Math.abs(col) < 3) continue;
        transforms.push({ position: [col * 0.86, 0.58 + row * 0.31, 5.9 + row * 1.02] });
      }
    }

    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        transforms.push({
          position: [-7.05 - row * 0.55, 0.58 + row * 0.31, 1.45 + col * 0.96 + row * 0.1],
          rotation: [0, -0.58, 0],
        });
        transforms.push({
          position: [7.05 + row * 0.55, 0.58 + row * 0.31, 1.45 + col * 0.96 + row * 0.1],
          rotation: [0, 0.58, 0],
        });
      }
    }

    return transforms;
  }, []);

  const woodRibs = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];

    for (let x = -11.4; x <= 11.4; x += 0.62) {
      if (Math.abs(x) > 7.15) {
        transforms.push({ position: [x, 3.45, -10.12] });
      }
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
      transforms.push({ position: [x, 5.26, -10.08], scale: [0.95, 0.42, 1] });
      transforms.push({ position: [x, 1.12, -10.08], scale: [0.95, 0.22, 1] });
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

    for (let x = -11.6; x <= 11.6; x += 0.64) {
      transforms.push({ position: [x, 6.52, 0.6] });
    }

    return transforms;
  }, []);

  const ledStrips = useMemo<EventRoomInstanceTransform[]>(() => [
    { position: [-5.65, 6.45, 0.1], rotation: [0, Math.PI / 2, 0], scale: [1.85, 1, 1] },
    { position: [5.65, 6.45, 0.1], rotation: [0, Math.PI / 2, 0], scale: [1.85, 1, 1] },
    { position: [-9.85, 2.2, -4.6], rotation: [0, Math.PI / 2, 0], scale: [0.34, 1, 1] },
    { position: [9.85, 2.2, -4.6], rotation: [0, Math.PI / 2, 0], scale: [0.34, 1, 1] },
  ], []);

  const sideAccessSteps = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];

    for (let side = -1; side <= 1; side += 2) {
      for (let step = 0; step < 9; step += 1) {
        transforms.push({
          position: [side * 5.15, 0.08 + step * 0.085, -2.35 + step * 0.72],
          rotation: [0, side * 0.2, 0],
          scale: [1.2 - step * 0.03, 1, 1.12],
        });
      }
    }

    return transforms;
  }, []);

  const sideAccessLedStrips = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];

    for (let side = -1; side <= 1; side += 2) {
      for (let step = 0; step < 7; step += 1) {
        transforms.push({
          position: [side * 5.15, 0.24 + step * 0.085, -2.0 + step * 0.72],
          rotation: [0, side * 0.2, 0],
          scale: [0.22, 1, 1],
        });
      }
    }

    return transforms;
  }, []);

  const warmLedStrips = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [
      { position: [0, 0.46, -6.55], scale: [1.02, 1, 1] },
      { position: [-1.08, 0.28, 4.45], rotation: [0, Math.PI / 2, 0], scale: [1.38, 1, 1] },
      { position: [1.08, 0.28, 4.45], rotation: [0, Math.PI / 2, 0], scale: [1.38, 1, 1] },
    ];

    for (let row = 0; row < 5; row += 1) {
      transforms.push({
        position: [-7.05 - row * 0.55, 0.76 + row * 0.31, 1.65 + row * 1.05],
        rotation: [0, -0.58, 0],
        scale: [0.7, 1, 1],
      });
      transforms.push({
        position: [7.05 + row * 0.55, 0.76 + row * 0.31, 1.65 + row * 1.05],
        rotation: [0, 0.58, 0],
        scale: [0.7, 1, 1],
      });
    }

    for (let row = 0; row < 6; row += 1) {
      transforms.push({
        position: [-4.35 - row * 0.08, 0.76 + row * 0.31, 5.9 + row * 1.02],
        scale: [0.46, 1, 1],
      });
      transforms.push({
        position: [4.35 + row * 0.08, 0.76 + row * 0.31, 5.9 + row * 1.02],
        scale: [0.46, 1, 1],
      });
    }

    return transforms;
  }, []);

  const vipTables = useMemo<EventRoomInstanceTransform[]>(() => [
    { position: [-10.1, 0.42, 8.8], scale: [0.5, 1, 0.76] },
    { position: [10.1, 0.42, 8.8], scale: [0.5, 1, 0.76] },
    { position: [-10.55, 0.42, 6.2], rotation: [0, -0.5, 0], scale: [0.46, 1, 0.7] },
    { position: [10.55, 0.42, 6.2], rotation: [0, 0.5, 0], scale: [0.46, 1, 0.7] },
  ], []);

  const tableLamps = useMemo<EventRoomInstanceTransform[]>(() => [
    { position: [-10.1, 0.74, 8.8], scale: [0.18, 1, 0.18] },
    { position: [10.1, 0.74, 8.8], scale: [0.18, 1, 0.18] },
    { position: [-10.55, 0.74, 6.2], rotation: [0, -0.5, 0], scale: [0.16, 1, 0.16] },
    { position: [10.55, 0.74, 6.2], rotation: [0, 0.5, 0], scale: [0.16, 1, 0.16] },
  ], []);

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

      <Box position={[0, 0.2, -7.05]} size={[7.4, 0.4, 2.72]} material={materials.stone} />
      <Box position={[0, 0.08, -3.7]} size={[12.4, 0.08, 4.25]} material={materials.metal} />
      <Box position={[-5.15, 0.12, 0.65]} size={[2.05, 0.12, 7.1]} material={materials.metal} rotation={[0, -0.2, 0]} />
      <Box position={[5.15, 0.12, 0.65]} size={[2.05, 0.12, 7.1]} material={materials.metal} rotation={[0, 0.2, 0]} />
      <Box position={[0, 0.1, 4.45]} size={[2.02, 0.2, 10.15]} material={materials.stone} />
      <Box position={[0, 0.23, 4.45]} size={[1.62, 0.055, 9.72]} material={materials.metal} />

      <EventRoomInstancedBoxes size={[8.8, 0.26, 0.72]} material={materials.woodDark} transforms={tribuneSteps} />
      <EventRoomInstancedBoxes size={[0.58, 0.24, 0.52]} material={materials.seat} transforms={seats} />
      <EventRoomInstancedBoxes size={[0.1, 5.1, 0.12]} material={materials.wood} transforms={woodRibs} />
      <EventRoomInstancedBoxes size={[0.12, 1.42, 0.12]} material={materials.wood} transforms={screenFrameRibs} />
      <EventRoomInstancedBoxes size={[0.18, 2.15, 0.72]} material={materials.woodDark} transforms={sidePanels} />
      <EventRoomInstancedBoxes size={[0.12, 0.08, 21]} material={materials.woodDark} transforms={ceilingSlats} />
      <EventRoomInstancedBoxes size={[1.7, 0.14, 0.66]} material={materials.stone} transforms={sideAccessSteps} />
      <EventRoomInstancedBoxes size={[7.4, 0.035, 0.055]} material={materials.led} transforms={ledStrips} />
      <EventRoomInstancedBoxes size={[7.1, 0.035, 0.05]} material={materials.warmLed} transforms={warmLedStrips} />
      <EventRoomInstancedBoxes size={[1.55, 0.036, 0.05]} material={materials.warmLed} transforms={sideAccessLedStrips} />
      <EventRoomInstancedBoxes size={[1.15, 0.16, 0.82]} material={materials.woodDark} transforms={vipTables} />
      <EventRoomInstancedBoxes size={[0.28, 0.42, 0.28]} material={materials.warmLed} transforms={tableLamps} />

      <Box position={[-10.8, 1.0, 0.6]} size={[1.28, 1.75, 2.8]} material={materials.woodDark} rotation={[0, -0.35, 0]} />
      <Box position={[10.8, 1.0, 0.6]} size={[1.28, 1.75, 2.8]} material={materials.woodDark} rotation={[0, 0.35, 0]} />
    </group>
  );
}
