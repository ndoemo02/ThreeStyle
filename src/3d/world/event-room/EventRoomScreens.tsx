"use client";

import { Html } from '@react-three/drei';
import type { EventRoomMaterials } from './EventRoomMaterials';
import type { EventRoomShowState, EventRoomThemeTokens, TopTenTrack } from './EventRoomTypes';
import { EVENT_ROOM_TOP_TEN } from './EventRoomTypes';

function findTrack(rank: number): TopTenTrack {
  return EVENT_ROOM_TOP_TEN.find(track => track.rank === rank) ?? EVENT_ROOM_TOP_TEN[0];
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
      <mesh position={[0, 2.55, -5.72]}>
        <boxGeometry args={[7.35, 3.22, 0.08]} />
        <primitive object={materials.metal} attach="material" />
      </mesh>
      <mesh position={[0, 2.55, -5.66]}>
        <boxGeometry args={[6.8, 2.85, 0.08]} />
        <primitive object={materials.screen} attach="material" />
      </mesh>
      <mesh position={[0, 2.55, -5.6]}>
        <boxGeometry args={[6.18, 2.26, 0.035]} />
        <primitive object={materials.screenDim} attach="material" />
      </mesh>
      <mesh position={[-4.05, 2.35, -5.45]} rotation={[0, 0.22, 0]}>
        <boxGeometry args={[2.1, 2.2, 0.08]} />
        <primitive object={materials.screenDim} attach="material" />
      </mesh>
      <mesh position={[4.05, 2.35, -5.45]} rotation={[0, -0.22, 0]}>
        <boxGeometry args={[2.1, 2.2, 0.08]} />
        <primitive object={materials.screenDim} attach="material" />
      </mesh>

      <Html transform position={[0, 2.58, -5.59]} distanceFactor={4.8} pointerEvents="none">
        <div style={{
          width: '520px',
          height: '230px',
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
          <div style={{ fontSize: '12px', color: theme.ledSoft, opacity: .95 }}>{show.phase.toUpperCase()}</div>
          <div style={{ fontSize: '34px', fontWeight: 900, textShadow: `0 0 18px ${theme.led}` }}>TOP 10</div>
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
                    minHeight: '72px',
                    border: `1px solid ${active ? theme.ledSoft : 'rgba(255,255,255,.18)'}`,
                    background: active ? `${topTrack.accent}2a` : 'rgba(12,8,12,.42)',
                    boxShadow: active ? `0 0 22px ${theme.led}77` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '7px 3px',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 900 }}>{topTrack.rank}</div>
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
