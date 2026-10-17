'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHudStore } from '../../../stores/useHudStore';
import { useAudioStore } from '../../../stores/useAudioStore';
import { createLedRhythm, creatorLightingLevels, kickLevelFromDecibels, ledPaletteColor, stepLedRhythm, type CreatorLightingSettings } from '../../../lib/creatorLighting';

type Levels = ReturnType<typeof creatorLightingLevels>;
type Channel = keyof Levels;
const KEY_WHITE = new THREE.Color('#ffe6cc');
const moodColor = (mood: string) => mood === 'focus' ? '#e2edff' : mood === 'night' ? '#e9dcff' : '#ffe8cf';

function createFrame(lighting: CreatorLightingSettings, mood: string) {
  const color = new THREE.Color(lighting.ledColor);
  return {
    ...creatorLightingLevels(lighting, 0, false),
    /** Current LED colour (static `ledColor`, or the palette colour while cycling). */
    color,
    /** The booth keeps the chosen colour as a tint on a warm key, so the host is never rainbow-lit. */
    boothColor: KEY_WHITE.clone().lerp(color, 0.4),
    roomColor: new THREE.Color(moodColor(mood)),
    /** Palette position for strips that spread the palette along their length. */
    palette: 0,
    cycling: lighting.ledCycle,
  };
}
export type CreatorLightingFrame = ReturnType<typeof createFrame>;
const initialSettings = useHudStore.getState();
const LightingContext = createContext<RefObject<CreatorLightingFrame>>({ current: createFrame(initialSettings.lighting, initialSettings.roomMood) });
export function useCreatorLightingFrame() { return useContext(LightingContext); }

export function CreatorLightingProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => { const { lighting, roomMood } = useHudStore.getState(); return createFrame(lighting, roomMood); }, []);
  const frameRef = useRef(initial);
  // One spectrum read per frame budget (30 Hz) shared by every LED, booth and accent consumer.
  const audio = useRef({ analyser: null as AnalyserNode | null, data: new Float32Array(256), last: 0, bass: 0, rhythm: createLedRhythm(), reduced: false, mix: new THREE.Color(), rgb: { r: 0, g: 0, b: 0 } });
  const lastColor = useRef('');
  const lastMood = useRef('');
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { audio.current.reduced = media.matches; };
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useFrame((_, delta) => {
    const frame = frameRef.current;
    const { lighting, roomMood, playbackStatus } = useHudStore.getState();
    const { analyserNode, isActive } = useAudioStore.getState();
    const playing = playbackStatus === 'playing' && isActive;
    const a = audio.current;
    const now = performance.now();
    if (lighting.audioReactive && playing && analyserNode && now - a.last >= 1000 / 30) {
      if (a.analyser !== analyserNode) {
        a.analyser = analyserNode;
        a.data = new Float32Array(analyserNode.frequencyBinCount);
      }
      // dB, not bytes: bytes clip at maxDecibels, and loud masters sit there, hiding the kick.
      analyserNode.getFloatFrequencyData(a.data);
      // FFT512: bins 1–3 cover approximately 90–280 Hz at 48 kHz.
      a.bass = kickLevelFromDecibels(a.data);
      a.last = now;
    }
    const step = Math.min(delta, 0.1);
    // Beats (and so light hits and colour steps) are capped in stepLedRhythm; without the music
    // reaction a cycling palette only drifts.
    stepLedRhythm(a.rhythm, playing ? (lighting.audioReactive ? a.bass : 0) : null, step, a.reduced || !lighting.audioReactive);
    const levels = creatorLightingLevels(lighting, a.rhythm.pulse, playing);
    const blend = 1 - Math.exp(-step * 10);
    for (const key of ['room', 'led', 'booth', 'screen'] as const) frame[key] = THREE.MathUtils.lerp(frame[key], levels[key], blend);
    frame.cycling = lighting.ledCycle;
    if (lighting.ledCycle) {
      frame.palette = a.rhythm.position;
      const { r, g, b } = ledPaletteColor(a.rhythm.position, a.rgb);
      frame.color.setRGB(r, g, b, THREE.SRGBColorSpace);
      lastColor.current = '';
    } else if (lastColor.current !== lighting.ledColor) { frame.color.set(lighting.ledColor); lastColor.current = lighting.ledColor; }
    frame.boothColor.copy(KEY_WHITE).lerp(a.mix.set(lighting.ledColor), 0.4);
    if (lastMood.current !== roomMood) { frame.roomColor.set(moodColor(roomMood)); lastMood.current = roomMood; }
  }, -2);
  return <LightingContext.Provider value={frameRef}>{children}</LightingContext.Provider>;
}

interface CreatorLightProps {
  kind?: 'point' | 'spot' | 'ambient' | 'hemisphere' | 'directional' | 'area';
  channel?: Channel;
  name: string;
  intensity: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  target?: [number, number, number];
  distance?: number;
  decay?: number;
  angle?: number;
  penumbra?: number;
  width?: number;
  height?: number;
  /** Fixed colour; otherwise the channel colour is used. */
  color?: THREE.Color;
}

export function CreatorLight({ kind = 'point', channel = 'room', name, intensity, target, color, ...props }: CreatorLightProps) {
  const frameRef = useCreatorLightingFrame();
  const ref = useRef<THREE.Light | null>(null);
  const tx = target?.[0] ?? 0, ty = target?.[1] ?? 0, tz = target?.[2] ?? 0;
  const targetObject = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.set(tx, ty, tz);
    return object;
  }, [tx, ty, tz]);
  const bind = (light: THREE.Light | null) => { ref.current = light; };
  useFrame(() => {
    const frame = frameRef.current;
    if (!ref.current) return;
    ref.current.intensity = intensity * frame[channel];
    ref.current.color.copy(color ?? (channel === 'led' ? frame.color : channel === 'booth' ? frame.boothColor : frame.roomColor));
  }, -1);
  const common = { name: `creator-${name}`, ref: bind, intensity: 0, position: props.position };
  if (kind === 'ambient') return <ambientLight {...common} />;
  if (kind === 'hemisphere') return <hemisphereLight {...common} groundColor="#392b24" />;
  if (kind === 'directional') return <directionalLight {...common} />;
  if (kind === 'area') return <rectAreaLight {...common} width={props.width} height={props.height} rotation={props.rotation} />;
  if (kind === 'spot') return <><primitive object={targetObject} /><spotLight {...common} target={targetObject} distance={props.distance} decay={props.decay} angle={props.angle} penumbra={props.penumbra} /></>;
  return <pointLight {...common} distance={props.distance} decay={props.decay} />;
}

export function CreatorRoomLightingRig() {
  return <>
    <CreatorLight kind="ambient" name="ambient" intensity={0.7} />
    <CreatorLight kind="hemisphere" name="hemisphere" intensity={0.65} />
    <CreatorLight kind="directional" name="daylight" position={[5, 10, 5]} intensity={0.5} />
    <CreatorLight kind="spot" name="desk" position={[3.5, 4.5, -3.4]} target={[3.5, 0, -3.4]} intensity={26} angle={0.8} penumbra={0.8} distance={9} decay={1.5} />
    <CreatorLight kind="spot" name="rtv" position={[-5, 4, 3.2]} target={[-6, 0.6, 3.2]} intensity={22} angle={0.9} penumbra={1} distance={8} decay={1.5} />
    <CreatorLight kind="area" name="wall-wash" position={[1.05, 3.25, -5.35]} rotation={[0.18, 0, 0]} intensity={2.15} width={8.5} height={2.2} />
  </>;
}
