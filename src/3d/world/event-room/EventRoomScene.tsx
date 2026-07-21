"use client";

import { useEffect, useMemo, useReducer } from 'react';
import { Html } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { RoomDoor } from '../../modules/doors/RoomDoor';
import { shouldUseMobileRoomProfileInBrowser } from '../../../lib/deviceProfile';
import { HUB_ZONE } from '../../navigation/navigationConfig';
import { eventRoomShowReducer } from './EventRoomShowController';
import { useEventRoomMaterials } from './EventRoomMaterials';
import { EventRoomLighting } from './EventRoomLighting';
import { EventRoomScreens } from './EventRoomScreens';
import { EventRoomShell } from './EventRoomShell';
import { EVENT_ROOM_THEMES, INITIAL_EVENT_ROOM_SHOW_STATE, type EventRoomQualityTier } from './EventRoomTypes';

export function EventRoomScene({ onExit }: { onExit: (zone: string) => void }) {
  const [show, dispatch] = useReducer(eventRoomShowReducer, INITIAL_EVENT_ROOM_SHOW_STATE);
  const theme = EVENT_ROOM_THEMES[show.theme];
  const qualityTier = useMemo<EventRoomQualityTier>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return shouldUseMobileRoomProfileInBrowser() ? 'mobile' : 'desktop';
  }, []);
  const materials = useEventRoomMaterials(theme, qualityTier);
  const bloomIntensity = qualityTier === 'desktop'
    ? (show.phase === 'finale' ? 0.52 : show.phase === 'trackReveal' ? 0.44 : 0.36)
    : (show.phase === 'finale' ? 0.3 : 0.22);

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

  useEffect(() => {
    if (show.isPaused) return;
    const timer = window.setInterval(() => {
      dispatch({ type: 'AUTO_ADVANCE' });
    }, 7000);
    return () => window.clearInterval(timer);
  }, [show.isPaused]);

  return (
    <group>
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={qualityTier === 'desktop' ? 0.84 : 0.9}
          luminanceSmoothing={0.18}
          mipmapBlur={qualityTier === 'desktop'}
        />
      </EffectComposer>
      <EventRoomLighting theme={theme} qualityTier={qualityTier} phase={show.phase} />
      <EventRoomShell materials={materials} qualityTier={qualityTier} />
      <EventRoomScreens materials={materials} show={show} theme={theme} qualityTier={qualityTier} />

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
  );
}
