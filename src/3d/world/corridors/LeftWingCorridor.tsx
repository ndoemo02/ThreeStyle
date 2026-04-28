"use client";

import { Html } from '@react-three/drei';
import { AcousticDarkMaterial, ConcreteFloorMaterial, AcousticFoamMaterial, WoodPanelMaterial } from '../../core/AcousticDarkMaterial';
import { RoomDoor } from '../../modules/doors/RoomDoor';
import { ScaleReferenceDummy } from '../../modules/debug/ScaleReferenceDummy';

const DOORS = [
  // Winda A jest na pozycji: id: 'creator-room-mvp', pos: [-14, 0, 3.9]
  { id: 'room-2', label: 'LOFI BEATS', status: 'active', users: 8, pos: [-19, 0, 3.9], rot: [0, Math.PI, 0] },
  { id: 'room-3', label: 'PODCAST 1', status: 'locked', users: 0, pos: [-14, 0, -3.9], rot: [0, 0, 0] },
  { id: 'room-4', label: 'PRIVATE', status: 'offline', users: 0, pos: [-19, 0, -3.9], rot: [0, 0, 0] },
  
  // Winda B bedzie na pozycji: id: 'room-5', pos: [-29, 0, 3.9]
  { id: 'room-6', label: 'CHILLOUT', status: 'active', users: 5, pos: [-34, 0, 3.9], rot: [0, Math.PI, 0] },
  { id: 'room-7', label: 'MIX ROOM', status: 'locked', users: 1, pos: [-29, 0, -3.9], rot: [0, 0, 0] },
  { id: 'room-8', label: 'ARCHIVE', status: 'offline', users: 0, pos: [-34, 0, -3.9], rot: [0, 0, 0] },
];

export function LeftWingCorridor({ onEnterRoom }: { onEnterRoom: (id: string) => void }) {
  return (
    <group position={[-10, 0, -5]}> 
      
      {/* Corridor Floor - Length 30. Width increased to 8 */}
      <mesh position={[-15, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <primitive object={ConcreteFloorMaterial} attach="material" />
      </mesh>
      
      {/* Corridor Ceiling */}
      <mesh position={[-15, 6, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <primitive object={AcousticDarkMaterial} attach="material" />
      </mesh>

      {/* Back/Side walls - Wood panels give structure and reflect light, stopping it from looking like a black void */}
      <mesh position={[-15, 3, -4]} castShadow receiveShadow>
        <boxGeometry args={[30, 6, 0.5]} />
        <primitive object={WoodPanelMaterial} attach="material" />
      </mesh>
      
      {/* Prawa ściana (od strony pokojów) podzielona na 3 części, z otworami na Windy A (X = -14) i B (X = -30) */}
      {/* Odcinek 1: od X=0 do X=-12.7 (Długość 12.7, środek -6.35) */}
      <mesh position={[-6.35, 3, 4]} castShadow receiveShadow>
        <boxGeometry args={[12.7, 6, 0.5]} />
        <primitive object={WoodPanelMaterial} attach="material" />
      </mesh>
      {/* Odcinek 2: od X=-15.3 do X=-29 (Długość 13.7, środek -22.15) */}
      <mesh position={[-22.15, 3, 4]} castShadow receiveShadow>
        <boxGeometry args={[13.7, 6, 0.5]} />
        <primitive object={WoodPanelMaterial} attach="material" />
      </mesh>
      {/* Odcinek 3: od X=-31 do X=-30 (Zastąpmy końcówkę, damy kawałek od X=-31.3 do -35 dla zapasu) */}
      <mesh position={[-33.15, 3, 4]} castShadow receiveShadow>
        <boxGeometry args={[3.7, 6, 0.5]} />
        <primitive object={WoodPanelMaterial} attach="material" />
      </mesh>

      {/* Ścianki nad otworami wind (Sufit wnęki na windę) */}
      <mesh position={[-14, 4.5, 4]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 3, 0.5]} />
        <primitive object={WoodPanelMaterial} attach="material" />
      </mesh>
      <mesh position={[-30, 4.5, 4]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 3, 0.5]} />
        <primitive object={WoodPanelMaterial} attach="material" />
      </mesh>

      {/* Vestibule Transition Walls (Connecting the narrow 2.4 Hub Entrance to the 8.0 Corridor) */}
      {/* Local X=0 is Absolute X=-10 (the exact wall line in the Hub). Z spans the gap difference. */}
      {/* Left side plug */}
      <mesh position={[-0.25, 3, 2.6]} receiveShadow castShadow>
         <boxGeometry args={[0.5, 6, 2.8]} /> {/* Z span: 4.0 to 1.2 = width 2.8 */}
         <primitive object={WoodPanelMaterial} attach="material" />
      </mesh>
      {/* Right side plug */}
      <mesh position={[-0.25, 3, -2.6]} receiveShadow castShadow>
         <boxGeometry args={[0.5, 6, 2.8]} /> {/* Z span: -1.2 to -4.0 = width 2.8 */}
         <primitive object={WoodPanelMaterial} attach="material" />
      </mesh>
      
      {/* Ceiling edge strip lights to wash the walls and define the corridor geometry */}
      <mesh position={[-15, 5.95, -3.7]}>
        <boxGeometry args={[30, 0.1, 0.1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>
      <mesh position={[-15, 5.95, 3.7]}>
        <boxGeometry args={[30, 0.1, 0.1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>

      {/* Section 1 local lighting */}
      <pointLight position={[-16.5, 4, 0]} intensity={1.5} color="#4fd1c5" distance={10} decay={2} />

      {/* Removed Scale Verification Dummy */}

      {/* --- Section 1 & Section 2 Doors --- */}
      {/* Note: doors coordinates are absolute inside GroundedHub for simplicity, actually they are relative to this group. Wait, since group is [-10, 0, -5], DOORS pos X should be relative. 
          If my group is at -10, door at X = -4 means world X = -14. */}
      {DOORS.map(d => (
        <RoomDoor 
          key={d.id} 
          position={[(d.pos[0] + 10), d.pos[1], d.pos[2]] as [number, number, number]} 
          rotation={d.rot as [number, number, number]} 
          label={d.label} 
          status={d.status as any} 
          userCount={d.users} 
          onEnter={() => onEnterRoom(d.id)} 
        />
      ))}

      {/* --- Transition Pocket --- */}
      {/* Break between section 1 and 2 (around relative X = -21) */}
      <group position={[-21.5, 0, 0]}>
        {/* Widening */}
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
          <planeGeometry args={[4, 11]} />
          <primitive object={ConcreteFloorMaterial} attach="material" />
        </mesh>
        {/* Transition pocket anchor: Central column/art */}
        <mesh position={[0, 3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.3, 6, 16]} />
          <primitive object={WoodPanelMaterial} attach="material" />
        </mesh>
        <pointLight position={[0, 4, 0]} intensity={3.5} color="#ff3366" distance={8} decay={2} />
        <mesh position={[0, 5, 0]} rotation={[Math.PI/2, 0, 0]}>
          <ringGeometry args={[1, 1.2, 32]} />
          <meshBasicMaterial color="#ff3366" />
        </mesh>
      </group>

      {/* Section 2 local lighting */}
      <pointLight position={[-21.5, 4, 0]} intensity={1.5} color="#ebf4fa" distance={10} decay={2} />

      {/* --- End: Elevator Hub --- */}
      <group position={[-29.5, 0, 0]} rotation={[0, Math.PI/2, 0]}>
        
        {/* Elevator Floor area */}
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[8, 6]} />
          <meshStandardMaterial color="#202020" roughness={0.1} metalness={0.8} />
        </mesh>
        
        {/* End Wall capping the corridor void */}
        <mesh position={[0, 3, -1.2]} castShadow receiveShadow>
          <boxGeometry args={[8, 6, 0.5]} />
          <primitive object={WoodPanelMaterial} attach="material" />
        </mesh>

        {/* Elevator Frame */}
        <mesh position={[0, 3, -1]} castShadow receiveShadow>
          <boxGeometry args={[4, 6, 1]} />
          <meshStandardMaterial color="#555555" metalness={0.9} roughness={0.2} />
        </mesh>
        
        {/* Elevator Doors */}
        <mesh position={[0, 3, -0.4]}>
          <boxGeometry args={[3.6, 5.8, 0.1]} />
          <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.1} />
        </mesh>
        
        <pointLight position={[0, 4, 1]} intensity={5} color="#ffffff" distance={8} decay={2} />
        
        {/* Elevator Label */}
        <Html transform occlude position={[0, 4.5, 0.2]} distanceFactor={3}>
          <div className="flex border border-white/20 bg-black/80 px-6 py-2 rounded text-white font-bold tracking-[0.3em] backdrop-blur text-sm">
            ELEVATOR HUB
          </div>
        </Html>
      </group>

    </group>
  );
}
