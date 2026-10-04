'use client';

import { createContext, useContext, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHudStore } from '../../../stores/useHudStore';
import { useAudioStore } from '../../../stores/useAudioStore';
import { creatorLightingLevels } from '../../../lib/creatorLighting';

type Levels = ReturnType<typeof creatorLightingLevels>;
type Channel = keyof Levels;
const initialSettings = useHudStore.getState().lighting;
const initialFrame = { ...creatorLightingLevels(initialSettings, 0, false), color: new THREE.Color(initialSettings.ledColor), roomColor: new THREE.Color('#ffe8cf') };
const LightingContext = createContext<RefObject<typeof initialFrame>>({ current: initialFrame });
export function useCreatorLightingFrame() { return useContext(LightingContext); }

export function CreatorLightingProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => {
    const { lighting, roomMood } = useHudStore.getState();
    return { ...creatorLightingLevels(lighting, 0, false), color: new THREE.Color(lighting.ledColor), roomColor: new THREE.Color(roomMood === 'focus' ? '#e2edff' : roomMood === 'night' ? '#e9dcff' : '#ffe8cf') };
  }, []);
  const frameRef = useRef(initial);
  const audio = useRef({ analyser: null as AnalyserNode | null, data: new Uint8Array(256), last: 0, target: 0, energy: 0 });
  const lastColor = useRef('');
  const lastMood = useRef('');
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
        a.data = new Uint8Array(analyserNode.frequencyBinCount);
      }
      analyserNode.getByteFrequencyData(a.data);
      // FFT512: these bins cover approximately 90–280 Hz at 48 kHz.
      a.target = (a.data[1] + a.data[2] + a.data[3]) / (3 * 255);
      a.last = now;
    } else if (!playing || !lighting.audioReactive) a.target = 0;
    a.energy = THREE.MathUtils.damp(a.energy, a.target, a.target > a.energy ? 18 : 6, Math.min(delta, 0.1));
    const levels = creatorLightingLevels(lighting, a.energy, playing);
    const blend = 1 - Math.exp(-Math.min(delta, 0.1) * 10);
    for (const key of ['room', 'led', 'booth', 'screen'] as const) frame[key] = THREE.MathUtils.lerp(frame[key], levels[key], blend);
    if (lastColor.current !== lighting.ledColor) { frame.color.set(lighting.ledColor); lastColor.current = lighting.ledColor; }
    if (lastMood.current !== roomMood) { frame.roomColor.set(roomMood === 'focus' ? '#e2edff' : roomMood === 'night' ? '#e9dcff' : '#ffe8cf'); lastMood.current = roomMood; }
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
}

export function CreatorLight({ kind = 'point', channel = 'room', name, intensity, target, ...props }: CreatorLightProps) {
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
    ref.current.color.copy(channel === 'led' || channel === 'booth' ? frame.color : frame.roomColor);
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
    <CreatorLight kind="ambient" name="ambient" intensity={0.95} />
    <CreatorLight kind="hemisphere" name="hemisphere" intensity={0.9} />
    <CreatorLight kind="directional" name="daylight" position={[5, 10, 5]} intensity={0.5} />
    <CreatorLight kind="spot" name="desk" position={[3.5, 4.5, -3.4]} target={[3.5, 0, -3.4]} intensity={26} angle={0.8} penumbra={0.8} distance={9} decay={1.5} />
    <CreatorLight kind="spot" name="rtv" position={[-5, 4, 3.2]} target={[-6, 0.6, 3.2]} intensity={22} angle={0.9} penumbra={1} distance={8} decay={1.5} />
    <CreatorLight kind="area" name="wall-wash" position={[1.05, 3.25, -5.35]} rotation={[0.18, 0, 0]} intensity={2.15} width={8.5} height={2.2} />
  </>;
}
