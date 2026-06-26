"use client";

import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomDoor } from '../../modules/doors/RoomDoor';
import { EVENT_ROOM_ZONE } from '../../navigation/navigationConfig';
import { LOBBY_DOORS } from '../hub/lobbyConfig';
import { InstancedLobbyBoxes, MergedLobbyBoxes, type LobbyBoxSpec, type LobbyInstanceTransform } from '../hub/LobbyMeshes';
import type { LobbyMaterials } from '../hub/LobbyMaterials';
import { shouldShowLobbyWorldLabel } from '../hub/lobbyVisibility';

const CORRIDOR_STONE: LobbyBoxSpec[] = [
  { position: [-25, -0.045, -5], size: [30, 0.09, 8] },
];

const CORRIDOR_DARK: LobbyBoxSpec[] = [
  { position: [-25, 4.82, -5], size: [30, 0.18, 8] },
  { position: [-39.78, 2.24, -5], size: [0.18, 4.28, 3.86] },
];

const CORRIDOR_PLASTER: LobbyBoxSpec[] = [
  { position: [-33.1, 2.4, -1], size: [13.8, 4.8, 0.36] },
  { position: [-15.9, 2.4, -1], size: [11.8, 4.8, 0.36] },
  { position: [-25, 2.4, -9], size: [30, 4.8, 0.36] },
  { position: [-40, 2.4, -7.7], size: [2.6, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
  { position: [-40, 2.4, -2.3], size: [2.6, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
  { position: [-10, 2.4, -7.5], size: [3, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
  { position: [-10, 2.4, -2.5], size: [3, 4.8, 0.36], rotation: [0, Math.PI / 2, 0] },
];

const CORRIDOR_WOOD: LobbyBoxSpec[] = [
  { position: [-25, 0.12, -1.18], size: [30, 0.16, 0.12] },
  { position: [-25, 0.12, -8.82], size: [30, 0.16, 0.12] },
  { position: [-39.66, 2.3, -7.06], size: [0.14, 4.42, 0.12] },
  { position: [-39.66, 2.3, -2.94], size: [0.14, 4.42, 0.12] },
  { position: [-39.66, 4.48, -5], size: [0.14, 0.14, 4.24] },
];

const CORRIDOR_LED: LobbyBoxSpec[] = [
  { position: [-25, 4.64, -2.12], size: [27.5, 0.035, 0.045] },
  { position: [-25, 4.64, -7.88], size: [27.5, 0.035, 0.045] },
  { position: [-39.55, 4.35, -5], size: [0.035, 0.04, 3.72] },
];

const CEILING_BAFFLES: LobbyInstanceTransform[] = Array.from({ length: 37 }, (_, index) => ({
  position: [-39.4 + index * 0.8, 4.69, -5],
}));

function slatsInRanges(ranges: Array<[number, number]>, z: number): LobbyInstanceTransform[] {
  const transforms: LobbyInstanceTransform[] = [];
  for (const [start, end] of ranges) {
    for (let x = start; x <= end; x += 0.42) transforms.push({ position: [x, 2.42, z] });
  }
  return transforms;
}

const WALL_SLATS = [
  ...slatsInRanges([[-39.2, -35.4], [-21.2, -16.8], [-13.2, -10.8]], -1.2),
  ...slatsInRanges([[-39.2, -34.8], [-31.2, -26.8], [-21.6, -16.6], [-12.8, -10.8]], -8.8),
];

function localOffset(
  position: [number, number, number],
  rotationY: number,
  offset: [number, number, number],
): [number, number, number] {
  const [x, y, z] = position;
  const [offsetX, offsetY, offsetZ] = offset;
  return [
    x + offsetX * Math.cos(rotationY) + offsetZ * Math.sin(rotationY),
    y + offsetY,
    z - offsetX * Math.sin(rotationY) + offsetZ * Math.cos(rotationY),
  ];
}

const DOOR_FRAMES: LobbyInstanceTransform[] = LOBBY_DOORS.map(door => ({
  position: localOffset(door.position, door.rotationY, [0, 2.1, 0]),
  rotation: [0, door.rotationY, 0],
}));
const DOOR_PANELS: LobbyInstanceTransform[] = LOBBY_DOORS.map(door => ({
  position: localOffset(door.position, door.rotationY, [0, 2.1, 0.2]),
  rotation: [0, door.rotationY, 0],
}));
const DOOR_TRIMS: LobbyInstanceTransform[] = LOBBY_DOORS.map(door => ({
  position: localOffset(door.position, door.rotationY, [-0.9, 2.1, 0.28]),
  rotation: [0, door.rotationY, 0],
}));
const DOOR_HANDLES: LobbyInstanceTransform[] = LOBBY_DOORS.map(door => ({
  position: localOffset(door.position, door.rotationY, [0.64, 1.55, 0.3]),
  rotation: [0, door.rotationY, 0],
}));

function LobbyDoorGeometry({ materials }: { materials: LobbyMaterials }) {
  return (
    <>
      <InstancedLobbyBoxes size={[2.52, 4.22, 0.34]} surface="dark" material={materials.dark} transforms={DOOR_FRAMES} />
      <InstancedLobbyBoxes size={[1.96, 3.84, 0.1]} surface="dark" material={materials.dark} transforms={DOOR_PANELS} />
      <InstancedLobbyBoxes size={[0.08, 3.76, 0.06]} surface="wood" material={materials.wood} transforms={DOOR_TRIMS} />
      <InstancedLobbyBoxes size={[0.045, 0.34, 0.08]} surface="wood" material={materials.brass} transforms={DOOR_HANDLES} />
    </>
  );
}

function EventRoomLabel() {
  const camera = useThree(state => state.camera);
  const [visible, setVisible] = useState(false);
  const elapsedRef = useRef(0);
  const forwardRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    if (elapsedRef.current < 0.25) return;
    elapsedRef.current = 0;
    camera.getWorldDirection(forwardRef.current);
    const nextVisible = shouldShowLobbyWorldLabel(
      camera.position.toArray(),
      forwardRef.current.toArray(),
      [-39.45, 4.32, -5],
      12,
    );
    setVisible(current => current === nextVisible ? current : nextVisible);
  });

  if (!visible) return null;
  return (
    <Html transform occlude position={[-39.45, 4.32, -5]} rotation={[0, Math.PI / 2, 0]} distanceFactor={3.2} pointerEvents="none">
      <div style={{
        border: '1px solid rgba(213,160,107,.48)',
        background: 'rgba(12,10,9,.9)',
        color: '#e9ded2',
        padding: '8px 18px',
        fontFamily: 'monospace',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '.24em',
        whiteSpace: 'nowrap',
      }}>
        EVENT ROOM
      </div>
    </Html>
  );
}

export function LeftWingCorridor({
  onEnterRoom,
  materials,
}: {
  onEnterRoom: (id: string) => void;
  materials: LobbyMaterials;
}) {
  return (
    <group>
      <MergedLobbyBoxes boxes={CORRIDOR_STONE} surface="stone" material={materials.stone} />
      <MergedLobbyBoxes boxes={CORRIDOR_DARK} surface="dark" material={materials.dark} />
      <MergedLobbyBoxes boxes={CORRIDOR_PLASTER} surface="plaster" material={materials.plaster} />
      <MergedLobbyBoxes boxes={CORRIDOR_WOOD} surface="wood" material={materials.wood} />
      <MergedLobbyBoxes boxes={CORRIDOR_LED} surface="wood" material={materials.led} />

      <InstancedLobbyBoxes
        size={[0.12, 0.12, 7.5]}
        surface="dark"
        material={materials.dark}
        transforms={CEILING_BAFFLES}
      />
      <InstancedLobbyBoxes
        size={[0.11, 4.25, 0.11]}
        surface="wood"
        material={materials.wood}
        transforms={WALL_SLATS}
      />
      <LobbyDoorGeometry materials={materials} />

      {LOBBY_DOORS.map(door => (
        <RoomDoor
          key={door.id}
          position={door.position}
          rotation={[0, door.rotationY, 0]}
          label={door.label}
          status={door.status}
          userCount={door.users}
          onEnter={() => onEnterRoom(door.id)}
          renderGeometry={false}
        />
      ))}

      <RoomDoor
        position={[-39.55, 0, -5]}
        rotation={[0, Math.PI / 2, 0]}
        label="EVENT ROOM"
        status="active"
        userCount={24}
        onEnter={() => onEnterRoom(EVENT_ROOM_ZONE)}
        renderGeometry={false}
      />

      <EventRoomLabel />
    </group>
  );
}
