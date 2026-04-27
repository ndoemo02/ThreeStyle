"use client";

import { Suspense, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Thr3StyleHudMark } from '../../../components/branding/Thr3StyleHudMark';
import { LeftWingCorridor } from '../corridors/LeftWingCorridor';
import { HubShell } from './HubShell';

const discoveryModes = [
  'Featured Tracks',
  'Trending Videos',
  'Discovery Mixes',
  'Creator Rooms',
];

const playlistItems = [
  { title: 'GOA Nites', meta: 'Asha T. / 03:48', votes: '28,950' },
  { title: 'Trimary', meta: 'T-cold House / 02:58', votes: '25,890' },
  { title: 'Mefit Wimo Syore', meta: 'Countd / 03:37', votes: '73,280' },
  { title: 'Porterabr 3S Aomx', meta: 'Harsh / 07:46', votes: '73,110' },
];

const waveformBars = [28, 42, 18, 50, 24, 44, 16, 58, 21, 36, 14, 40];

export function GroundedHub({ onEnterRoom }: { onEnterRoom?: (id: string) => void }) {
  const spotLightTarget = useMemo(() => new THREE.Object3D(), []);
  const enterPrimaryRoom = () => {
    if (onEnterRoom) {
      onEnterRoom('creator-room-mvp');
      return;
    }
    alert('Room entry is not wired in this preview.');
  };
  const enterSecondaryRoom = () => {
    if (onEnterRoom) {
      onEnterRoom('room-2');
      return;
    }
    alert('Secondary room is not wired in this preview.');
  };

  return (
    <group>
      <hemisphereLight args={['#ffe6cc', '#1c130d', 0.72]} />
      <directionalLight position={[0, 10, -5]} intensity={0.72} color="#fff2e5" castShadow />

      <primitive object={spotLightTarget} position={[0, 1.2, -8.8]} />

      <spotLight
        position={[0, 7, -8]}
        target={spotLightTarget}
        intensity={28}
        angle={0.52}
        penumbra={0.95}
        color="#f3a05d"
        distance={18}
        castShadow
      />

      <Suspense fallback={null}>
        <HubShell />
        {onEnterRoom && <LeftWingCorridor onEnterRoom={onEnterRoom} />}

        <group position={[0, 2, -9.1]}>
          <pointLight position={[0, 0.2, 1.0]} intensity={4.8} color="#f3a05d" distance={10} decay={2} />
          <pointLight position={[0, 0.2, -0.4]} intensity={3.2} color="#ffcf9e" distance={4.8} decay={2} castShadow />

          <Html transform occlude wrapperClass="hub-ui-screen" distanceFactor={4}>
            <div className="relative h-[560px] w-[920px] select-none overflow-hidden rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,12,10,0.64),rgba(6,7,9,0.82))] text-white shadow-[0_40px_140px_rgba(0,0,0,0.52),0_0_40px_rgba(243,160,93,0.08)] backdrop-blur-[20px]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(243,160,93,0.18),transparent_38%),radial-gradient(circle_at_left,rgba(255,255,255,0.06),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.07),transparent_16%,transparent_80%,rgba(0,0,0,0.22))]" />
              <div className="pointer-events-none absolute inset-[1px] rounded-[40px] border border-white/8" />
              <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,228,201,0.7),transparent)]" />
              <div className="pointer-events-none absolute left-[258px] top-[118px] bottom-[34px] w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.08),transparent)]" />
              <div className="pointer-events-none absolute right-[266px] top-[118px] bottom-[34px] w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.08),transparent)]" />

              <div className="relative flex h-full flex-col p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-[rgba(9,11,13,0.52)] px-5 py-3 shadow-[0_16px_36px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#f3a05d] shadow-[0_0_18px_rgba(243,160,93,0.9)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/76">B3P Interactive Hub</span>
                  </div>
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-[rgba(9,11,13,0.48)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/56 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/72">Live</span>
                    <span>Fullscreen Ready</span>
                  </div>
                </div>

                <div className="grid flex-1 grid-cols-[224px_1fr_236px] gap-6">
                  <aside className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,16,0.66),rgba(7,8,10,0.82))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34),0_0_20px_rgba(243,160,93,0.05)] backdrop-blur-[18px]">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_22%,transparent_75%,rgba(243,160,93,0.04))]" />
                    <div className="relative flex h-full flex-col">
                      <div className="mb-5 flex items-start justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.28em] text-white/48">Voting Power</p>
                          <p className="mt-2 text-[28px] font-semibold tracking-tight text-white">98%</p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/55">
                          Prime
                        </div>
                      </div>

                      <div className="mb-5 rounded-[24px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/12 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.22),rgba(255,255,255,0.04)_52%,rgba(0,0,0,0.15))] text-lg font-semibold text-white/88">
                            3S
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white/92">Thr3style Network</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/42">Curator profile synced</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-5 space-y-3">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/44">
                          <span>Discovery Weight</span>
                          <span className="text-white/70">8:38 / 0:35</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full w-[82%] rounded-full bg-[linear-gradient(90deg,rgba(243,160,93,0.72),rgba(255,232,208,0.98))]" />
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-3 text-[12px] text-white/60">
                          <span>Featured set has the strongest room signal.</span>
                          <span className="font-medium text-white/82">+12</span>
                        </div>
                      </div>

                      <div className="mt-auto rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.16))] p-4">
                        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-white/42">
                          <span>Room Pulse</span>
                          <span>Idle Layer</span>
                        </div>
                        <div className="flex h-14 items-end gap-1.5">
                          {waveformBars.map((height, index) => (
                            <span
                              key={index}
                              className="flex-1 rounded-full bg-[linear-gradient(180deg,rgba(255,244,232,0.96),rgba(243,160,93,0.42))]"
                              style={{ height: `${height}px`, opacity: index % 3 === 0 ? 0.95 : 0.7 }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </aside>

                  <section className="relative overflow-hidden rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(28,21,18,0.68),rgba(9,10,12,0.78))] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.4),0_0_28px_rgba(243,160,93,0.06)] backdrop-blur-[20px]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(243,160,93,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_24%,transparent_78%,rgba(243,160,93,0.03))]" />
                    <div className="relative flex h-full flex-col">
                      <div className="mb-5 flex items-start justify-between gap-5">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.28em] text-[#f3a05d]/76">Voting / Discovery</p>
                          <h1 className="mt-3 text-[34px] font-semibold leading-none tracking-[-0.04em] text-white">Cinematic voting surface for the room.</h1>
                          <p className="mt-3 max-w-[420px] text-[14px] leading-6 text-white/58">
                            Discovery stays at the center, with softer hierarchy and cleaner spacing so the room UI reads like a premium in-world system, not a flat terminal.
                          </p>
                        </div>
                        <Thr3StyleHudMark compact className="shrink-0" />
                      </div>

                      <div className="mb-5 grid grid-cols-2 gap-3">
                        {discoveryModes.map((mode, index) => (
                          <button
                            key={mode}
                            className={`rounded-[22px] border px-4 py-4 text-left transition ${
                              index === 0
                                ? 'border-[#f3a05d]/35 bg-[linear-gradient(180deg,rgba(243,160,93,0.16),rgba(255,255,255,0.05))] shadow-[0_18px_40px_rgba(243,160,93,0.08)]'
                                : 'border-white/10 bg-white/5 hover:bg-white/8'
                            }`}
                          >
                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">Mode {index + 1}</p>
                            <p className="mt-2 text-[17px] font-medium tracking-[-0.02em] text-white/92">{mode}</p>
                          </button>
                        ))}
                      </div>

                      <div className="grid flex-1 grid-rows-[1fr_auto] gap-4">
                        <div className="grid grid-cols-[1.25fr_1fr] gap-4">
                          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.08))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/42">
                              <span>Featured Decision</span>
                              <span className="text-[#f3a05d]/76">Live vote</span>
                            </div>
                            <div className="mt-4 rounded-[22px] border border-white/8 bg-black/18 p-4">
                              <p className="text-[24px] font-semibold tracking-[-0.03em] text-white">Keep THR3STYLE Discovery as the startup state?</p>
                              <p className="mt-3 text-[14px] leading-6 text-white/56">
                                This test slot checks whether the room lands better as a branded idle system before the audience jumps into active media.
                              </p>
                            </div>
                          </div>

                          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.12))] p-5">
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/42">
                              <span>Discovery Pulse</span>
                              <span>0:45 left</span>
                            </div>
                            <div className="mt-4 space-y-3">
                              {[
                                ['Featured Tracks', '82%'],
                                ['Trending Videos', '61%'],
                                ['Discovery Mixes', '55%'],
                              ].map(([label, value], index) => (
                                <div key={label} className="rounded-[18px] border border-white/8 bg-black/14 px-4 py-3">
                                  <div className="mb-2 flex items-center justify-between text-[12px] text-white/68">
                                    <span>{label}</span>
                                    <span className={index === 0 ? 'text-[#f3a05d]' : 'text-white/75'}>{value}</span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-white/8">
                                    <div
                                      className="h-full rounded-full bg-[linear-gradient(90deg,rgba(243,160,93,0.82),rgba(255,240,224,0.98))]"
                                      style={{ width: value }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.14))] p-4">
                          <button
                            className="min-w-[138px] rounded-[20px] border border-[#f3a05d]/38 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(243,160,93,0.12))] px-6 py-4 text-center text-[22px] font-medium tracking-[-0.03em] text-white shadow-[0_14px_30px_rgba(243,160,93,0.08)] transition hover:border-[#f3a05d]/55 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(243,160,93,0.16))]"
                            onClick={enterPrimaryRoom}
                          >
                            Yes
                          </button>
                          <button
                            className="min-w-[138px] rounded-[20px] border border-white/14 bg-white/5 px-6 py-4 text-center text-[22px] font-medium tracking-[-0.03em] text-white/86 transition hover:bg-white/8"
                            onClick={enterSecondaryRoom}
                          >
                            No
                          </button>
                          <div className="ml-auto flex-1">
                            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/42">
                              <span>Time Remaining</span>
                              <span>00:45</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/8">
                              <div className="h-full w-[62%] rounded-full bg-[linear-gradient(90deg,rgba(243,160,93,0.88),rgba(255,238,221,0.95))]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <aside className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,16,14,0.68),rgba(7,8,10,0.82))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34),0_0_20px_rgba(243,160,93,0.04)] backdrop-blur-[18px]">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_26%,transparent_82%,rgba(243,160,93,0.04))]" />
                    <div className="relative flex h-full flex-col">
                      <div className="mb-5">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/44">My Playlist</p>
                        <div className="mt-4 space-y-3">
                          {playlistItems.map((item, index) => (
                            <div key={item.title} className="rounded-[20px] border border-white/8 bg-black/18 p-3.5">
                              <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,rgba(243,160,93,0.55),rgba(255,255,255,0.16))] text-[11px] font-semibold text-white/86">
                                  0{index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium text-white/88">{item.title}</p>
                                  <p className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-white/36">{item.meta}</p>
                                </div>
                                <span className="text-[11px] text-white/48">{item.votes}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-auto rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.14))] p-4">
                        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-white/42">
                          <span>Room Settings</span>
                          <span>Atmosphere</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            ['Glow', '84'],
                            ['Focus', '67'],
                            ['Depth', '91'],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-[18px] border border-white/8 bg-black/18 p-3 text-center">
                              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/6 text-[13px] font-medium text-white/84">
                                {value}
                              </div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </Html>
        </group>
      </Suspense>
    </group>
  );
}
