"use client";

import { EventRoomCurvedScreen } from './EventRoomCurvedScreen';
import type { EventRoomMaterials } from './EventRoomMaterials';
import type { EventRoomQualityTier, EventRoomShowState, EventRoomThemeTokens } from './EventRoomTypes';

function SideSignalBars({
  align,
  materials,
}: {
  align: 'left' | 'right';
  materials: EventRoomMaterials;
}) {
  const side = align === 'left' ? -1 : 1;
  const barHeights = align === 'left' ? [0.32, 0.58, 0.38, 0.62] : [0.66, 0.48, 0.34, 0.52];

  return (
    <group position={[side * 7.72, 3.15, -9.94]} rotation={[0, side * -0.42, 0]}>
      <mesh position={[0, 0, 0.085]}>
        <boxGeometry args={[1.02, 1.44, 0.025]} />
        <primitive object={materials.screenDim} attach="material" />
      </mesh>
      {barHeights.map((height, index) => (
        <mesh key={`${align}-${height}`} position={[-0.32 + index * 0.22, -0.42 + height / 2, 0.12]}>
          <boxGeometry args={[0.11, height, 0.035]} />
          <primitive object={index % 2 === 0 ? materials.led : materials.warmLed} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.55, 0.12]}>
        <boxGeometry args={[0.72, 0.035, 0.03]} />
        <primitive object={materials.warmLed} attach="material" />
      </mesh>
      <mesh position={[0, -0.62, 0.12]}>
        <boxGeometry args={[0.72, 0.025, 0.03]} />
        <primitive object={materials.led} attach="material" />
      </mesh>
    </group>
  );
}
export function EventRoomScreens({
  materials,
  show,
  theme,
  qualityTier,
}: {
  materials: EventRoomMaterials;
  show: EventRoomShowState;
  theme: EventRoomThemeTokens;
  qualityTier: EventRoomQualityTier;
}) {
  return (
    <group>
      <EventRoomCurvedScreen
        show={show}
        theme={theme}
        qualityTier={qualityTier}
        frameMaterial={materials.metal}
      />

      <mesh position={[-7.72, 3.15, -10.08]} rotation={[0, 0.42, 0]}>
        <boxGeometry args={[1.58, 2.95, 0.08]} />
        <primitive object={materials.sideScreen} attach="material" />
      </mesh>
      <mesh position={[7.72, 3.15, -10.08]} rotation={[0, -0.42, 0]}>
        <boxGeometry args={[1.58, 2.95, 0.08]} />
        <primitive object={materials.sideScreen} attach="material" />
      </mesh>
      <SideSignalBars align="left" materials={materials} />
      <SideSignalBars align="right" materials={materials} />
    </group>
  );
}
