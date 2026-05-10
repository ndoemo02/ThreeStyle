"use client";

import { useState, useMemo, useEffect, useRef, Suspense, type RefObject } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { KTX2Loader } from 'three-stdlib';
import { Environment } from '@react-three/drei';
import { EffectComposer, SelectiveBloom } from '@react-three/postprocessing';
import { useControls } from 'leva';
import AudioVisualizer from '../../3d/modules/fx/AudioVisualizer';
import AudioReactiveFace from '../../3d/modules/fx/AudioReactiveFace';
import { GroundedHub } from '../../3d/world/hub/GroundedHub';
import { CreatorRoomMVP } from '../../3d/world/rooms/CreatorRoomMVP';
import { BaseNavigationControls } from '../../3d/systems/BaseNavigationControls';
import { HudOverlay } from '../../components/HudOverlay';
import { NativeMobileJoystick } from '../../components/ui/NativeMobileJoystick';
import { PerformanceCounter } from '../../components/PerformanceCounter';
import { useTransitionStore } from '../../store/useTransitionStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { ElevatorA } from '../../3d/world/elevators/ElevatorA';

// Singleton KTX2Loader — initialized once per renderer
let _ktx2Loader: KTX2Loader | null = null;
function getKTX2Loader(gl: THREE.WebGLRenderer): KTX2Loader {
  if (!_ktx2Loader) {
    _ktx2Loader = new KTX2Loader();
    _ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/basis/');
    _ktx2Loader.detectSupport(gl);
  }
  return _ktx2Loader;
}

// Preload KTX2-textured models once renderer is available
function KTX2Preload() {
  const gl = useThree(s => s.gl);
  useEffect(() => {
    const ktx2 = getKTX2Loader(gl);
    useGLTF.preload('/models/optimized/facecap.glb', true, false, (loader) => {
      loader.setKTX2Loader(ktx2);
    });
  }, [gl]);
  return null;
}

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
    // Only disable Environment on actual mobile devices (coarse pointer)
    // NOT just narrow screens — desktop users with narrow windows need it too
    const check = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) return null;
  return <Environment preset="apartment" environmentIntensity={0.3} />;
}

function BloomLight({ onReady }: { onReady: (light: THREE.PointLight) => void }) {
  const ref = useRef<THREE.PointLight>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.layers.enable(1);
      onReady(ref.current);
    }
  }, [onReady]);
  return <pointLight ref={ref} position={[0, 4.9, 0]} intensity={0.01} color="#000000" />;
}

// Studio Face — wewnątrz kabiny VocalBooth, przy mikrofonie
// VocalBooth group: position=[-7.06, 0, -2.5], rotation=[0, PI/2, 0]
// Rotacja 90° Y: localX→worldZ, localZ→worldX (odwrotnie)
// Mic localPos = (2.61, 0.25, -2.7)
// → worldX = -7.06 - (-2.7)  = -4.36
// → worldZ = -2.5 + 2.61     = +0.11
// Twarz stoi za mikrofonem (głębiej w kabinie), patrzy w stronę szyby (+X)
function StudioFacePositioner() {
  const face = useControls('Studio Face (Booth)', {
    facePosX: { value: -5.75, min: -15, max: 15, step: 0.05 },
    facePosY: { value: 2.0,   min: -5,  max: 10, step: 0.05 },
    facePosZ: { value: 1.15,  min: -10, max: 10, step: 0.05 },
    faceRotY: { value: 142,   min: -180, max: 180, step: 1 },
    faceScale: { value: 1.05, min: 0.1, max: 5,  step: 0.05 },
  });

  return (
    <group
      position={[face.facePosX, face.facePosY, face.facePosZ]}
      rotation={[0, THREE.MathUtils.degToRad(face.faceRotY), 0]}
      scale={face.faceScale}
    >
      <AudioReactiveFace />
    </group>
  );
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

  // Force camera to zone preset only on zone change (not on elevator release)
  // Deps only [activeZone] — unikamy skoku kamery po releaseElevator()
  useEffect(() => {
    if (!shouldForcePosition) return;
    camera.position.set(...preset.position);
    camera.lookAt(...preset.target);
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeZone]);

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
  const releaseElevator = useTransitionStore(s => s.releaseElevator);
  const [bloomLight, setBloomLight] = useState<THREE.PointLight | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Reset do lobby przy każdym montowaniu — Zustand trzyma stan między hot-reloadami
  useEffect(() => {
    setActiveZone('room1');
    releaseElevator(); // wymuś idle żeby ZoneController mógł ustawić kamerę
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          shadows={!isMobile}
          frameloop="always"
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          }}
          camera={{ position: [0, 2.05, 5], fov: 60 }}
          style={{ width: '100%', height: '100%', display: 'block' }}
>
 <KTX2Preload />
 <ZoneController activeZone={activeZone} />
        
        {/* Ambient — bazowe oświetlenie (zwiększone na mobile bez Environment) */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={0.6} />

        {/* Mgła wyłączona */}
        <color attach="background" args={['#1a1a1a']} />

        {/* Ciepłe, subtelne refleksy środowiskowe — zredukowane na mobile */}
        <AdaptiveEnvironment />

        {/* ── Selective Bloom + Audio-Reactive Fat Lines ── */}
        <BloomLight onReady={setBloomLight} />
        {/* EffectComposer only when audio active — saves full-screen GPU pass */}
        {bloomLight && useAudioStore.getState().isActive && (
          <EffectComposer multisampling={0}>
            <SelectiveBloom
              lights={[bloomLight]}
              selectionLayer={1}
              intensity={1.8}
              luminanceThreshold={0.25}
              luminanceSmoothing={0.35}
              mipmapBlur
            />
          </EffectComposer>
        )}
        <AudioVisualizer />

        <PerformanceCounter />

        {/* ── Audio-Reactive Face — tylko w studiu, przy mikrofonie ── */}
        {activeZone !== 'hub' && (
          <Suspense fallback={null}>
            <StudioFacePositioner />
          </Suspense>
        )}

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
