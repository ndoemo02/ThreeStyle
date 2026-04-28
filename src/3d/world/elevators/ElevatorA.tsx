import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTransitionStore } from '../../../store/useTransitionStore';
import { Html } from '@react-three/drei';

export function ElevatorA() {
  const { elevatorState, setElevatorState, activeElevator } = useTransitionStore();
  const { camera } = useThree();
  
  const leftDoorRef = useRef<THREE.Mesh>(null);
  const rightDoorRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  const inTransit = elevatorState !== 'idle';
  const isActiveForUs = activeElevator === 'A';
  
  // Winda głęboka na 5.0m. Drzwi są na lokalnym Z=2.5.
  // Lobby: drzwi mają być na globalnym Z=-1.0. Grupa obrócona o 180°, więc drzwi globalnie są na Z_group - 2.5.
  // Z_group - 2.5 = -1.0 => Z_group = 1.5
  const lobbyPosition = new THREE.Vector3(-24, 0, 1.5);
  // Pokój: drzwi mają być na globalnym Z=7.0.
  // Z_group - 2.5 = 7.0 => Z_group = 9.5
  const roomPosition = new THREE.Vector3(0, 0, 9.5);

  const shaftGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    
    const targetPos = useTransitionStore.getState().activeZone === 'room1' ? roomPosition : lobbyPosition;
    
    groupRef.current.position.copy(targetPos);
    groupRef.current.rotation.set(0, Math.PI, 0); 
    
    if (elevatorState === 'moving' && isActiveForUs) {
      if (useTransitionStore.getState().activeZone === 'room1') {
        camera.position.set(roomPosition.x, 1.7, roomPosition.z);
        camera.rotation.set(0, 0, 0); 
      }
    }
  }, [useTransitionStore.getState().activeZone, elevatorState, isActiveForUs, camera, lobbyPosition, roomPosition]);

  useFrame((state, delta) => {
    if (shaftGroupRef.current && elevatorState === 'moving') {
      shaftGroupRef.current.position.y -= delta * 5;
      if (shaftGroupRef.current.position.y < -2) {
        shaftGroupRef.current.position.y += 2;
      }
    }

    if (!leftDoorRef.current || !rightDoorRef.current) return;

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
    } 
    else if (elevatorState === 'moving') {
      leftDoorRef.current.position.x = -1.0;
      rightDoorRef.current.position.x = 1.0;
    }
    else if (elevatorState === 'doors_opening') {
      leftDoorRef.current.position.x = THREE.MathUtils.lerp(leftDoorRef.current.position.x, -3.0, speed);
      rightDoorRef.current.position.x = THREE.MathUtils.lerp(rightDoorRef.current.position.x, 3.0, speed);
      
      if (Math.abs(leftDoorRef.current.position.x - -3.0) < 0.05) {
        leftDoorRef.current.position.x = -3.0;
        rightDoorRef.current.position.x = 3.0;
        setElevatorState('idle');
      }
    }
  });

  useEffect(() => {
    if (elevatorState === 'moving' && isActiveForUs) {
      const timer = setTimeout(() => {
        setElevatorState('doors_opening');
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, [elevatorState, isActiveForUs, setElevatorState]);

  return (
    <group ref={groupRef}>
      {/* Podłoga */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[4.4, 0.1, 5.0]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Sufit */}
      <mesh position={[0, 3.45, 0]}>
        <boxGeometry args={[4.4, 0.1, 5.0]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.8} />
      </mesh>
      
      {/* Emisyjny panel na suficie */}
      <mesh position={[0, 3.39, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 4.6]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
      </mesh>
      
      {/* Światła w windzie */}
      <pointLight position={[0, 2.8, 0]} intensity={3} distance={7} color="#ffffff" />
      <pointLight position={[0, 1.5, -1.8]} intensity={inTransit && isActiveForUs ? 4 : 1.5} distance={5} color="#4fd1c5" />

      {/* Ściana Lewa (Solidna) */}
      <mesh position={[-2.1, 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 3.5, 5.0]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Ściana Prawa (Solidna) */}
      <mesh position={[2.1, 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 3.5, 5.0]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Tył (Solidna ściana z lustrzanym odbiciem) */}
      <mesh position={[0, 1.75, -2.4]} castShadow receiveShadow>
        <boxGeometry args={[4.0, 3.5, 0.2]} />
        <meshStandardMaterial color="#050505" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Drzwi Lewe (Przód, Z=2.5) */}
      {/* Zmieniono materiał na nieprzezroczysty, matowy grafit */}
      <mesh ref={leftDoorRef} position={[-1.0, 1.75, 2.5]} castShadow>
        <boxGeometry args={[2.0, 3.5, 0.1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Drzwi Prawe (Przód, Z=2.5) */}
      <mesh ref={rightDoorRef} position={[1.0, 1.75, 2.5]} castShadow>
        <boxGeometry args={[2.0, 3.5, 0.1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Panel Wewnętrzny */}
      {elevatorState === 'idle' && (
        <Html transform scale={0.25} position={[0, 1.5, -2.28]} rotation={[0, 0, 0]}>
          <div 
            className="w-80 h-32 bg-black/90 border-2 border-teal-500/50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-teal-400 transition-all shadow-[0_0_25px_rgba(79,209,197,0.4)] backdrop-blur-md"
            onClick={(e) => {
              e.stopPropagation();
              const target = useTransitionStore.getState().activeZone === 'room1' ? 'hub' : 'room1';
              useTransitionStore.getState().enterElevator('A', target);
            }}
          >
            <div className="text-teal-400 text-xl font-mono mb-3 tracking-widest text-center uppercase font-bold">
              {useTransitionStore.getState().activeZone === 'room1' ? 'BACK TO LOBBY' : 'STUDIO A'}
              <br/><span className="text-sm opacity-70 mt-1 block">[TAP TO ENTER]</span>
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
