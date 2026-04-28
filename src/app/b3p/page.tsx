"use client";

import { useState, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import { GroundedHub } from '../../3d/world/hub/GroundedHub';
import { CreatorRoomMVP } from '../../3d/world/rooms/CreatorRoomMVP';
import { BaseNavigationControls } from '../../3d/systems/BaseNavigationControls';
import { HudOverlay } from '../../components/HudOverlay';
import { NativeMobileJoystick } from '../../components/ui/NativeMobileJoystick';
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

function ZoneController({ activeZone }: { activeZone: string }) {
  const { size } = useThree();
  const elevatorState = useTransitionStore(s => s.elevatorState);
  const activeElevator = useTransitionStore(s => s.activeElevator);

  const preset = useMemo(() => {
    return activeZone === 'hub'
      ? getHubCameraPreset(size.width, size.height)
      : getRoomCameraPreset(size.width, size.height);
  }, [activeZone, size.width, size.height]);

  const shouldForcePosition = elevatorState === 'idle' && activeElevator === null;

  return (
    <PerspectiveCamera
      makeDefault
      position={shouldForcePosition ? preset.position : undefined}
      fov={preset.fov}
      onUpdate={(cam) => {
        if (shouldForcePosition) {
          cam.lookAt(...preset.target);
          cam.updateProjectionMatrix();
        }
      }}
    />
  );
}

export default function B3PPage() {
  const activeZone = useTransitionStore(s => s.activeZone);
  const setActiveZone = useTransitionStore(s => s.setActiveZone);

  return (
    <div className="w-[100vw] h-[100dvh] bg-black fixed inset-0 z-50">
      
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


      
      {/* Permanent Crosshair indicating user focus */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full z-20 pointer-events-none mix-blend-difference opacity-70 shadow-[0_0_5px_rgba(255,255,255,0.5)]" />

      <Canvas shadows camera={{ position: [0, 2.05, 5], fov: 60 }}>
        <ZoneController activeZone={activeZone} />
        
        {/* Soft fill to prevent zero-value crushed blacks on mobile displays */}
        <ambientLight intensity={0.15} />

        {/* Deep atmospheric fog blending into absolute black */}
        <fog attach="fog" args={['#080808', 5, 25]} />
        <color attach="background" args={['#080808']} />
        
        {/* Muted reflections, keeps it dark and moody but gives depth to concrete */}
        {/* Raised slightly from 0.15 to 0.25 to lift overall environmental midtones */}
        <Environment preset="city" environmentIntensity={0.25} />

        {activeZone === 'hub' && <GroundedHub onEnterRoom={(id) => setActiveZone(id)} />}
        {activeZone !== 'hub' && <CreatorRoomMVP onExit={() => setActiveZone('hub')} />}
        
        {/* Windy są niezależne od strefy, żeby mogły działać jako pomost */}
        <ElevatorA />

        <BaseNavigationControls />
      </Canvas>
      <HudOverlay />
      <NativeMobileJoystick />
    </div>
  );
}
