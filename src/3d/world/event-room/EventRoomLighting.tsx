"use client";

import type { EventRoomQualityTier, EventRoomThemeTokens } from './EventRoomTypes';

export function EventRoomLighting({
  theme,
  qualityTier,
}: {
  theme: EventRoomThemeTokens;
  qualityTier: EventRoomQualityTier;
}) {
  const isMobileLike = qualityTier !== 'desktop';

  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.background, 18, 44]} />
      <hemisphereLight args={['#ffe3c4', theme.haze, isMobileLike ? 0.92 : 0.78]} />
      <ambientLight color={theme.ledSoft} intensity={isMobileLike ? 0.26 : 0.2} />
      <rectAreaLight
        color={theme.ledSoft}
        intensity={isMobileLike ? 2.6 : 3.6}
        width={14}
        height={4.4}
        position={[0, 5.0, -8.9]}
        rotation={[-Math.PI / 2.6, 0, 0]}
      />
      <rectAreaLight
        color={theme.led}
        intensity={isMobileLike ? 1.05 : 1.45}
        width={9.8}
        height={1.55}
        position={[0, 1.2, -2.25]}
        rotation={[-Math.PI / 2.25, 0, 0]}
      />
      {!isMobileLike ? (
        <rectAreaLight
          color={theme.led}
          intensity={1.05}
          width={13.5}
          height={3.2}
          position={[0, 3.6, 7.8]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ) : null}
    </>
  );
}
