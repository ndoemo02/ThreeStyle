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
      <fog attach="fog" args={[theme.background, 8, 20]} />
      <hemisphereLight args={['#ffe3c4', theme.haze, isMobileLike ? 1.18 : 0.98]} />
      <ambientLight color={theme.ledSoft} intensity={isMobileLike ? 0.34 : 0.26} />
      <rectAreaLight
        color={theme.ledSoft}
        intensity={isMobileLike ? 3.4 : 4.8}
        width={9}
        height={3}
        position={[0, 3.7, -4.55]}
        rotation={[-Math.PI / 2.6, 0, 0]}
      />
      <rectAreaLight
        color={theme.led}
        intensity={isMobileLike ? 1.7 : 2.4}
        width={5.8}
        height={1.2}
        position={[0, 1.1, -0.35]}
        rotation={[-Math.PI / 2.25, 0, 0]}
      />
      {!isMobileLike ? (
        <rectAreaLight
          color={theme.led}
          intensity={2.2}
          width={7.8}
          height={2.6}
          position={[0, 2.9, 3.9]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ) : null}
    </>
  );
}
