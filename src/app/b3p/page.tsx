"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import dynamic from 'next/dynamic';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, SelectiveBloom, SMAA } from '@react-three/postprocessing';
import { Leva } from 'leva';
import AudioVisualizer from '../../3d/modules/fx/AudioVisualizer';
import { CreatorRoomMVP } from '../../3d/world/rooms/CreatorRoomMVP';
import { BaseNavigationControls } from '../../3d/systems/BaseNavigationControls';
import { HudOverlay } from '../../components/HudOverlay';
import { NativeMobileJoystick } from '../../components/ui/NativeMobileJoystick';
import { PerformanceCounter } from '../../components/PerformanceCounter';
import { useTransitionStore } from '../../store/useTransitionStore';
import { ElevatorA } from '../../3d/world/elevators/ElevatorA';
import { getCameraPreset, HUB_ZONE, ROOM_ZONE } from '../../3d/navigation/navigationConfig';
import { shouldUseMobileRoomProfileInBrowser } from '../../lib/deviceProfile';

const loadGroundedHub = () => import('../../3d/world/hub/GroundedHub');
const GroundedHub = dynamic(
  () => loadGroundedHub().then(module => module.GroundedHub),
  { ssr: false, loading: () => null },
);

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
function ZoneController({ activeZone }: { activeZone: string }) {
  const { size, camera } = useThree();
  const elevatorState = useTransitionStore(s => s.elevatorState);
  const activeElevator = useTransitionStore(s => s.activeElevator);

  const preset = useMemo(
    () => getCameraPreset(activeZone, size.width, size.height),
    [activeZone, size.width, size.height],
  );

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
  const elevatorState = useTransitionStore(s => s.elevatorState);
  const [bloomLight, setBloomLight] = useState<THREE.PointLight | null>(null);
  const [roomShellReady, setRoomShellReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const canvasDpr = useMemo<[number, number]>(() => isMobile ? [0.75, 1] : [1.25, 1.5], [isMobile]);
  const glConfig = useMemo(
    () => ({ antialias: !isMobile, powerPreference: 'high-performance' as const, alpha: false, stencil: false }),
    [isMobile],
  );
  const isRoomZone = activeZone !== HUB_ZONE;
  useEffect(() => {
    const check = () => setIsMobile(shouldUseMobileRoomProfileInBrowser());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Reset strefy przed pierwszym paintem, żeby nie mignąć hubem ani windą w złym miejscu.
  useLayoutEffect(() => {
    setRoomShellReady(false);
    setActiveZone(ROOM_ZONE);
    releaseElevator();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeZone !== ROOM_ZONE) {
      setRoomShellReady(false);
    }
  }, [activeZone]);

  useEffect(() => {
    if (activeZone !== ROOM_ZONE || elevatorState === 'idle') return;
    void loadGroundedHub();
    const variant = isMobile ? 'mobile' : 'desktop';
    for (const map of ['albedo.webp', 'normal.webp', 'orm.webp']) {
      const image = new Image();
      image.decoding = 'async';
      image.src = `/textures/runtime/lobby/${variant}/${map}`;
    }
  }, [activeZone, elevatorState, isMobile]);

  return (
    <div className="b3p-fullscreen">
      <Leva hidden />

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
          shadows={!isMobile && isRoomZone}
          frameloop="always"
          dpr={canvasDpr}
          gl={glConfig}
          onCreated={({ gl }) => {
            gl.shadowMap.type = THREE.PCFShadowMap;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.55;
          }}
          camera={{ position: [0, 2.05, 5], fov: 60 }}
          style={{ width: '100%', height: '100%', display: 'block' }}
>
 <ZoneController activeZone={activeZone} />
        
        {/* Ambient — bazowe oświetlenie (zwiększone na mobile bez Environment) */}
        {isRoomZone ? (
          <>
            <ambientLight intensity={0.65} color="#ffe8d2" />
            <directionalLight position={[5, 10, 5]} intensity={0.5} color="#fff1df" />
          </>
        ) : null}

        {/* Mgła wyłączona */}
        <color attach="background" args={['#1a1a1a']} />

        {/* ── Postprocessing ── */}
        {isRoomZone ? <BloomLight onReady={setBloomLight} /> : null}
        {isMobile && (
          <EffectComposer multisampling={0}>
            <SMAA />
          </EffectComposer>
        )}
        {bloomLight && !isMobile && isRoomZone && (
          <EffectComposer multisampling={0}>
            <SMAA />
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
        {isRoomZone ? <AudioVisualizer /> : null}

        {!isMobile && isRoomZone ? <PerformanceCounter /> : null}

        {/* ── Audio-Reactive Face — tylko w studiu, przy mikrofonie ── */}
        {/* DISABLED: too heavy on mobile */}
        {/* {activeZone !== 'hub' && (
          <Suspense fallback={null}>
            <StudioFacePositioner />
          </Suspense>
        )} */}

        {activeZone === HUB_ZONE && <GroundedHub onEnterRoom={(id) => setActiveZone(id)} />}
        {activeZone !== HUB_ZONE && (
          <CreatorRoomMVP
            onExit={() => setActiveZone(HUB_ZONE)}
            onShellReady={() => setRoomShellReady(true)}
          />
        )}
        
        {/* Physical elevator: hub always, room only after the room shell is ready. */}
        <ElevatorA visible={activeZone === HUB_ZONE || (activeZone === ROOM_ZONE && roomShellReady)} />

        <BaseNavigationControls />
      </Canvas>
      </div>
      <HudOverlay />
      <NativeMobileJoystick />
    </div>
  );
}
