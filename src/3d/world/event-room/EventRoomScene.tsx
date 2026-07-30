"use client";

import { useEffect, useMemo, useReducer } from 'react';
import { Html } from '@react-three/drei';
import { EffectComposer, SMAA } from '@react-three/postprocessing';
import { BloomEffect } from 'postprocessing';
import { RoomDoor } from '../../modules/doors/RoomDoor';
import { shouldUseMobileRoomProfileInBrowser } from '../../../lib/deviceProfile';
import { HUB_ZONE } from '../../navigation/navigationConfig';
import { eventRoomShowReducer } from './EventRoomShowController';
import { useEventRoomMaterials } from './EventRoomMaterials';
import {
  EventRoomLightRig,
  EventRoomScreenSurfaceProvider,
  createEventRoomScreenSurfaceBinding,
  type EventRoomShowTiming,
} from './EventRoomLightRig';
import {
  EVENT_ROOM_LIGHT_BASES,
  EVENT_ROOM_LIGHT_STATES,
  eventRoomBloomThreshold,
  type EventRoomLightBaseProfile,
} from './eventRoomLightStates';
import { EventRoomScreens } from './EventRoomScreens';
import { EventRoomShell } from './EventRoomShell';
import { EVENT_ROOM_THEMES, INITIAL_EVENT_ROOM_SHOW_STATE, type EventRoomQualityTier } from './EventRoomTypes';

const AUTO_ADVANCE_MS = 7000;

export function EventRoomScene({ onExit }: { onExit: (zone: string) => void }) {
  const [show, dispatch] = useReducer(eventRoomShowReducer, INITIAL_EVENT_ROOM_SHOW_STATE);
  const theme = EVENT_ROOM_THEMES[show.theme];

  // `baseProfile` ustalany raz przy mount strefy — jedyne źródło wariantu tekstur
  // i liczby świateł. Resize nie zmienia go w trakcie sesji (§8).
  const baseProfile = useMemo<EventRoomLightBaseProfile>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return shouldUseMobileRoomProfileInBrowser() ? 'mobile' : 'desktop';
  }, []);
  // Governor produkujący `'degraded'` powstaje w Etapie 9; dziś tier == baseProfile.
  const qualityTier: EventRoomQualityTier = baseProfile;
  const materials = useEventRoomMaterials(theme, { baseProfile, qualityTier });

  const screenSurfaceBinding = useMemo(() => createEventRoomScreenSurfaceBinding(), []);
  const showTiming = useMemo<EventRoomShowTiming>(() => ({ nextAutoAdvanceAt: null }), []);

  // Bloom tworzony raz i sterowany przez uchwyt w `useFrame` — nigdy przez propsy,
  // żeby zmiana fazy show nie rekonstruowała efektu (R10).
  const bloomEffect = useMemo(() => new BloomEffect({
    intensity: EVENT_ROOM_LIGHT_STATES.house.bloom,
    luminanceThreshold: eventRoomBloomThreshold(
      EVENT_ROOM_LIGHT_STATES.house.bloom,
      EVENT_ROOM_LIGHT_BASES.bloomThreshold[baseProfile],
    ),
    luminanceSmoothing: EVENT_ROOM_LIGHT_BASES.bloomSmoothing,
    mipmapBlur: baseProfile === 'desktop',
  }), [baseProfile]);

  useEffect(() => () => bloomEffect.dispose(), [bloomEffect]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Digit1') dispatch({ type: 'SET_THEME', theme: 'rose', hostOverride: true });
      if (event.code === 'Digit2') dispatch({ type: 'SET_THEME', theme: 'galaxy', hostOverride: true });
      if (event.code === 'KeyP') dispatch({ type: show.isPaused ? 'RESUME' : 'PAUSE' });
      if (event.code === 'KeyN') dispatch({ type: 'NEXT' });
      if (event.code === 'KeyB') dispatch({ type: 'PREVIOUS' });
      if (event.code === 'KeyF') dispatch({ type: 'FINALE' });
      if (event.code === 'KeyR') dispatch({ type: 'RESET' });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [show.isPaused]);

  // Znacznik następnego auto-advance jest jedynym wejściem kolejki beatu
  // `blackout` w driverze świateł — reducer show pozostaje nietknięty.
  /* eslint-disable react-hooks/immutability --
     `showTiming` to celowo mutowalne pudełko współdzielone z driverem świateł:
     znacznik następnego auto-advance nie może wywoływać re-renderu, bo jest
     czytany co klatkę w `useFrame` rigu. */
  useEffect(() => {
    if (show.isPaused) {
      showTiming.nextAutoAdvanceAt = null;
      return;
    }
    showTiming.nextAutoAdvanceAt = performance.now() + AUTO_ADVANCE_MS;
    const timer = window.setInterval(() => {
      showTiming.nextAutoAdvanceAt = performance.now() + AUTO_ADVANCE_MS;
      dispatch({ type: 'AUTO_ADVANCE' });
    }, AUTO_ADVANCE_MS);
    return () => {
      window.clearInterval(timer);
      showTiming.nextAutoAdvanceAt = null;
    };
  }, [show.isPaused, showTiming]);
  /* eslint-enable react-hooks/immutability */

  return (
    <EventRoomScreenSurfaceProvider value={screenSurfaceBinding}>
      <group>
        {/* Jedyny composer tej strefy — Bloom + SMAA, desktop i mobile (D1). */}
        <EffectComposer multisampling={0}>
          <primitive object={bloomEffect} />
          <SMAA />
        </EffectComposer>

        <EventRoomLightRig
          theme={theme}
          materials={materials}
          baseProfile={baseProfile}
          phase={show.phase}
          isPaused={show.isPaused}
          showTiming={showTiming}
          bloom={bloomEffect}
        />
        <EventRoomShell materials={materials} qualityTier={qualityTier} />
        <EventRoomScreens materials={materials} show={show} theme={theme} qualityTier={qualityTier} />

        {/* Jedyny odbiorca kanału `exitSafety` — oznaczenie wyjścia, zero prawdziwego światła. */}
        <group name="exitSafetyStrip">
          <mesh position={[0, 0.055, 12.06]}>
            <boxGeometry args={[3.9, 0.07, 0.05]} />
            <primitive object={materials.exitLed} attach="material" />
          </mesh>
          <mesh position={[0, 4.12, 12.06]}>
            <boxGeometry args={[3.9, 0.06, 0.05]} />
            <primitive object={materials.exitLed} attach="material" />
          </mesh>
        </group>

        <RoomDoor
          position={[0, 0, 12.45]}
          rotation={[0, Math.PI, 0]}
          label="BACK TO LOBBY"
          status="active"
          userCount={0}
          onEnter={() => onExit(HUB_ZONE)}
          renderGeometry={false}
        />

        <Html transform position={[0, 2.08, 12.22]} distanceFactor={4.6} pointerEvents="none">
          <div style={{
            border: `1px solid ${theme.ledSoft}88`,
            background: 'rgba(10,8,7,.76)',
            color: '#f3e7dc',
            padding: '10px 16px',
            fontFamily: 'monospace',
            fontSize: '10px',
            letterSpacing: '.18em',
          }}>
            EXIT / LOBBY
          </div>
        </Html>
      </group>
    </EventRoomScreenSurfaceProvider>
  );
}
