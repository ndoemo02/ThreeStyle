'use client';

import { useRef, useEffect, useState, useCallback, useLayoutEffect, useMemo, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTransitionStore } from '../../../store/useTransitionStore';
import { useElevatorUiStore } from '../../../stores/useElevatorUiStore';
import { useHudStore } from '../../../stores/useHudStore';
import { useSceneInteraction } from '../../systems/useSceneInteraction';
import { elevatorRideStatus, elevatorShaftOffset, elevatorDoorPosition } from './elevatorRidePolicy';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CABIN_BRASS, CABIN_CEILING, CABIN_FLOOR, CABIN_LED, CABIN_WALLS, CALL_PANEL, DOOR, FRAME_BOXES, HUB_HEADER, HUB_POCKETS,
  cabinShade, doorFaceBoxes, faceUvScale, type CabinBox,
} from './elevatorCabinLayout';
import { createBrushedMap, createPanelMap, createStoneMap } from './elevatorTextures';
import {
  ELEVATOR_LOBBY_EXIT_LOOK_AT, ELEVATOR_LOBBY_EXIT_POSITION, ELEVATOR_LOBBY_POSITION,
  ELEVATOR_ROOM_EXIT_LOOK_AT, ELEVATOR_ROOM_EXIT_POSITION, ELEVATOR_ROOM_POSITION, HUB_ZONE, ROOM_ZONE,
} from '../../navigation/navigationConfig';

const noRaycast = () => {};

/** One merged geometry per material: UVs in metres, optionally a baked shade (or a box's tone) as vertex colour. */
function cabinGeometry(boxes: CabinBox[], shade = false) {
  const colored = shade || boxes.some(box => box.tone !== undefined);
  const parts = boxes.map(({ position, size, tone }) => {
    const box = new THREE.BoxGeometry(...size);
    const uv = box.getAttribute('uv');
    for (let face = 0; face < 6; face++) {
      const [su, sv] = faceUvScale(face, size);
      for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    }
    box.translate(...position);
    if (colored) {
      const positions = box.getAttribute('position');
      const colors = new Float32Array(positions.count * 3);
      for (let i = 0; i < positions.count; i++) colors.fill(tone ?? (shade ? cabinShade(positions.getY(i)) : 1), i * 3, i * 3 + 3);
      box.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    return box;
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  return merged;
}

/**
 * The cabin's look. Inside is unlit with baked shading, so it reads the same in the bright lobby
 * and the dark room; the front (frame, cladding, call panel, outer door faces) is lit by each zone.
 */
function createCabinLook() {
  const brushed = createBrushedMap(), panel = createPanelMap(), stone = createStoneMap();
  const geometry = {
    walls: cabinGeometry(CABIN_WALLS, true),
    floor: cabinGeometry(CABIN_FLOOR),
    ceiling: cabinGeometry(CABIN_CEILING),
    brass: cabinGeometry(CABIN_BRASS, true),
    led: cabinGeometry(CABIN_LED),
    front: cabinGeometry([...FRAME_BOXES, CALL_PANEL]),
    hubFront: cabinGeometry([...HUB_POCKETS, HUB_HEADER]),
    door: cabinGeometry([{ position: [0, 0, 0], size: [DOOR.width, DOOR.height, DOOR.depth] }]),
    doorFaceLeft: cabinGeometry(doorFaceBoxes(-1)),
    doorFaceRight: cabinGeometry(doorFaceBoxes(1)),
  };
  const material = {
    walls: new THREE.MeshBasicMaterial({ color: '#6c5444', map: panel, vertexColors: true, toneMapped: false }),
    floor: new THREE.MeshBasicMaterial({ color: '#5d5751', map: stone, toneMapped: false }),
    ceiling: new THREE.MeshBasicMaterial({ color: '#211c18', toneMapped: false }),
    brass: new THREE.MeshBasicMaterial({ color: '#cfa36b', map: brushed, vertexColors: true, toneMapped: false }),
    led: new THREE.MeshBasicMaterial({ color: '#f7d8b4', toneMapped: false }),
    // Dark bronze around the doors, like the Room.B frame; the warm LED line draws the opening.
    front: new THREE.MeshStandardMaterial({ color: '#2f2721', map: brushed, roughness: 0.5, metalness: 0.2 }),
    // No environment map in these zones: low metalness keeps the champagne from going dark.
    // Greyed champagne: warmer tones read as light wood under the lobby's warm light.
    doorOuter: new THREE.MeshStandardMaterial({ color: '#c4b8a8', map: brushed, roughness: 0.32, metalness: 0.2, vertexColors: true }),
    doorInner: new THREE.MeshBasicMaterial({ color: '#a39684', map: brushed, toneMapped: false }),
  };
  return {
    geometry, material,
    dispose() {
      Object.values(geometry).forEach(part => part.dispose());
      Object.values(material).forEach(part => part.dispose());
      [brushed, panel, stone].forEach(map => map.dispose());
    },
  };
}
type CabinLook = ReturnType<typeof createCabinLook>;

function CabinDoor({ doorRef, x, look }: { doorRef: RefObject<THREE.Group | null>; x: number; look: CabinLook }) {
  return <group ref={doorRef} name="creator-elevator-door" position={[x, 1.75, DOOR.z]}>
    <mesh geometry={look.geometry.door} material={look.material.doorInner} raycast={noRaycast} />
    <mesh geometry={x < 0 ? look.geometry.doorFaceLeft : look.geometry.doorFaceRight} material={look.material.doorOuter} raycast={noRaycast} />
  </group>;
}

function markPanelUpdated(texture: THREE.Texture) { texture.needsUpdate = true; }

export function ElevatorA({ visible = true, destinationReady = false, destinationFailed = false, onRideStart }: {
  visible?: boolean; destinationReady?: boolean; destinationFailed?: boolean; onRideStart?: () => void;
}) {
  const elevatorState = useTransitionStore(s => s.elevatorState);
  const activeElevator = useTransitionStore(s => s.activeElevator);
  const activeZone = useTransitionStore(s => s.activeZone);
  const targetZone = useTransitionStore(s => s.targetZone);
  const { camera } = useThree();
  const look = useMemo(() => createCabinLook(), []);
  const warmFrames = useRef(0);
  const groupRef = useRef<THREE.Group>(null);
  const leftDoorRef = useRef<THREE.Group>(null);
  const rightDoorRef = useRef<THREE.Group>(null);
  const panelRef = useRef<THREE.Mesh>(null);
  const shaftRef = useRef<THREE.InstancedMesh>(null);
  const ledRef = useRef<THREE.MeshBasicMaterial>(null);
  const cooldownUntil = useRef(0);
  const rideStart = useRef(0);
  const doorMotion = useRef({ target: 0.65, from: 0.65, started: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const isActive = activeElevator === 'A';
  const moving = isActive && elevatorState === 'moving';
  const targetPos = activeZone === ROOM_ZONE ? ELEVATOR_ROOM_POSITION : ELEVATOR_LOBBY_POSITION;
  const panelTexture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 448;
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4; return texture;
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => () => panelTexture.dispose(), [panelTexture]);
  useEffect(() => () => look.dispose(), [look]);
  useEffect(() => { ledRef.current = look.material.led; }, [look]);
  // Each zone has its own lights: draw the whole cabin once there, so no shader compiles on approach.
  useEffect(() => { warmFrames.current = 0; }, [visible, activeZone]);
  useEffect(() => {
    const context = (panelTexture.image as HTMLCanvasElement).getContext('2d')!;
    const down = (targetZone ?? (activeZone === ROOM_ZONE ? HUB_ZONE : ROOM_ZONE)) === HUB_ZONE;
    context.fillStyle = '#15212a'; context.fillRect(0, 0, 1024, 448);
    context.strokeStyle = '#d5a270'; context.lineWidth = 5; context.strokeRect(12, 12, 1000, 424);
    context.textAlign = 'center';
    context.fillStyle = '#edb575'; context.font = '600 48px sans-serif';
    context.fillText(isActive ? (down ? '↓ ZJAZD' : '↑ WJAZD') : 'THREESTYLE', 512, 105);
    context.fillStyle = '#fff4e4'; context.font = '600 76px sans-serif';
    context.fillText(down ? 'LOBBY' : 'CREATOR ROOM', 512, 235);
    context.fillStyle = '#c6cbd1'; context.font = '36px sans-serif';
    context.fillText(isActive ? 'PRZEJAZD · PRZYGOTOWANIE POKOJU' : 'WEJDŹ · E LUB PRZYCISK', 512, 340);
    markPanelUpdated(panelTexture);
  }, [panelTexture, activeZone, targetZone, isActive]);

  const inCabin = useCallback(() => {
    if (!groupRef.current) return false;
    const p = groupRef.current.worldToLocal(camera.position.clone());
    return Math.abs(p.x) < 1.75 && p.z > -2.25 && p.z < 2.35;
  }, [camera]);
  const trigger = useCallback(() => {
    const navigation = useTransitionStore.getState();
    if (!visible || navigation.elevatorState !== 'idle' || performance.now() < cooldownUntil.current || !inCabin()) return false;
    useElevatorUiStore.getState().setRideStatus('riding');
    useHudStore.getState().closeHud();
    onRideStart?.();
    useTransitionStore.getState().enterElevator('A', activeZone === ROOM_ZONE ? HUB_ZONE : ROOM_ZONE);
    cooldownUntil.current = performance.now() + 1000;
    return true;
  }, [visible, inCabin, activeZone, onRideStart]);
  const recover = useCallback(() => {
    const origin = useTransitionStore.getState().originZone;
    if (!origin) return;
    useTransitionStore.getState().setActiveZone(origin);
    const position = origin === ROOM_ZONE ? ELEVATOR_ROOM_EXIT_POSITION : ELEVATOR_LOBBY_EXIT_POSITION;
    camera.position.copy(position);
    camera.lookAt(origin === ROOM_ZONE ? ELEVATOR_ROOM_EXIT_LOOK_AT : ELEVATOR_LOBBY_EXIT_LOOK_AT);
    cooldownUntil.current = performance.now() + 1500;
    useElevatorUiStore.setState({ available: false, rideStatus: 'riding' });
  }, [camera]);

  useEffect(() => {
    useElevatorUiStore.setState({ activate: trigger, recover });
    return () => useElevatorUiStore.setState({ activate: null, recover: null, available: false });
  }, [trigger, recover]);
  useLayoutEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.copy(targetPos);
    groupRef.current.rotation.set(0, Math.PI, 0);
    if (moving) {
      camera.position.set(targetPos.x, 1.9, targetPos.z);
      camera.lookAt(targetPos.x, 1.9, targetPos.z - 4);
      rideStart.current = performance.now();
      useElevatorUiStore.getState().setRideStatus('riding');
    }
  }, [camera, targetPos, moving]);

  useSceneInteraction({
    object: panelRef, maxDistance: 4.5, triggerZone: inCabin,
    canInteract: () => visible && useTransitionStore.getState().elevatorState === 'idle'
      && performance.now() >= cooldownUntil.current && inCabin(),
    activate: trigger,
  });

  useFrame(() => {
    if (warmFrames.current < 3 && groupRef.current) {
      warmFrames.current++;
      const culled = warmFrames.current >= 3;
      groupRef.current.traverse(object => { if (object.name !== 'creator-elevator-shaft') object.frustumCulled = culled; });
    }
    const navigation = useTransitionStore.getState();
    if (navigation.elevatorState !== elevatorState || navigation.activeZone !== activeZone) return;
    if (!visible && !isActive) {
      if (useElevatorUiStore.getState().available) useElevatorUiStore.getState().setAvailability(false);
      return;
    }
    const available = elevatorState === 'idle' && inCabin() && performance.now() >= cooldownUntil.current;
    if (useElevatorUiStore.getState().available !== available) useElevatorUiStore.getState().setAvailability(available);
    if (!leftDoorRef.current || !rightDoorRef.current || !groupRef.current) return;
    const local = groupRef.current.worldToLocal(camera.position.clone());
    const nearEntry = Math.abs(local.x) < 2 && local.z > 2.3 && local.z < 5.5;
    const open = elevatorState === 'doors_opening' || (elevatorState === 'idle' && (inCabin() || nearEntry));
    const x = open ? 1.95 : 0.65;
    if (doorMotion.current.target !== x) {
      doorMotion.current = { target: x, from: rightDoorRef.current.position.x, started: performance.now() };
    }
    const doorX = elevatorDoorPosition(doorMotion.current.from, x, performance.now() - doorMotion.current.started);
    leftDoorRef.current.position.x = -doorX;
    rightDoorRef.current.position.x = doorX;

    if (isActive && elevatorState === 'doors_closing' && Math.abs(rightDoorRef.current.position.x - 0.65) < 0.015) {
      useTransitionStore.getState().setElevatorState('moving');
    }
    if (moving) {
      const elapsed = performance.now() - rideStart.current;
      const status = elevatorRideStatus(elapsed, destinationReady, destinationFailed);
      if (useElevatorUiStore.getState().rideStatus !== status) useElevatorUiStore.getState().setRideStatus(status);
      if (status === 'opening') useTransitionStore.getState().setElevatorState('doors_opening');
      if (shaftRef.current && !reducedMotion) {
        const object = new THREE.Object3D();
        const offset = elevatorShaftOffset(elapsed / 1000, targetZone === HUB_ZONE);
        for (let i = 0; i < 14; i++) {
          const y = 0.4 + (((i % 7) * 0.4 + offset + 2.8) % 2.8);
          object.position.set(i < 7 ? -0.65 : 0.65, y, 2.782);
          object.scale.set(0.22, 0.025, 0.006); object.updateMatrix();
          shaftRef.current.setMatrixAt(i, object.matrix);
        }
        shaftRef.current.instanceMatrix.needsUpdate = true;
      }
      if (ledRef.current) ledRef.current.color.set('#f7d8b4').multiplyScalar(reducedMotion ? 0.85 : 0.84 + Math.sin(elapsed / 700) * 0.04);
    } else if (ledRef.current) ledRef.current.color.set('#f7d8b4');

    if (isActive && elevatorState === 'doors_opening' && Math.abs(rightDoorRef.current.position.x - 1.95) < 0.02) {
      camera.position.copy(activeZone === ROOM_ZONE ? ELEVATOR_ROOM_EXIT_POSITION : ELEVATOR_LOBBY_EXIT_POSITION);
      camera.lookAt(activeZone === ROOM_ZONE ? ELEVATOR_ROOM_EXIT_LOOK_AT : ELEVATOR_LOBBY_EXIT_LOOK_AT);
      cooldownUntil.current = performance.now() + 1200;
      useTransitionStore.getState().releaseElevator();
    }
  });

  if (!visible && !isActive) return null;
  return <group ref={groupRef} position={targetPos.toArray()} rotation={[0, Math.PI, 0]} name="creator-elevator-cabin">
    <mesh geometry={look.geometry.walls} material={look.material.walls} raycast={noRaycast} />
    <mesh geometry={look.geometry.floor} material={look.material.floor} raycast={noRaycast} />
    <mesh geometry={look.geometry.ceiling} material={look.material.ceiling} raycast={noRaycast} />
    <mesh geometry={look.geometry.brass} material={look.material.brass} raycast={noRaycast} />
    <mesh geometry={look.geometry.led} material={look.material.led} raycast={noRaycast} />
    <mesh geometry={look.geometry.front} material={look.material.front} raycast={noRaycast} />
    {/* Corridor only: pockets for the open leaves and the header above the cabin; the room's brick does both. */}
    <mesh geometry={look.geometry.hubFront} material={look.material.front} raycast={noRaycast} visible={activeZone === HUB_ZONE} />
    <CabinDoor doorRef={leftDoorRef} x={-0.65} look={look} /><CabinDoor doorRef={rightDoorRef} x={0.65} look={look} />
    <instancedMesh ref={shaftRef} name="creator-elevator-shaft" args={[undefined, undefined, 14]} visible={moving && !reducedMotion} frustumCulled={false} raycast={() => {}}>
      <boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#e1b279" toneMapped={false} />
    </instancedMesh>
    <mesh ref={panelRef} position={[0, 1.85, -2.19]} onClick={e => { e.stopPropagation(); trigger(); }}>
      <planeGeometry args={[1.8, 0.79]} /><meshBasicMaterial map={panelTexture} toneMapped={false} />
    </mesh>
  </group>;
}
