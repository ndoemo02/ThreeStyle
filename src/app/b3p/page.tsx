"use client";

import { useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { GroundedHub } from '../../3d/world/hub/GroundedHub';
import { CreatorRoomMVP } from '../../3d/world/rooms/CreatorRoomMVP';
import { BaseNavigationControls } from '../../3d/systems/BaseNavigationControls';
import { HudOverlay } from '../../components/HudOverlay';
import { NativeMobileJoystick } from '../../components/ui/NativeMobileJoystick';

function ZoneController({ activeZone }: { activeZone: string }) {
  const { camera } = useThree();
  useEffect(() => {
    if (activeZone === 'hub') {
       camera.position.set(0, 2.05, 5);
       camera.rotation.set(0, 0, 0);
       camera.lookAt(0, 2.05, 0);
    } else {
       camera.position.set(0, 2.05, 2);
       camera.rotation.set(0, 0, 0);
       camera.lookAt(0, 2.05, 0); // Desktop is at negative Z
    }
  }, [activeZone, camera]);
  return null;
}

export default function B3PPage() {
  const [activeZone, setActiveZone] = useState('hub');

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

      {activeZone !== 'hub' && (
        <button 
          onClick={() => setActiveZone('hub')}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white font-bold border border-white/20 px-8 py-3 rounded backdrop-blur hover:bg-white/10 tracking-[0.2em]"
        >
          [ESC] EXIT ROOM
        </button>
      )}
      
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
        {activeZone !== 'hub' && <CreatorRoomMVP />}

        <BaseNavigationControls />
      </Canvas>
      <HudOverlay />
      <NativeMobileJoystick />
    </div>
  );
}
