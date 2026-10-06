'use client';

import { useRef, useEffect, useState, useCallback, useLayoutEffect, useMemo, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTransitionStore } from '../../../store/useTransitionStore';
import { useElevatorUiStore } from '../../../stores/useElevatorUiStore';
import { useHudStore } from '../../../stores/useHudStore';
import { useSceneInteraction } from '../../systems/useSceneInteraction';
import { elevatorRideStatus, elevatorShaftOffset, elevatorDoorPosition } from './elevatorRidePolicy';
import {
  ELEVATOR_LOBBY_EXIT_LOOK_AT, ELEVATOR_LOBBY_EXIT_POSITION, ELEVATOR_LOBBY_POSITION,
  ELEVATOR_ROOM_EXIT_LOOK_AT, ELEVATOR_ROOM_EXIT_POSITION, ELEVATOR_ROOM_POSITION, HUB_ZONE, ROOM_ZONE,
} from '../../navigation/navigationConfig';

type ElevatorBox = { position: [number, number, number]; scale: [number, number, number] };
const CABIN_BOXES: ElevatorBox[] = [
  { position: [0, 0.05, 0], scale: [4.4, 0.1, 5] },
  { position: [0, 0.04, 2.65], scale: [2.6, 0.08, 0.7] },
  { position: [0, 3.45, 0], scale: [4.4, 0.15, 5] },
  { position: [-2.1, 1.75, 0], scale: [0.35, 3.5, 5] },
  { position: [2.1, 1.75, 0], scale: [0.35, 3.5, 5] },
  { position: [0, 1.75, -2.4], scale: [3.8, 3.5, 0.35] },
  { position: [-1.75, 1.75, 2.73], scale: [0.9, 3.5, 0.18] },
  { position: [1.75, 1.75, 2.73], scale: [0.9, 3.5, 0.18] },
];
const TRIM_BOXES: ElevatorBox[] = [
  { position: [-1.47, 1.75, 2.8], scale: [0.18, 3.6, 0.35] },
  { position: [1.47, 1.75, 2.8], scale: [0.18, 3.6, 0.35] },
  { position: [0, 3.45, 2.8], scale: [3.12, 0.2, 0.35] },
  { position: [0, 0.12, 2.8], scale: [2.95, 0.06, 0.2] },
  { position: [-1.9, 0.16, 0], scale: [0.035, 0.08, 4.6] },
  { position: [1.9, 0.16, 0], scale: [0.035, 0.08, 4.6] },
  { position: [0, 1.05, -2.18], scale: [3.5, 0.045, 0.06] },
  ...[-1.7, -0.6, 0.6, 1.7].flatMap(z => [
    { position: [-1.91, 1.75, z] as [number, number, number], scale: [0.015, 3.1, 0.02] as [number, number, number] },
    { position: [1.91, 1.75, z] as [number, number, number], scale: [0.015, 3.1, 0.02] as [number, number, number] },
  ]),
];

function CabinBoxes({ boxes, color }: { boxes: ElevatorBox[]; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const object = new THREE.Object3D();
    boxes.forEach((box, index) => {
      object.position.set(...box.position); object.scale.set(...box.scale); object.updateMatrix();
      ref.current?.setMatrixAt(index, object.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [boxes]);
  return <instancedMesh ref={ref} args={[undefined, undefined, boxes.length]} raycast={() => {}}>
    <boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color={color} toneMapped={false} />
  </instancedMesh>;
}

function CabinDoor({ doorRef, x }: { doorRef: RefObject<THREE.Group | null>; x: number }) {
  return <group ref={doorRef} position={[x, 1.75, 2.86]}>
    <mesh><boxGeometry args={[1.3, 3.4, 0.1]} /><meshBasicMaterial color="#59616a" toneMapped={false} /></mesh>
    <mesh position={[0, 0, -0.066]}><boxGeometry args={[0.28, 2.75, 0.015]} /><meshBasicMaterial color="#10191f" /></mesh>
    <mesh position={[0, 0, 0.066]}><boxGeometry args={[0.024, 3.15, 0.015]} /><meshBasicMaterial color="#d9b184" /></mesh>
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
    <CabinBoxes boxes={CABIN_BOXES} color="#303840" />
    <CabinBoxes boxes={TRIM_BOXES} color="#bd976e" />
    <mesh position={[0, 3.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.8, 3.6]} /><meshBasicMaterial ref={ledRef} color="#f7d8b4" side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
    <CabinDoor doorRef={leftDoorRef} x={-0.65} /><CabinDoor doorRef={rightDoorRef} x={0.65} />
    <instancedMesh ref={shaftRef} name="creator-elevator-shaft" args={[undefined, undefined, 14]} visible={moving && !reducedMotion} frustumCulled={false} raycast={() => {}}>
      <boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color="#e1b279" toneMapped={false} />
    </instancedMesh>
    <mesh ref={panelRef} position={[0, 1.85, -2.19]} onClick={e => { e.stopPropagation(); trigger(); }}>
      <planeGeometry args={[1.8, 0.79]} /><meshBasicMaterial map={panelTexture} toneMapped={false} />
    </mesh>
  </group>;
}
