"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { BloomEffect } from 'postprocessing';
import {
  EVENT_ROOM_BLACKOUT_BEAT_LEAD_MS,
  EVENT_ROOM_LIGHT_BASES,
  EVENT_ROOM_LIGHT_CHANNELS,
  EVENT_ROOM_LIGHT_STATE_CYCLE,
  EVENT_ROOM_LIGHT_STATES,
  EVENT_ROOM_LIGHT_TAU,
  EVENT_ROOM_PHASE_LIGHT_STATE,
  EVENT_ROOM_SCREEN_WASH,
  eventRoomScreenWashDirection,
  createEventRoomLightLevels,
  eventRoomBloomThreshold,
  eventRoomScreenMultiplier,
  stepEventRoomLightLevel,
  type EventRoomLightBaseProfile,
  type EventRoomLightChannel,
  type EventRoomLightLevels,
  type EventRoomLightStateId,
} from './eventRoomLightStates';
import { EVENT_ROOM_LEGACY_EMISSIVE_BASES, type EventRoomMaterials } from './EventRoomMaterials';
import type { EventRoomShowPhase, EventRoomThemeTokens } from './EventRoomTypes';

/**
 * `RectAreaLightUniformsLib.init()` musi wykonać się dokładnie raz przed pierwszym
 * użyciem RectAreaLight — bez tego `UniformsLib.LTC_FLOAT_1` jest `undefined`,
 * `ltc_1`/`ltc_2` bindują pustą teksturę i człon specular jest wyzerowany (D3).
 */
let rectAreaLightUniformsReady = false;
function ensureRectAreaLightUniforms() {
  if (rectAreaLightUniformsReady) return;
  RectAreaLightUniformsLib.init();
  rectAreaLightUniformsReady = true;
}

// Raz na moduł — nigdy w klatce, nigdy w renderze komponentu.
ensureRectAreaLightUniforms();

/**
 * Kontrola, czy tablice LTC faktycznie trafiły do `UniformsLib`. Bez nich
 * `ltc_1`/`ltc_2` bindują pustą teksturę i człon specular jest wyzerowany —
 * rozproszenie działa mimo to, więc brak specularu jest niewidoczny w testach
 * sprawdzających tylko „czy świeci". Klucze są dodawane dynamicznie, poza typami.
 */
function isRectAreaLtcReady(): boolean {
  const uniforms = THREE.UniformsLib as unknown as Record<string, unknown>;
  return uniforms.LTC_FLOAT_1 !== undefined || uniforms.LTC_HALF_1 !== undefined;
}

/**
 * Uchwyt materiału ekranu. `EventRoomCurvedScreen` jest montowany przez
 * `EventRoomScreens`, więc nie da się przekazać materiału propsem bez zmiany
 * pliku poza zakresem Etapu 2 — ekran rejestruje się w tym pudełku, a rig
 * czyta je w `useFrame` (zero re-renderów, null-safe do czasu rejestracji).
 */
export type EventRoomScreenSurfaceBinding = {
  material: THREE.MeshBasicMaterial | null;
};

const EventRoomScreenSurfaceContext = createContext<EventRoomScreenSurfaceBinding | null>(null);

export const EventRoomScreenSurfaceProvider = EventRoomScreenSurfaceContext.Provider;

export function useEventRoomScreenSurfaceBinding(): EventRoomScreenSurfaceBinding | null {
  return useContext(EventRoomScreenSurfaceContext);
}

export function createEventRoomScreenSurfaceBinding(): EventRoomScreenSurfaceBinding {
  return { material: null };
}

/** Znacznik następnego auto-advance — wejście kolejki beatu blackoutu. */
export type EventRoomShowTiming = {
  nextAutoAdvanceAt: number | null;
};

/**
 * Materiały emisyjne są partycjonowane po kanale światła, nie po wyglądzie:
 * jedna klamka `emissiveIntensity` steruje wszystkimi instancjami kanału.
 *
 * `led` i `warmLed` to warstwa zgodności — renderery powłoki, podium, lounge i
 * ekranów bocznych (pliki poza zakresem Etapu 2) nadal ich używają. Znikają,
 * gdy te renderery przejdą na materiały kanałowe w Etapach 3–6.
 */
type EmissiveBinding = {
  channel: EventRoomLightChannel;
  key: keyof EventRoomMaterials;
  base: number;
  legacy?: true;
};

const EMISSIVE_BINDINGS: readonly EmissiveBinding[] = [
  { channel: 'ceilingRing', key: 'ringNeon', base: EVENT_ROOM_LIGHT_BASES.emissive.ringNeon },
  { channel: 'ceilingAccents', key: 'ringAccent', base: EVENT_ROOM_LIGHT_BASES.emissive.ringAccent },
  { channel: 'sideWash', key: 'wallSlit', base: EVENT_ROOM_LIGHT_BASES.emissive.wallSlit },
  { channel: 'runway', key: 'runwayLed', base: EVENT_ROOM_LIGHT_BASES.emissive.runwayLed },
  { channel: 'loungeGlow', key: 'loungeLed', base: EVENT_ROOM_LIGHT_BASES.emissive.loungeLed },
  { channel: 'exitSafety', key: 'exitLed', base: EVENT_ROOM_LIGHT_BASES.emissive.exitLed },
  { channel: 'ceilingRing', key: 'led', base: EVENT_ROOM_LEGACY_EMISSIVE_BASES.led, legacy: true },
  { channel: 'loungeGlow', key: 'warmLed', base: EVENT_ROOM_LEGACY_EMISSIVE_BASES.warmLed, legacy: true },
  { channel: 'screenKey', key: 'screenDim', base: EVENT_ROOM_LEGACY_EMISSIVE_BASES.screenDim, legacy: true },
  { channel: 'screenKey', key: 'sideScreen', base: EVENT_ROOM_LEGACY_EMISSIVE_BASES.sideScreen, legacy: true },
];

const MAX_FRAME_DELTA = 1 / 20;

/**
 * Most diagnostyczny istnieje wyłącznie w developmencie. Stała modułowa zamiast
 * odczytu w miejscu użycia, żeby bundler usunął cały blok z builda produkcyjnego
 * — łącznie z `scene.traverse` w pętli klatki.
 */
const IS_DEV = process.env.NODE_ENV !== 'production';

export type EventRoomLightRigDebug = {
  activeState: EventRoomLightStateId;
  levels: EventRoomLightLevels;
  baseProfile: EventRoomLightBaseProfile;
  forcedBlackout: boolean;
  manualState: EventRoomLightStateId | null;
  blackoutBeatActive: boolean;
  exposure: number;
  previousExposure: number;
  /** `THREE.ToneMapping` renderera — EffectComposer wymusza `NoToneMapping`. */
  toneMapping: number;
  realLightCount: number;
  shadowMapCount: number;
  emissive: Record<string, number>;
  /** Intensywności prawdziwych świateł — do testu niezależności kanałów. */
  lightIntensities: Record<string, number>;
  screenMultiplier: number;
  /** Uchwyt renderera dla pomiaru kosztu klatki. Docelowa sonda perf: Etap 9. */
  renderer: THREE.WebGLRenderer;
  /** Czy `UniformsLib.LTC_*` są załadowane — warunek członu specular (D3). */
  ltcReady: boolean;
  /** Uchwyty świateł do testu A/B (przełączanie `visible`, bez zmian w rigu). */
  lightRefs: Record<string, THREE.Light | null>;
  screenWash: {
    colorHex: string;
    intensity: number;
    position: [number, number, number];
    worldDirection: { x: number; y: number; z: number };
  };
  setState: (state: EventRoomLightStateId | null) => void;
  forceBlackout: (forced: boolean) => void;
};

export function EventRoomLightRig({
  theme,
  materials,
  baseProfile,
  phase,
  isPaused,
  showTiming,
  bloom,
}: {
  theme: EventRoomThemeTokens;
  materials: EventRoomMaterials;
  baseProfile: EventRoomLightBaseProfile;
  phase: EventRoomShowPhase;
  isPaused: boolean;
  showTiming: EventRoomShowTiming;
  bloom: BloomEffect;
}) {
  const gl = useThree(state => state.gl);
  const scene = useThree(state => state.scene);
  const screenBinding = useEventRoomScreenSurfaceBinding();

  const hemisphereRef = useRef<THREE.HemisphereLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const rectAreaRef = useRef<THREE.RectAreaLight>(null);
  const spotLeftRef = useRef<THREE.SpotLight>(null);
  const spotRightRef = useRef<THREE.SpotLight>(null);

  const levelsRef = useRef<EventRoomLightLevels>(createEventRoomLightLevels('house'));
  const overrideRef = useRef<{ forcedBlackout: boolean; manualState: EventRoomLightStateId | null }>({
    forcedBlackout: false,
    manualState: null,
  });
  const manualCycleRef = useRef(0);
  const beatLatchRef = useRef(false);
  const previousExposureRef = useRef(gl.toneMappingExposure);
  const debugRef = useRef<EventRoomLightRigDebug | null>(null);

  const isDesktop = baseProfile === 'desktop';
  const rectAreaBase = EVENT_ROOM_LIGHT_BASES.rectArea[baseProfile];
  // Wash ekranu musi nieść barwę ekranu, nie barwę światła bazowego — inaczej
  // jest nieodróżnialny od `ambientLight` i D3 nie da się potwierdzić wzrokowo.
  const screenWashColor = useMemo(
    () => new THREE.Color(theme.screenPrimary)
      .lerp(new THREE.Color(theme.ledSoft), EVENT_ROOM_SCREEN_WASH.colorMix),
    [theme],
  );
  const bloomThresholdBase = EVENT_ROOM_LIGHT_BASES.bloomThreshold[baseProfile];

  // Przejęcie ekspozycji: zapamiętanie poprzedniej wartości na mount i
  // bezwarunkowe przywrócenie na unmount — bez tego Hub i Creator Room
  // odziedziczyłyby ekspozycję Event Roomu (D2, R2).
  //
  // MUSI być `useLayoutEffect`: efekty pasywne uruchamiają się po paincie, więc
  // pierwsza klatka `useFrame` zdążyłaby nadpisać ekspozycję i rig zapamiętałby
  // własną wartość zamiast wartości hosta (zmierzone: 1.2 zamiast 1.55).
  useLayoutEffect(() => {
    const previousExposure = gl.toneMappingExposure;
    previousExposureRef.current = previousExposure;
    return () => {
      gl.toneMappingExposure = previousExposure;
    };
  }, [gl]);

  // Spoty `sideWash` celują w ściany boczne kierunkowo. Target musi być w grafie
  // sceny, żeby jego macierz świata była aktualizowana.
  useEffect(() => {
    const spots = [spotLeftRef.current, spotRightRef.current].filter(
      (spot): spot is THREE.SpotLight => spot !== null,
    );
    spots.forEach(spot => {
      spot.target.position.set(Math.sign(spot.position.x) * 12.6, 1.6, 0.4);
      scene.add(spot.target);
    });
    return () => {
      spots.forEach(spot => scene.remove(spot.target));
    };
  }, [scene, isDesktop]);

  // Skróty rigu. Reducer show i jego skróty (1/2/P/N/B/F/R) zostają nietknięte —
  // Digit0 i KeyL działają wyłącznie na override świetlny.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Digit0') {
        overrideRef.current.forcedBlackout = !overrideRef.current.forcedBlackout;
        return;
      }
      if (event.code === 'KeyL' && IS_DEV) {
        manualCycleRef.current = (manualCycleRef.current + 1) % EVENT_ROOM_LIGHT_STATE_CYCLE.length;
        overrideRef.current.manualState = EVENT_ROOM_LIGHT_STATE_CYCLE[manualCycleRef.current] ?? null;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Most diagnostyczny dla harnessu (dev-only): deterministyczne wymuszanie
  // stanów i odczyt poziomów bez symulowania klawiatury.
  useEffect(() => {
    if (!IS_DEV) return;
    const host = window as typeof window & { __eventRoomLightRig?: EventRoomLightRigDebug | null };
    const bridge: EventRoomLightRigDebug = {
      activeState: 'house',
      levels: levelsRef.current,
      baseProfile,
      forcedBlackout: false,
      manualState: null,
      blackoutBeatActive: false,
      exposure: gl.toneMappingExposure,
      previousExposure: previousExposureRef.current,
      toneMapping: gl.toneMapping,
      realLightCount: 0,
      shadowMapCount: 0,
      emissive: {},
      lightIntensities: {},
      screenMultiplier: 1,
      renderer: gl,
      ltcReady: isRectAreaLtcReady(),
      lightRefs: {},
      screenWash: {
        colorHex: `#${screenWashColor.getHexString()}`,
        intensity: 0,
        position: [...EVENT_ROOM_SCREEN_WASH.position],
        worldDirection: eventRoomScreenWashDirection(),
      },
      setState: state => {
        overrideRef.current.manualState = state;
        const cycleIndex = EVENT_ROOM_LIGHT_STATE_CYCLE.indexOf(state);
        manualCycleRef.current = cycleIndex >= 0 ? cycleIndex : manualCycleRef.current;
      },
      forceBlackout: forced => {
        overrideRef.current.forcedBlackout = forced;
      },
    };
    debugRef.current = bridge;
    host.__eventRoomLightRig = bridge;
    return () => {
      debugRef.current = null;
      delete host.__eventRoomLightRig;
    };
  }, [baseProfile, gl, screenWashColor]);

  /* eslint-disable react-hooks/immutability --
     Rig jest jedynym writerem uchwytów Three.js w tej strefie: zapis do
     intensywności świateł, `emissiveIntensity` materiałów kanałowych, efektu
     bloom i `gl.toneMappingExposure` w jednym `useFrame` zastępuje re-render
     Reacta (§6 planu). Reguła nie modeluje imperatywnego API Three.js. */
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);
    const override = overrideRef.current;

    // Beat blackoutu jest kolejkowany w driverze i zatrzaskiwany do faktycznego
    // wejścia w `trackReveal`: reducer zmienia fazę o commit Reacta później niż
    // znacznik czasu, więc bez zatrzasku stan wracałby na klatkę do `focus`.
    const timing = showTiming.nextAutoAdvanceAt;
    const inCountdown = phase === 'countdown' && !isPaused;
    if (!inCountdown) {
      beatLatchRef.current = false;
    } else if (timing !== null && timing - performance.now() <= EVENT_ROOM_BLACKOUT_BEAT_LEAD_MS) {
      beatLatchRef.current = true;
    }
    const blackoutBeatActive = inCountdown && beatLatchRef.current;

    const activeState: EventRoomLightStateId = override.forcedBlackout
      ? 'blackout'
      : override.manualState
        ?? (blackoutBeatActive ? 'blackout' : EVENT_ROOM_PHASE_LIGHT_STATE[phase]);

    const targets = EVENT_ROOM_LIGHT_STATES[activeState];
    const levels = levelsRef.current;
    for (const channel of EVENT_ROOM_LIGHT_CHANNELS) {
      levels[channel] = stepEventRoomLightLevel(
        levels[channel],
        targets[channel],
        EVENT_ROOM_LIGHT_TAU[channel],
        delta,
      );
    }

    // `house` steruje jednocześnie oboma światłami bazowymi.
    if (hemisphereRef.current) {
      hemisphereRef.current.intensity = EVENT_ROOM_LIGHT_BASES.hemisphere * levels.house;
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = EVENT_ROOM_LIGHT_BASES.ambient * levels.house;
    }

    // `screenKey`: jedyny RectAreaLight przed ekranem + mnożnik koloru ekranu.
    if (rectAreaRef.current) {
      rectAreaRef.current.intensity = rectAreaBase * levels.screenKey;
    }
    const screenMultiplier = eventRoomScreenMultiplier(levels.screenKey);
    const screenMaterial = screenBinding?.material;
    if (screenMaterial) {
      screenMaterial.color.setScalar(screenMultiplier);
    }

    // `sideWash`: 2 spoty na desktopie, 0 na mobile.
    const spotIntensity = EVENT_ROOM_LIGHT_BASES.spot * levels.sideWash;
    if (spotLeftRef.current) spotLeftRef.current.intensity = spotIntensity;
    if (spotRightRef.current) spotRightRef.current.intensity = spotIntensity;

    for (const binding of EMISSIVE_BINDINGS) {
      const material = materials[binding.key];
      material.emissiveIntensity = binding.base * levels[binding.channel];
    }

    bloom.intensity = levels.bloom;
    bloom.luminanceMaterial.threshold = eventRoomBloomThreshold(levels.bloom, bloomThresholdBase);
    bloom.luminanceMaterial.smoothing = EVENT_ROOM_LIGHT_BASES.bloomSmoothing;

    // `exposure` jest wartością absolutną — rig jest jej właścicielem w tej strefie.
    gl.toneMappingExposure = levels.exposure;

    const debug = IS_DEV ? debugRef.current : null;
    if (debug) {
      debug.activeState = activeState;
      debug.forcedBlackout = override.forcedBlackout;
      debug.manualState = override.manualState;
      debug.blackoutBeatActive = blackoutBeatActive;
      debug.exposure = gl.toneMappingExposure;
      debug.previousExposure = previousExposureRef.current;
      debug.toneMapping = gl.toneMapping;
      debug.screenMultiplier = screenMultiplier;
      for (const binding of EMISSIVE_BINDINGS) {
        debug.emissive[binding.key] = materials[binding.key].emissiveIntensity;
      }
      debug.lightIntensities.hemisphere = hemisphereRef.current?.intensity ?? 0;
      debug.lightIntensities.ambient = ambientRef.current?.intensity ?? 0;
      debug.lightIntensities.rectArea = rectAreaRef.current?.intensity ?? 0;
      debug.lightIntensities.spotLeft = spotLeftRef.current?.intensity ?? 0;
      debug.lightIntensities.spotRight = spotRightRef.current?.intensity ?? 0;
      debug.lightRefs.hemisphere = hemisphereRef.current;
      debug.lightRefs.ambient = ambientRef.current;
      debug.lightRefs.rectArea = rectAreaRef.current;
      debug.lightRefs.spotLeft = spotLeftRef.current;
      debug.lightRefs.spotRight = spotRightRef.current;
      debug.screenWash.intensity = rectAreaRef.current?.intensity ?? 0;
      let realLightCount = 0;
      let shadowMapCount = 0;
      scene.traverse(object => {
        const light = object as THREE.Light;
        if (!light.isLight) return;
        realLightCount += 1;
        if (light.castShadow) shadowMapCount += 1;
      });
      debug.realLightCount = realLightCount;
      debug.shadowMapCount = shadowMapCount;
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <>
      <color attach="background" args={[theme.background]} />
      <fog attach="fog" args={[theme.background, 22, 52]} />

      <hemisphereLight
        ref={hemisphereRef}
        color="#ffe6c8"
        groundColor={theme.haze}
        intensity={EVENT_ROOM_LIGHT_BASES.hemisphere}
      />
      <ambientLight
        ref={ambientRef}
        color={theme.ledSoft}
        intensity={EVENT_ROOM_LIGHT_BASES.ambient}
      />

      <rectAreaLight
        ref={rectAreaRef}
        color={screenWashColor}
        intensity={rectAreaBase}
        width={EVENT_ROOM_SCREEN_WASH.width}
        height={EVENT_ROOM_SCREEN_WASH.height}
        position={[...EVENT_ROOM_SCREEN_WASH.position]}
        rotation={[-Math.PI + EVENT_ROOM_SCREEN_WASH.tiltRad, 0, 0]}
      />

      {isDesktop ? (
        <>
          <spotLight
            ref={spotLeftRef}
            color={theme.ledSoft}
            intensity={EVENT_ROOM_LIGHT_BASES.spot}
            position={[-9.6, 5.9, 0.8]}
            angle={0.62}
            penumbra={1.0}
            distance={26}
            decay={1.4}
            castShadow={false}
          />
          <spotLight
            ref={spotRightRef}
            color={theme.ledSoft}
            intensity={EVENT_ROOM_LIGHT_BASES.spot}
            position={[9.6, 5.9, 0.8]}
            angle={0.62}
            penumbra={1.0}
            distance={26}
            decay={1.4}
            castShadow={false}
          />
        </>
      ) : null}
    </>
  );
}
