"use client";

import { Html } from '@react-three/drei';
import type { EventRoomMaterials } from './EventRoomMaterials';
import type { EventRoomShowState, EventRoomThemeTokens, TopTenTrack } from './EventRoomTypes';
import { EVENT_ROOM_TOP_TEN } from './EventRoomTypes';

function findTrack(rank: number): TopTenTrack {
  return EVENT_ROOM_TOP_TEN.find(track => track.rank === rank) ?? EVENT_ROOM_TOP_TEN[0];
}

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
    <group
      position={[side * 7.72, 3.15, -9.94]}
      rotation={[0, side * -0.42, 0]}
    >
      <mesh position={[0, 0, 0.085]}>
        <boxGeometry args={[1.02, 1.44, 0.025]} />
        <primitive object={materials.screenDim} attach="material" />
      </mesh>
      {barHeights.map((height, index) => (
        <mesh key={height} position={[-0.32 + index * 0.22, -0.42 + height / 2, 0.12]}>
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
}: {
  materials: EventRoomMaterials;
  show: EventRoomShowState;
  theme: EventRoomThemeTokens;
}) {
  const track = findTrack(show.currentRank);
  const title = show.phase === 'idle' ? 'WEEKLY TOP 10' : `#${track.rank} ${track.title}`;
  const subtitle = show.phase === 'idle' ? theme.label : track.artist;
  const tracks = EVENT_ROOM_TOP_TEN;

  return (
    <group>
      <mesh position={[0, 3.25, -10.34]}>
        <boxGeometry args={[11.35, 4.32, 0.08]} />
        <primitive object={materials.metal} attach="material" />
      </mesh>
      <mesh position={[0, 3.25, -10.28]}>
        <boxGeometry args={[10.55, 3.72, 0.08]} />
        <primitive object={materials.screen} attach="material" />
      </mesh>
      <mesh position={[0, 3.25, -10.22]}>
        <boxGeometry args={[9.55, 2.9, 0.035]} />
        <primitive object={materials.screenDim} attach="material" />
      </mesh>
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

      <Html transform position={[0, 3.28, -10.21]} distanceFactor={6.2} pointerEvents="none">
        <div style={{
          width: '720px',
          height: '282px',
          border: `1px solid ${theme.ledSoft}`,
          background: 'linear-gradient(135deg, rgba(4,4,8,.64), rgba(20,10,18,.38))',
          color: '#fff7ef',
          fontFamily: 'monospace',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          letterSpacing: '.12em',
          padding: '18px 22px',
          boxShadow: `0 0 58px ${theme.led}66 inset, 0 0 34px ${theme.ledSoft}33`,
        }}>
          <div style={{ fontSize: '13px', color: theme.ledSoft, opacity: .95 }}>{show.phase.toUpperCase()}</div>
          <div style={{ fontSize: '42px', fontWeight: 900, textShadow: `0 0 18px ${theme.led}` }}>TOP 10</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '5px',
            width: '100%',
            alignItems: 'end',
          }}>
            {tracks.map((topTrack) => {
              const active = topTrack.rank === track.rank;
              return (
                <div
                  key={topTrack.rank}
                  style={{
                    minHeight: '86px',
                    border: `1px solid ${active ? theme.ledSoft : 'rgba(255,255,255,.18)'}`,
                    background: active ? `${topTrack.accent}2a` : 'rgba(12,8,12,.42)',
                    boxShadow: active ? `0 0 22px ${theme.led}77` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '7px 3px',
                  }}
                >
                  <div style={{ fontSize: '22px', fontWeight: 900 }}>{topTrack.rank}</div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'end',
                    gap: '2px',
                    height: '32px',
                  }}>
                    {[0, 1, 2, 3].map((bar) => (
                      <span
                        key={bar}
                        style={{
                          width: '4px',
                          height: `${12 + ((11 - topTrack.rank + bar) % 5) * 4}px`,
                          background: active ? theme.ledSoft : theme.led,
                          opacity: active ? 1 : .65,
                          boxShadow: `0 0 8px ${active ? theme.ledSoft : theme.led}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: '13px', color: '#f4dfca' }}>{title} · {subtitle}</div>
        </div>
      </Html>
    </group>
  );
}
