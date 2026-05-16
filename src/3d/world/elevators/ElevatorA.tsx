import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useTransitionStore } from '../../../store/useTransitionStore';

const LOBBY_POS = new THREE.Vector3(-24, 0, 1.5);
// In the studio, keep the cabin beyond the doorway so it reads like a transition point,
// not a freestanding object parked in the middle of the room.
const ROOM_POS = new THREE.Vector3(0, 0, 12.2);

export function ElevatorA({ visible = true }: { visible?: boolean }) {
  const elevatorState = useTransitionStore((s) => s.elevatorState);
  const setElevatorState = useTransitionStore((s) => s.setElevatorState);
  const activeElevator = useTransitionStore((s) => s.activeElevator);
  const activeZone = useTransitionStore((s) => s.activeZone);
  const enterElevator = useTransitionStore((s) => s.enterElevator);
  const { camera } = useThree();

  const leftDoorRef = useRef<THREE.Mesh>(null);
  const rightDoorRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const shaftGroupRef = useRef<THREE.Group>(null);
  const panelHitRef = useRef<THREE.Mesh>(null);
  const cooldownUntilRef = useRef(0);

  const [panelHovered, setPanelHovered] = useState(false);
  const [panelInteractable, setPanelInteractable] = useState(false);

  const inTransit = elevatorState !== 'idle';
  const isActiveForUs = activeElevator === 'A';

  const isCameraInsideCabin = useCallback(() => {
    if (!groupRef.current) return false;
    const localCamera = groupRef.current.worldToLocal(camera.position.clone());
    return (
      localCamera.x > -1.35 &&
      localCamera.x < 1.35 &&
      localCamera.z > -2.15 &&
      localCamera.z < 0.45
    );
  }, [camera]);

  const triggerElevator = useCallback(() => {
    const now = performance.now();
    if (elevatorState !== 'idle' || now < cooldownUntilRef.current || !isCameraInsideCabin()) {
      return;
    }

    const target = activeZone === 'room1' ? 'hub' : 'room1';
    enterElevator('A', target);
    cooldownUntilRef.current = now + 5000;
  }, [activeZone, elevatorState, enterElevator, isCameraInsideCabin]);

  useEffect(() => {
    if (!groupRef.current) return;

    const targetPos = activeZone === 'room1' ? ROOM_POS : LOBBY_POS;
    groupRef.current.position.copy(targetPos);
    groupRef.current.rotation.set(0, Math.PI, 0);

    if (elevatorState === 'moving' && isActiveForUs) {
      camera.position.set(targetPos.x, 1.7, targetPos.z);
      camera.rotation.set(0, 0, 0);
    }
  }, [activeZone, camera, elevatorState, isActiveForUs]);

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const forward = new THREE.Vector3(0, 0, -1);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat || !visible || elevatorState !== 'idle') return;

      if (panelHitRef.current) {
        forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
        raycaster.set(camera.position, forward);
        const hits = raycaster.intersectObject(panelHitRef.current);
        if (hits.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          triggerElevator();
          return;
        }
      }

      if (panelHovered) {
        e.preventDefault();
        e.stopPropagation();
        triggerElevator();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, elevatorState, panelHovered, triggerElevator, visible]);

  useFrame((state, delta) => {
    const insideCabin = elevatorState === 'idle' && isCameraInsideCabin();
    if (insideCabin !== panelInteractable) {
      setPanelInteractable(insideCabin);
    }

    if (shaftGroupRef.current && elevatorState === 'moving') {
      shaftGroupRef.current.position.y -= delta * 5;
      if (shaftGroupRef.current.position.y < -2) {
        shaftGroupRef.current.position.y += 2;
      }
      state.invalidate();
    }

    if (elevatorState === 'idle' && activeElevator === 'A' && groupRef.current) {
      const doorWorldX = groupRef.current.position.x;
      const doorWorldZ = groupRef.current.position.z - 2.5;
      const dx = camera.position.x - doorWorldX;
      const dz = camera.position.z - doorWorldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 8.0) {
        cooldownUntilRef.current = performance.now() + 4000;
        useTransitionStore.getState().releaseElevator();
      }
    }

    if (!leftDoorRef.current || !rightDoorRef.current) return;

    const animating =
      elevatorState === 'doors_closing' ||
      elevatorState === 'doors_opening' ||
      elevatorState === 'moving';

    if (!isActiveForUs) {
      if (elevatorState === 'idle') {
        leftDoorRef.current.position.x = THREE.MathUtils.lerp(leftDoorRef.current.position.x, -3.0, 5 * delta);
        rightDoorRef.current.position.x = THREE.MathUtils.lerp(rightDoorRef.current.position.x, 3.0, 5 * delta);
      }
      return;
    }

    const speed = 3.5 * delta;

    if (elevatorState === 'doors_closing') {
      leftDoorRef.current.position.x = THREE.MathUtils.lerp(leftDoorRef.current.position.x, -1.0, speed);
      rightDoorRef.current.position.x = THREE.MathUtils.lerp(rightDoorRef.current.position.x, 1.0, speed);

      if (Math.abs(leftDoorRef.current.position.x - -1.0) < 0.02) {
        leftDoorRef.current.position.x = -1.0;
        rightDoorRef.current.position.x = 1.0;
        setElevatorState('moving');
      }
    } else if (elevatorState === 'moving') {
      leftDoorRef.current.position.x = -1.0;
      rightDoorRef.current.position.x = 1.0;
    } else if (elevatorState === 'doors_opening') {
      leftDoorRef.current.position.x = THREE.MathUtils.lerp(leftDoorRef.current.position.x, -3.0, speed);
      rightDoorRef.current.position.x = THREE.MathUtils.lerp(rightDoorRef.current.position.x, 3.0, speed);

      if (Math.abs(leftDoorRef.current.position.x - -3.0) < 0.05) {
        leftDoorRef.current.position.x = -3.0;
        rightDoorRef.current.position.x = 3.0;
        setElevatorState('idle');
      }
    }

    if (animating) state.invalidate();
  });

  useEffect(() => {
    if (elevatorState === 'moving' && isActiveForUs) {
      const timer = setTimeout(() => {
        setElevatorState('doors_opening');
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (elevatorState === 'idle') {
      cooldownUntilRef.current = performance.now() + 4000;
    }
  }, [elevatorState, isActiveForUs, setElevatorState]);

  if (!visible) {
    return null;
  }

  const panelLabel = activeZone === 'room1' ? 'BACK TO LOBBY' : 'STUDIO A';
  const panelPromptVisible = elevatorState === 'idle' && panelHovered && panelInteractable;

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.1, 5.0]} />
        <meshStandardMaterial color="#141418" roughness={0.5} metalness={0.08} />
      </mesh>
      <mesh position={[-2.08, 0.16, 0]} castShadow>
        <boxGeometry args={[0.04, 0.12, 5.0]} />
        <meshStandardMaterial color="#b8875e" roughness={0.35} metalness={0.9} />
      </mesh>
      <mesh position={[2.08, 0.16, 0]} castShadow>
        <boxGeometry args={[0.04, 0.12, 5.0]} />
        <meshStandardMaterial color="#b8875e" roughness={0.35} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.16, -2.28]} castShadow>
        <boxGeometry args={[4.0, 0.12, 0.04]} />
        <meshStandardMaterial color="#b8875e" roughness={0.35} metalness={0.9} />
      </mesh>

      <mesh position={[0, 3.45, 0]}>
        <boxGeometry args={[4.4, 0.15, 5.0]} />
        <meshStandardMaterial color="#0d0d10" roughness={0.75} metalness={0.15} />
      </mesh>
      <mesh position={[0, 3.34, 0]}>
        <boxGeometry args={[3.4, 0.08, 4.2]} />
        <meshStandardMaterial color="#16161a" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 3.37, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 3.6]} />
        <meshStandardMaterial color="#fff8f0" emissive="#fff8f0" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[-2.05, 3.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.04, 4.2]} />
        <meshBasicMaterial color="#e8b88a" transparent opacity={0.12} side={THREE.FrontSide} depthWrite={false} />
      </mesh>
      <mesh position={[2.05, 3.25, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <planeGeometry args={[0.04, 4.2]} />
        <meshBasicMaterial color="#e8b88a" transparent opacity={0.12} side={THREE.FrontSide} depthWrite={false} />
      </mesh>

      <pointLight position={[0, 2.8, 0]} intensity={1.8} distance={6} color="#fff8f0" />
      <pointLight position={[0, 1.5, -1.8]} intensity={inTransit && isActiveForUs ? 2.5 : 0.8} distance={4} color="#4fd1c5" />

      <mesh position={[-2.1, 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 3.5, 5.0]} />
        <meshStandardMaterial color="#16161a" metalness={0.82} roughness={0.38} />
      </mesh>
      {[-1.8, -0.6, 0.6, 1.8].map((z, i) => (
        <mesh key={`left-slat-${i}`} position={[-2.0, 1.75, z]} castShadow>
          <boxGeometry args={[0.008, 3.2, 0.03]} />
          <meshStandardMaterial color="#2a2a30" metalness={0.88} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[-2.08, 1.75, -2.38]} castShadow>
        <boxGeometry args={[0.04, 3.3, 0.04]} />
        <meshStandardMaterial color="#b8875e" roughness={0.35} metalness={0.9} />
      </mesh>

      <mesh position={[2.1, 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.35, 3.5, 5.0]} />
        <meshStandardMaterial color="#16161a" metalness={0.82} roughness={0.38} />
      </mesh>
      {[-1.8, -0.6, 0.6, 1.8].map((z, i) => (
        <mesh key={`right-slat-${i}`} position={[2.0, 1.75, z]} castShadow>
          <boxGeometry args={[0.008, 3.2, 0.03]} />
          <meshStandardMaterial color="#2a2a30" metalness={0.88} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[2.08, 1.75, -2.38]} castShadow>
        <boxGeometry args={[0.04, 3.3, 0.04]} />
        <meshStandardMaterial color="#b8875e" roughness={0.35} metalness={0.9} />
      </mesh>

      <mesh position={[0, 1.75, -2.4]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 3.5, 0.35]} />
        <meshStandardMaterial color="#1a1816" metalness={0.95} roughness={0.06} />
      </mesh>
      <mesh position={[-1.88, 1.75, -2.38]}>
        <boxGeometry args={[0.04, 3.3, 0.04]} />
        <meshStandardMaterial color="#b8875e" roughness={0.35} metalness={0.9} />
      </mesh>
      <mesh position={[1.88, 1.75, -2.38]}>
        <boxGeometry args={[0.04, 3.3, 0.04]} />
        <meshStandardMaterial color="#b8875e" roughness={0.35} metalness={0.9} />
      </mesh>
      <mesh position={[0, 3.28, -2.38]}>
        <boxGeometry args={[3.84, 0.04, 0.04]} />
        <meshStandardMaterial color="#b8875e" roughness={0.35} metalness={0.9} />
      </mesh>

      <mesh position={[0, 1.05, -2.35]} castShadow>
        <boxGeometry args={[3.2, 0.04, 0.06]} />
        <meshStandardMaterial color="#b8875e" roughness={0.3} metalness={0.92} />
      </mesh>
      {[-1.2, 1.2].map((x, i) => (
        <mesh key={`rail-bracket-${i}`} position={[x, 0.95, -2.33]} castShadow>
          <boxGeometry args={[0.04, 0.2, 0.04]} />
          <meshStandardMaterial color="#9a6e4a" roughness={0.3} metalness={0.92} />
        </mesh>
      ))}

      <mesh ref={leftDoorRef} position={[-1.0, 1.75, 2.5]} castShadow>
        <boxGeometry args={[2.0, 3.5, 0.1]} />
        <meshStandardMaterial color="#35353a" roughness={0.3} metalness={0.9} />
      </mesh>
      {[0, 0.55].map((ox, i) => (
        <mesh key={`ld-groove-${i}`} position={[-1.0 + ox, 1.75, 2.56]} castShadow>
          <boxGeometry args={[0.018, 3.2, 0.02]} />
          <meshStandardMaterial color="#252528" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}

      <mesh ref={rightDoorRef} position={[1.0, 1.75, 2.5]} castShadow>
        <boxGeometry args={[2.0, 3.5, 0.1]} />
        <meshStandardMaterial color="#35353a" roughness={0.3} metalness={0.9} />
      </mesh>
      {[0, -0.55].map((ox, i) => (
        <mesh key={`rd-groove-${i}`} position={[1.0 + ox, 1.75, 2.56]} castShadow>
          <boxGeometry args={[0.018, 3.2, 0.02]} />
          <meshStandardMaterial color="#252528" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}

      <mesh position={[0, 3.28, 2.48]} castShadow>
        <boxGeometry args={[3.84, 0.05, 0.06]} />
        <meshStandardMaterial color="#b8875e" roughness={0.35} metalness={0.9} />
      </mesh>

      <mesh
        ref={panelHitRef}
        position={[0, 1.5, -2.18]}
        onClick={(e) => {
          e.stopPropagation();
          if (!panelInteractable) return;
          triggerElevator();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!panelInteractable) return;
          setPanelHovered(true);
        }}
        onPointerOut={() => setPanelHovered(false)}
      >
        <planeGeometry args={[1.8, 0.8]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {elevatorState === 'idle' && (
        <Html transform scale={0.25} position={[0, 1.5, -2.28]} rotation={[0, 0, 0]} pointerEvents="none">
          <div className="w-80 h-32 bg-black/90 border-2 border-teal-500/50 rounded-lg flex flex-col items-center justify-center shadow-[0_0_25px_rgba(79,209,197,0.4)] backdrop-blur-md">
            <div className="text-teal-400 text-xl font-mono mb-3 tracking-widest text-center uppercase font-bold">
              {panelLabel}
              <br />
              <span className="text-sm opacity-70 mt-1 block">{panelPromptVisible ? '[E] OR CLICK TO RIDE' : 'STEP INSIDE'}</span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-teal-400 flex items-center justify-center">
              <div className="w-6 h-6 bg-teal-400 rounded-full animate-pulse" />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
