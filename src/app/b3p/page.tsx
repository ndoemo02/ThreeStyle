"use client";

import { useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { GroundedHub } from '../../3d/world/hub/GroundedHub';
import { CreatorRoomMVP } from '../../3d/world/rooms/CreatorRoomMVP';
import { BaseNavigationControls } from '../../3d/systems/BaseNavigationControls';
import { HudOverlay } from '../../components/HudOverlay';
import { NativeMobileJoystick } from '../../components/ui/NativeMobileJoystick';
import { PerformanceCounter } from '../../components/PerformanceCounter';
import { useTransitionStore } from '../../store/useTransitionStore';
import { ElevatorA } from '../../3d/world/elevators/ElevatorA';

type CameraPreset = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

function getRoomCameraPreset(width: number, height: number): CameraPreset {
  if (height > width) {
    return {
      position: [0.55, 2.24, 5.2],
      target: [1.45, 1.78, -2.15],
      fov: 52,
    };
  }

  if (width < 1024) {
    return {
      position: [0.1, 2.1, 2.9],
      target: [0.95, 1.95, -2.45],
      fov: 54,
    };
  }

  return {
    position: [0, 2.1, 2.4],
    target: [0.8, 1.95, -2.2],
    fov: 58,
  };
}

function getHubCameraPreset(width: number, height: number): CameraPreset {
  if (height > width) {
    return {
      position: [0, 2.05, 6],
      target: [0, 2.05, 0],
      fov: 58,
    };
  }

  if (width < 1024) {
    return {
      position: [0, 2.05, 5.4],
      target: [0, 2.05, 0],
      fov: 58,
    };
  }

  return {
    position: [0, 2.05, 5],
    target: [0, 2.05, 0],
    fov: 60,
  };
}

function AdaptiveEnvironment() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || window.innerHeight < 500);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return <Environment preset="apartment" environmentIntensity={isMobile ? 0.12 : 0.3} />;
}

function ZoneController({ activeZone }: { activeZone: string }) {
  const { size, camera } = useThree();
  const elevatorState = useTransitionStore(s => s.elevatorState);
  const activeElevator = useTransitionStore(s => s.activeElevator);

  const preset = useMemo(() => {
    return activeZone === 'hub'
      ? getHubCameraPreset(size.width, size.height)
      : getRoomCameraPreset(size.width, size.height);
  }, [activeZone, size.width, size.height]);

  const shouldForcePosition = elevatorState === 'idle' && activeElevator === null;

  // Force camera to zone preset on mount and on zone change (not during elevator transit)
  useEffect(() => {
    if (!shouldForcePosition) return;
    camera.position.set(...preset.position);
    camera.lookAt(...preset.target);
    camera.updateProjectionMatrix();
  }, [activeZone, shouldForcePosition, camera, preset]);

  // Also keep fov synced and prevent camera drift via onUpdate
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = preset.fov;
      camera.updateProjectionMatrix();
    }
  }, [preset.fov, camera]);

  return null;
}

export default function B3PPage() {
  const activeZone = useTransitionStore(s => s.activeZone);
  const setActiveZone = useTransitionStore(s => s.setActiveZone);

  return (
    <div className="b3p-fullscreen">

      {/* UI Overlay Help */}
      <div className="absolute top-4 left-4 z-10 p-4 font-mono text-xs text-white/50 pointer-events-none drop-shadow-md">
        <div>B3P (Blok Trzech Pięter)</div>
        <div className="text-white">ZONE: {activeZone.toUpperCase()}</div>
        <div className="mt-2 text-teal-400">
          ● Click canvas to lock cursor.<br/>
          ● WASD to move.<br/>
          ● Press [E] on screens to interact.<br/>
          ● Look at Doors + [E] to Enter.<br/>
        </div>
      </div>

      <button
        onClick={() => {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
              console.error("Fullscreen err:", err);
            });
          }
        }}
        className="absolute top-4 right-4 z-50 bg-black/60 text-white/50 text-[10px] font-mono border border-white/10 px-3 py-1.5 rounded hover:bg-white/10 hover:text-white transition-all tracking-widest"
      >
        [⛶ FULLSCREEN]
      </button>



      {/* Permanent Crosshair — celownik (inline styles — Tailwind broken) */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 20, pointerEvents: 'none',
      }}>
        <div style={{
          width: '4px', height: '4px',
          background: 'white', borderRadius: '50%',
          mixBlendMode: 'difference',
          boxShadow: '0 0 6px rgba(255,255,255,0.6)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '16px', height: '16px',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.3)',
          mixBlendMode: 'difference',
        }} />
      </div>

      <div className="b3p-canvas-wrap">
        <Canvas
          shadows
          frameloop="always"
          dpr={[1, 1.5]}
          onCreated={({ gl }) => {
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
          }}
          camera={{ position: [0, 2.05, 5], fov: 60 }}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
        <ZoneController activeZone={activeZone} />
        
        {/* Subtelny ambient — podbija cienie na mobile */}
        <ambientLight intensity={0.2} />

        {/* Jasna mgła w kolorze ścian — zamyka przestrzeń, eliminuje czarną pustkę */}
        <fog attach="fog" args={['#e8e0d5', 18, 55]} />
        <color attach="background" args={['#e8e0d5']} />

        {/* Ciepłe, subtelne refleksy środowiskowe — zredukowane na mobile */}
        <AdaptiveEnvironment />

        <PerformanceCounter />

        {activeZone === 'hub' && <GroundedHub onEnterRoom={(id) => setActiveZone(id)} />}
        {activeZone !== 'hub' && <CreatorRoomMVP onExit={() => setActiveZone('hub')} />}
        
        {/* Windy są niezależne od strefy, żeby mogły działać jako pomost */}
        <ElevatorA />

        <BaseNavigationControls />
      </Canvas>
      </div>
      <HudOverlay />
      <NativeMobileJoystick />
    </div>
  );
}
