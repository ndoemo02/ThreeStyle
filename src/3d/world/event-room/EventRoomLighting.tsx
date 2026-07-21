"use client";

import type {
  EventRoomQualityTier,
  EventRoomShowPhase,
  EventRoomThemeTokens,
} from './EventRoomTypes';

const PHASE_LIGHTING: Record<EventRoomShowPhase, {
  ambient: number;
  screen: number;
  runway: number;
  audience: number;
}> = {
  idle: { ambient: 0.9, screen: 0.82, runway: 0.72, audience: 0.78 },
  intro: { ambient: 0.76, screen: 1.08, runway: 0.88, audience: 0.68 },
  countdown: { ambient: 0.68, screen: 1.2, runway: 1.0, audience: 0.62 },
  trackReveal: { ambient: 0.84, screen: 1.32, runway: 1.16, audience: 0.76 },
  finale: { ambient: 1.0, screen: 1.48, runway: 1.34, audience: 1.02 },
  afterloop: { ambient: 0.82, screen: 0.94, runway: 0.82, audience: 0.72 },
};

export function EventRoomLighting({
  theme,
  qualityTier,
  phase,
}: {
  theme: EventRoomThemeTokens;
  qualityTier: EventRoomQualityTier;
  phase: EventRoomShowPhase;
}) {
  const isMobileLike = qualityTier !== 'desktop';
  const phaseLighting = PHASE_LIGHTING[phase];

  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.background, 22, 52]} />
      <hemisphereLight
        args={['#ffe3c4', theme.haze, (isMobileLike ? 1.18 : 1.02) * phaseLighting.ambient]}
      />
      <ambientLight
        color={theme.ledSoft}
        intensity={(isMobileLike ? 0.38 : 0.34) * phaseLighting.ambient}
      />
      <rectAreaLight
        color={phase === 'finale' ? theme.screenPrimary : theme.ledSoft}
        intensity={(isMobileLike ? 3.2 : 4.5) * phaseLighting.screen}
        width={14}
        height={4.4}
        position={[0, 5.0, -8.9]}
        rotation={[-Math.PI / 2.6, 0, 0]}
      />
      <rectAreaLight
        color={theme.led}
        intensity={(isMobileLike ? 1.35 : 1.85) * phaseLighting.runway}
        width={9.8}
        height={1.55}
        position={[0, 1.2, -2.25]}
        rotation={[-Math.PI / 2.25, 0, 0]}
      />
      {!isMobileLike ? (
        <rectAreaLight
          color={theme.led}
          intensity={1.45 * phaseLighting.audience}
          width={13.5}
          height={3.2}
          position={[0, 3.6, 7.8]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ) : null}
    </>
  );
}
