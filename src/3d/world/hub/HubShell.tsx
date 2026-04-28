"use client";

import { AcousticDarkMaterial, ConcreteFloorMaterial, WoodPanelMaterial, AcousticFoamMaterial, SpeakerGrilleMaterial } from '../../core/AcousticDarkMaterial';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';

export function HubShell() {
  const woodTexture = useTexture('/textures/Lamele/Veneer/Veneer/Tekstury/LAM_P3_LIGHT_OAK.jpg');
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(4, 2);

  return (
    <group>
      {/* Polished Concrete Ground Floor */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <primitive object={ConcreteFloorMaterial} attach="material" />
      </mesh>

      {/* Ceiling to contain light bounces */}
      <mesh position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <primitive object={AcousticDarkMaterial} attach="material" />
      </mesh>

      {/* Main Back Wall - Base Acoustic */}
      <mesh position={[0, 4, -10]} castShadow receiveShadow>
        <boxGeometry args={[20, 8, 1]} />
        <meshStandardMaterial map={woodTexture} roughness={0.9} color="#8a7360" />
      </mesh>
      
      {/* Identity Wall Composition (Wood Slats + Emissive Focal Ring) */}
      <group position={[0, 4, -9.4]}>
        {/* Slats */}
        {[...Array(12)].map((_, i) => (
          <mesh key={i} position={[-5.5 + i * 1.0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.4, 8, 0.2]} />
            <meshStandardMaterial map={woodTexture} roughness={0.7} color="#b5947a" />
          </mesh>
        ))}
        {/* Emissive Focal Ring (Branded Identity) */}
        <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 0.1, 64]} />
          <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.26]}>
          <ringGeometry args={[2.2, 2.3, 64]} />
          <meshBasicMaterial color="#4fd1c5" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Side walls - Acoustic Foam for studio vibe */}
      
      {/* Left wall Split for Corridor entrance (Controlled narrow premium gap: width 2.4 from Z=-3.8 to Z=-6.2) */}
      <mesh position={[-10, 4, 3.1]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[13.8, 8, 1]} /> {/* Spans from Z=10 down to Z=-3.8 */}
        <primitive object={AcousticDarkMaterial} attach="material" />
      </mesh>
      <mesh position={[-10, 4, -8.1]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 8, 1]} /> {/* Spans from Z=-6.2 down to Z=-10 */}
        <primitive object={AcousticDarkMaterial} attach="material" />
      </mesh>
      {/* The physical gap is Z = -3.8 to -6.2 (Width 2.4). The entrance sits exactly inside this gap at Z=-5. */}

      <mesh position={[10, 4, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[20, 8, 1]} />
        <primitive object={AcousticDarkMaterial} attach="material" />
      </mesh>

      {/* --- Music Anchor: Analog Listening Station --- */}
      <group position={[-6.5, 0, -8]} rotation={[0, Math.PI / 4, 0]}>
        {/* Heavy DJ Desk */}
        <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.15, 1.2]} />
          <primitive object={WoodPanelMaterial} attach="material" />
        </mesh>
        {/* Desk Legs */}
        <mesh position={[-1.4, 0.5, 0]}><boxGeometry args={[0.1, 1.0, 1.0]} /><primitive object={AcousticDarkMaterial} attach="material" /></mesh>
        <mesh position={[1.4, 0.5, 0]}><boxGeometry args={[0.1, 1.0, 1.0]} /><primitive object={AcousticDarkMaterial} attach="material" /></mesh>

        {/* Central Deck / Turntable */}
        <mesh position={[0, 1.1, 0.1]}>
          <boxGeometry args={[0.8, 0.05, 0.6]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 1.13, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.02, 32]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
        
        {/* Soft task light for the station midtones */}
        <pointLight position={[0, 2.5, 0]} intensity={1.5} distance={5} decay={2} color="#f0d5c9" />

        {/* Left Monitor over stand */}
        <group position={[-1.2, 1.5, -0.2]} rotation={[0, Math.PI / 8, 0]}>
          <mesh castShadow receiveShadow><boxGeometry args={[0.6, 0.9, 0.6]} /><primitive object={WoodPanelMaterial} attach="material" /></mesh>
          <mesh position={[0, 0.15, 0.31]}><circleGeometry args={[0.18, 32]} /><primitive object={SpeakerGrilleMaterial} attach="material" /></mesh>
          <mesh position={[0, -0.2, 0.31]}><circleGeometry args={[0.22, 32]} /><primitive object={SpeakerGrilleMaterial} attach="material" /></mesh>
        </group>

        {/* Right Monitor over stand */}
        <group position={[1.2, 1.5, -0.2]} rotation={[0, -Math.PI / 8, 0]}>
          <mesh castShadow receiveShadow><boxGeometry args={[0.6, 0.9, 0.6]} /><primitive object={WoodPanelMaterial} attach="material" /></mesh>
          <mesh position={[0, 0.15, 0.31]}><circleGeometry args={[0.18, 32]} /><primitive object={SpeakerGrilleMaterial} attach="material" /></mesh>
          <mesh position={[0, -0.2, 0.31]}><circleGeometry args={[0.22, 32]} /><primitive object={SpeakerGrilleMaterial} attach="material" /></mesh>
        </group>
      </group>

      {/* --- Orientation Anchors --- */}
      
      {/* Left Wall Baseboard Accent (Light Path) */}
      <mesh position={[-9.45, 0.1, 0]}>
        <boxGeometry args={[0.05, 0.2, 20]} />
        <meshBasicMaterial color="#4fd1c5" transparent opacity={0.3} blending={2} />
      </mesh>

      {/* Right Wall Baseboard Accent (Light Path) */}
      <mesh position={[9.45, 0.1, 0]}>
        <boxGeometry args={[0.05, 0.2, 20]} />
        <meshBasicMaterial color="#4fd1c5" transparent opacity={0.3} blending={2} />
      </mesh>

      {/* Lintel Wall above the narrow gap to close the ceiling void */}
      <mesh position={[-10, 6.1, -5]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 3.8, 1]} /> {/* Spans from Y=4.2 to Y=8 over the 2.4 wide gap */}
        <primitive object={AcousticDarkMaterial} attach="material" />
      </mesh>

      {/* Demo Portal Entrance (Architectural Integration) */}
      <group position={[-9.5, 0, -5]} rotation={[0, Math.PI/2, 0]}>
        
        {/* Portal Definition Light */}
        <pointLight position={[0, 2.0, 1.5]} intensity={1.5} distance={6} decay={2} color="#ffffff" />
        
        {/* Integrated Architectural Architrave */}
        {/* Massive Top Lintel Block (Extends out and down) */}
        <mesh position={[0, 3.6, 0.3]} castShadow receiveShadow>
          <boxGeometry args={[3.0, 0.8, 0.6]} />
          <meshStandardMaterial color="#151515" roughness={0.7} metalness={0.5} />
        </mesh>
        
        {/* Internal Ceiling of the portal (to ensure 100% no light leak) */}
        <mesh position={[0, 3.5, -0.4]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.2, 1.0]} />
          <meshStandardMaterial color="#111111" roughness={0.8} />
        </mesh>

        {/* Structural Side Columns (acting as load-bearing doorway pillars) */}
        <mesh position={[1.3, 1.8, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 3.6, 0.8]} />
          <meshStandardMaterial color="#151515" roughness={0.7} metalness={0.5} />
        </mesh>
        <mesh position={[-1.3, 1.8, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 3.6, 0.8]} />
          <meshStandardMaterial color="#151515" roughness={0.7} metalness={0.5} />
        </mesh>

        {/* Identity Indicator Strip incorporated into the Lintel */}
        <mesh position={[0, 3.8, 0.65]}>
          <boxGeometry args={[2.0, 0.05, 0.02]} />
          <meshBasicMaterial color="#ff3366" />
        </mesh>

        {/* Flush Architectural Label using precise raycasting occlusion */}
        <Html transform occlude wrapperClass="entrance-ui" position={[0, 3.6, 0.65]} distanceFactor={3.5}>
           <div className="flex flex-col justify-center items-center font-mono">
              <div className="text-[#ff3366] text-[8px] tracking-[0.4em] mb-1 opacity-80">B3P // SECTOR A</div>
              <div className="text-white font-black tracking-[0.2em] text-lg select-none drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                LEFT WING STUDIOS
              </div>
           </div>
        </Html>

        {/* Emissive Floor Plate instead of floating glow */}
        <mesh position={[0, 0.02, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[2.4, 1.0]} />
          <meshBasicMaterial color="#ff3366" transparent opacity={0.15} blending={2} />
        </mesh>
      </group>
    </group>
  );
}
