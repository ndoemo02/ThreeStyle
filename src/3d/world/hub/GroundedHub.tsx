"use client";

import { Suspense, useRef } from 'react';
import { HubShell } from './HubShell';
import { FakeLightCone } from '../../modules/fx/FakeLightCone';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { LeftWingCorridor } from '../corridors/LeftWingCorridor';

export function GroundedHub({ onEnterRoom }: { onEnterRoom?: (id: string) => void }) {
  const spotLightTarget = useRef<THREE.Object3D>(new THREE.Object3D());

  return (
    <group>
      {/* Environmental Fill: Replaced flat ambient with hemisphere to lift structure, midtones, and shadows */}
      <hemisphereLight args={['#ffffff', '#333333', 0.65]} />
      <directionalLight position={[0, 10, -5]} intensity={0.85} color="#ffffff" castShadow />

      {/* Target for the Spotlight so it aims directly at the floor pool */}
      <primitive object={spotLightTarget.current} position={[0, 0, -8]} />

      {/* Fake Volumetric Cone Light Spill & Floor Pool */}
      <spotLight 
        position={[0, 7, -8]} 
        target={spotLightTarget.current} 
        intensity={60} 
        angle={0.6} 
        penumbra={0.8} 
        color="#4fd1c5" 
        distance={20} 
        castShadow 
      />
      {/* Floor reflection pool physically hitting the concrete */}
      <pointLight position={[0, 0.5, -8]} intensity={5} color="#4fd1c5" distance={5} decay={2} />

      <Suspense fallback={null}>
        <HubShell />
        {onEnterRoom && <LeftWingCorridor onEnterRoom={onEnterRoom} />}
        
        {/* Fake Volumetric Cone intersecting ceiling to floor */}
        <FakeLightCone position={[0, 3.5, -8]} height={7} radius={1.8} color="#4fd1c5" opacity={0.25} />

        {/* Spatial Grammar: EXACTLY ONE Focal Screen */}
        <group position={[0, 2, -9.1]}>
          
          {/* Main screen spill light onto the front surfaces */}
          <pointLight position={[0, 0, 1.0]} intensity={6} color="#4fd1c5" distance={10} decay={2} />
          
          {/* Backlight spill casting directly onto the newly added wood slats */}
          <pointLight position={[0, 0, -0.4]} intensity={8} color="#4fd1c5" distance={5} decay={2} castShadow />
          
          <Html transform occlude wrapperClass="hub-ui-screen" distanceFactor={4}>
            <div className="w-[850px] h-[550px] bg-neutral-900/90 border border-teal-500/30 rounded shadow-[0_0_40px_rgba(79,209,197,0.25)] flex flex-col select-none relative overflow-hidden backdrop-blur-xl">
              {/* Emissive top bar */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-80" />
              
              {/* Header */}
              <div className="flex justify-between items-end border-b border-teal-900/50 p-8 pb-6">
                <div>
                  <h1 className="text-4xl font-black tracking-tighter text-teal-400 drop-shadow-[0_0_10px_rgba(79,209,197,0.8)]">B3P LOBBY</h1>
                  <p className="text-teal-600/70 text-sm tracking-widest font-mono mt-1">MAIN TERMINAL \\ STATUS: ONLINE</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">42</div>
                  <div className="text-xs text-teal-500 font-mono tracking-widest mt-1">CREATORS ACTIVE</div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 p-8 pt-6 grid grid-cols-2 gap-8">
                {/* Left: Weekly Top */}
                <div>
                  <h2 className="text-xs text-neutral-400 font-mono tracking-widest mb-4">WEEKLY TOP DROPS</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 bg-teal-950/30 p-3 rounded border-l-2 border-teal-400 cursor-pointer hover:bg-teal-900/50 transition">
                      <div className="w-10 h-10 bg-teal-900 rounded flex items-center justify-center font-bold text-teal-200">1</div>
                      <div>
                        <p className="text-white font-bold tracking-wide">Synthetic Rain</p>
                        <p className="text-xs text-teal-500 font-mono">@AI_MUSE • 1.2k Plays</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded border-l-2 border-transparent cursor-pointer hover:bg-white/10 transition">
                      <div className="w-10 h-10 bg-neutral-800 rounded flex items-center justify-center font-bold text-neutral-400">2</div>
                      <div>
                        <p className="text-white font-bold tracking-wide">Neon Drift</p>
                        <p className="text-xs text-neutral-500 font-mono">@CYBER_BOY • 980 Plays</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col h-full space-y-4">
                  <h2 className="text-xs text-neutral-400 font-mono tracking-widest mb-0">QUICK ACTIONS</h2>
                  
                  <button 
                    className="w-full flex-1 bg-teal-500/10 border border-teal-500/50 hover:bg-teal-400 hover:text-neutral-950 text-teal-400 font-bold tracking-widest transition-all duration-300 flex items-center justify-center"
                    onClick={() => alert("DOM Interaction via crosshair unlock successful!")}
                  >
                    ENTER EVENT HALL
                  </button>
                  <button className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold tracking-widest transition-all duration-300">
                    BROWSE GUILD ROOMS
                  </button>
                </div>
              </div>
            </div>
          </Html>
        </group>
      </Suspense>
    </group>
  );
}
