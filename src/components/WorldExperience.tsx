"use client";

import { useState, useMemo, useEffect, useLayoutEffect, useCallback } from 'react';
import * as THREE from 'three';
import dynamic from 'next/dynamic';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing';
import { CreatorRoomMVP } from '@/3d/world/rooms/CreatorRoomMVP';
import { BaseNavigationControls } from '@/3d/systems/BaseNavigationControls';
import { HudOverlay } from '@/components/HudOverlay';
import { useHudStore } from '@/stores/useHudStore';
import { NativeMobileJoystick } from '@/components/ui/NativeMobileJoystick';
import { PerformanceCounter } from '@/components/PerformanceCounter';
import { useTransitionStore } from '@/store/useTransitionStore';
import { ElevatorA } from '@/3d/world/elevators/ElevatorA';
import { getCameraPreset, HUB_ZONE, ROOM_ZONE, EVENT_ROOM_ZONE } from '@/3d/navigation/navigationConfig';
import { shouldUseMobileRoomProfileInBrowser } from '@/lib/deviceProfile';
import { CreatorMobileQuality } from '@/3d/world/rooms/CreatorMobileQuality';
import { CreatorComposerResolution } from '@/3d/world/rooms/CreatorComposerResolution';
import { ElevatorOverlay } from '@/components/ElevatorOverlay';
import { DestinationBoundary } from '@/3d/systems/DestinationBoundary';
import { SceneDiagnostics } from '@/3d/systems/SceneDiagnostics';
import { EntryCamera } from '@/3d/systems/EntryCamera';
import { useEntryStore } from '@/stores/useEntryStore';

const loadGroundedHub = () => import('@/3d/world/hub/GroundedHub');
const GroundedHub = dynamic(
  () => loadGroundedHub().then(module => module.GroundedHub),
  { ssr: false, loading: () => null },
);
const loadEventRoom = () => import('@/3d/world/event-room');
const EventRoomScene = dynamic(
  () => loadEventRoom().then(module => module.EventRoomScene),
  { ssr: false, loading: () => null },
);
const AudioVisualizer = dynamic(
  () => import('@/3d/modules/fx/AudioVisualizer'),
  { ssr: false, loading: () => null },
);

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

export default function WorldExperience({ initialZone = ROOM_ZONE, entry = false, onReady, onFailure }: { initialZone?: string; entry?: boolean; onReady?: () => void; onFailure?: () => void }) {
  const entryPhase = useEntryStore(s => s.phase);
  const interactive = !entry || entryPhase === 'complete';
  const activeZone = useTransitionStore(s => s.activeZone);
  const setActiveZone = useTransitionStore(s => s.setActiveZone);
  const releaseElevator = useTransitionStore(s => s.releaseElevator);
  const elevatorState = useTransitionStore(s => s.elevatorState);
  const [roomShellReady, setRoomShellReady] = useState(false);
  const [hubReady, setHubReady] = useState(false);
  const [failedZone, setFailedZone] = useState<string | null>(null);
  const onRoomReady = useCallback(() => setRoomShellReady(true), []);
  const onHubReady = useCallback(() => { setHubReady(true); onReady?.(); }, [onReady]);
  useEffect(() => { if (failedZone) onFailure?.(); }, [failedZone, onFailure]);
  const onRideStart = useCallback(() => setFailedZone(null), []);
  const [isMobile, setIsMobile] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const canvasDpr = useMemo<[number, number]>(() => isMobile ? [0.75, 1] : [1, 1], [isMobile]);
  const glConfig = useMemo(
    () => ({ antialias: false, powerPreference: 'high-performance' as const, alpha: false, stencil: false }),
    [],
  );
  const isEventRoomZone = activeZone === EVENT_ROOM_ZONE;
  const isCreatorRoomZone = activeZone !== HUB_ZONE && activeZone !== EVENT_ROOM_ZONE;
  const usesCreatorRoomPipeline = isCreatorRoomZone;
  useEffect(() => {
    const check = () => { setIsMobile(shouldUseMobileRoomProfileInBrowser()); setProfileReady(true); };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Reset strefy przed pierwszym paintem, żeby nie mignąć hubem ani windą w złym miejscu.
  useLayoutEffect(() => {
    const devInitialZone = process.env.NODE_ENV !== 'production'
      ? new URLSearchParams(window.location.search).get('zone')
      : null;
    const startZone = devInitialZone === EVENT_ROOM_ZONE || devInitialZone === HUB_ZONE
      ? devInitialZone
      : initialZone;
    setRoomShellReady(false);
    setActiveZone(startZone);
    releaseElevator();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeZone !== ROOM_ZONE) {
      setRoomShellReady(false);
    }
    if (activeZone !== HUB_ZONE) setHubReady(false);
  }, [activeZone]);

  useEffect(() => {
    if (activeZone !== ROOM_ZONE || elevatorState === 'idle') return;
    void loadGroundedHub();
    const variant = isMobile ? 'mobile' : 'desktop';
    for (const map of ['albedo.webp', 'normal.webp', 'orm.webp', 'signage.webp', 'welcome.webp']) {
      const image = new Image();
      image.decoding = 'async';
      image.src = `/textures/runtime/lobby/${variant}/${map}`;
    }
    const paint = new Image();
    paint.decoding = 'async';
    paint.src = '/textures/runtime/lobby/shared/character.webp';
  }, [activeZone, elevatorState, isMobile]);

  return (
    <div className="b3p-fullscreen" data-entry-interactive={interactive}>
      {/* UI Overlay Help */}
      <div className="absolute top-4 left-4 z-10 p-4 font-mono text-xs text-white/50 pointer-events-none drop-shadow-md">
        <div>B3P (Blok Trzech Pięter)</div>
        <div className="text-white">ZONE: {activeZone.toUpperCase()}</div>
        <div className="mt-2 text-teal-400">
          ● Click canvas to lock cursor.<br/>
          ● WASD to move.<br/>
          {isCreatorRoomZone ? '● E: interact nearby or show cursor. Click tablet to open HUD.' : '● Press [E] on screens to interact.'}<br/>
          ● Look at Doors + [E] to Enter.<br/>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', right: 'max(12px, env(safe-area-inset-right))', zIndex: 50, display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            const isOpen = useHudStore.getState().isOpen;
            if (isOpen) {
              useHudStore.getState().closeHud();
            } else {
              useHudStore.getState().openHud('master_catalog');
            }
          }}
          className="bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 hover:text-white text-[10px] font-mono border border-orange-500/30 px-3 py-1.5 rounded transition-all tracking-widest cursor-pointer shadow-lg shadow-orange-950/40"
          style={{ minHeight: 44, padding: '8px 14px', border: '1px solid #f3a05d66', borderRadius: 12, color: '#f3a05d', background: '#151310e6', cursor: 'pointer', fontSize: 12 }}
        >
          Media deck
        </button>

        <button
          onClick={() => {
            if (document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen().catch(err => {
                console.error("Fullscreen err:", err);
              });
            }
          }}
          className="bg-black/60 text-white/50 text-[10px] font-mono border border-white/10 px-3 py-1.5 rounded hover:bg-white/10 hover:text-white transition-all tracking-widest cursor-pointer"
          style={{ minHeight: 44, padding: '8px 12px', border: '1px solid #ffffff30', borderRadius: 12, color: '#ededed', background: '#151310e6', cursor: 'pointer', fontSize: 12 }}
        >
          [⛶ FULLSCREEN]
        </button>
      </div>



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
          shadows={false}
          frameloop="always"
          dpr={canvasDpr}
          gl={glConfig}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = false;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.55;
          }}
          camera={{ position: [0, 2.05, 5], fov: 60 }}
          style={{ width: '100%', height: '100%', display: 'block' }}
>
 <ZoneController activeZone={activeZone} />{entry && <EntryCamera />}

        {usesCreatorRoomPipeline && isMobile && profileReady ? <CreatorMobileQuality ready={roomShellReady} /> : null}

        {/* Mgła wyłączona */}
        <color attach="background" args={['#1a1a1a']} />

        {/* ── Postprocessing (optimized: single-pass Bloom + SMAA) ── */}
        {!isEventRoomZone && !isMobile && usesCreatorRoomPipeline && (
          <EffectComposer multisampling={0}>
            <SMAA />
            <Bloom
              intensity={0.9}
              luminanceThreshold={0.85}
              luminanceSmoothing={0.2}
              mipmapBlur
            />
          </EffectComposer>
        )}
        {!isEventRoomZone && (isMobile || !usesCreatorRoomPipeline) && (
          <EffectComposer multisampling={0}>
            <SMAA />
            <CreatorComposerResolution enabled={(usesCreatorRoomPipeline && isMobile) || activeZone === HUB_ZONE} />
          </EffectComposer>
        )}
        {!isMobile && usesCreatorRoomPipeline ? <AudioVisualizer /> : null}

        {!isMobile && usesCreatorRoomPipeline ? <PerformanceCounter /> : null}

        {activeZone === HUB_ZONE && <DestinationBoundary key={activeZone} onFailure={() => setFailedZone(activeZone)}>
          <GroundedHub onEnterRoom={(id) => setActiveZone(id)} onReady={onHubReady} />
        </DestinationBoundary>}
        {isEventRoomZone && <EventRoomScene onExit={(zone) => setActiveZone(zone)} />}
        {isCreatorRoomZone && profileReady && (
          <DestinationBoundary key={activeZone} onFailure={() => setFailedZone(activeZone)}><CreatorRoomMVP
            mobile={isMobile}
            onExit={() => setActiveZone(HUB_ZONE)}
            onShellReady={onRoomReady}
          /></DestinationBoundary>
        )}
        {/* Cabin stays mounted while the destination architecture loads behind closed doors. */}
        <ElevatorA visible={activeZone === HUB_ZONE || activeZone === ROOM_ZONE}
          destinationReady={activeZone === HUB_ZONE ? hubReady : roomShellReady}
          destinationFailed={failedZone === activeZone} onRideStart={onRideStart} />
        {process.env.NODE_ENV !== 'production' && <SceneDiagnostics ready={activeZone === HUB_ZONE ? hubReady : roomShellReady} />}

        {interactive && <BaseNavigationControls />}
      </Canvas>
      </div>
      {interactive && <><HudOverlay /><ElevatorOverlay /><NativeMobileJoystick /></>}
    </div>
  );
}
