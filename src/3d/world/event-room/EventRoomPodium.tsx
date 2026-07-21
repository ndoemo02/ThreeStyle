"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import type { EventRoomMaterials } from './EventRoomMaterials';
import { EventRoomInstancedBoxes, type EventRoomInstanceTransform } from './EventRoomInstancing';
import { centerYFromBottom, EVENT_ROOM_FLOOR_Y } from '../../navigation/eventRoomLayout';

const RUNWAY_LEDS: EventRoomInstanceTransform[] = [
  { position: [-1.08, 0.32, 1.2] },
  { position: [1.08, 0.32, 1.2] },
  { position: [0, 0.43, -4.62], rotation: [0, Math.PI / 2, 0], scale: [0.72, 1, 1] },
];

export function EventRoomPodium({ materials }: { materials: EventRoomMaterials }) {
  const stageGeometry = useMemo(() => new THREE.CylinderGeometry(3.25, 3.25, 0.38, 64), []);
  const stageTopGeometry = useMemo(() => new THREE.CylinderGeometry(3.03, 3.03, 0.08, 64), []);
  const runwayGeometry = useMemo(() => new RoundedBoxGeometry(2.24, 0.24, 11.65, 2, 0.12), []);
  const runwayTopGeometry = useMemo(() => new RoundedBoxGeometry(1.92, 0.06, 11.28, 2, 0.08), []);
  const endPadGeometry = useMemo(() => new THREE.CylinderGeometry(1.42, 1.42, 0.28, 48), []);

  useEffect(() => () => {
    stageGeometry.dispose();
    stageTopGeometry.dispose();
    runwayGeometry.dispose();
    runwayTopGeometry.dispose();
    endPadGeometry.dispose();
  }, [endPadGeometry, runwayGeometry, runwayTopGeometry, stageGeometry, stageTopGeometry]);

  return (
    <group>
      <mesh geometry={stageGeometry} material={materials.stone} position={[0, centerYFromBottom(EVENT_ROOM_FLOOR_Y, 0.38), -7.0]} scale={[1.68, 1, 0.72]} />
      <mesh geometry={stageTopGeometry} material={materials.metal} position={[0, 0.42, -7.0]} scale={[1.68, 1, 0.72]} />
      <mesh geometry={runwayGeometry} material={materials.stone} position={[0, centerYFromBottom(EVENT_ROOM_FLOOR_Y, 0.24), 1.2]} />
      <mesh geometry={runwayTopGeometry} material={materials.metal} position={[0, centerYFromBottom(0.24, 0.06), 1.2]} />
      <mesh geometry={endPadGeometry} material={materials.stone} position={[0, centerYFromBottom(EVENT_ROOM_FLOOR_Y, 0.28), 6.15]} scale={[1.12, 1, 0.9]} />
      <EventRoomInstancedBoxes size={[0.055, 0.04, 11.1]} material={materials.warmLed} transforms={RUNWAY_LEDS} />
    </group>
  );
}
