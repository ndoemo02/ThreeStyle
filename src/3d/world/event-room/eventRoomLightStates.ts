import type { EventRoomShowPhase } from './EventRoomTypes';

/**
 * Czysta tabela light rigu Event Roomu — 10 kanałów × 5 stanów, stałe czasowe
 * przejść i bazy uchwytów. Bez importów Reacta i Three.js, żeby dała się
 * zwalidować harnessem bez WebGL.
 *
 * WARTOŚCI SĄ TYMCZASOWE (Etap 2 = mechanizm). Finalne poziomy, τ i bazy
 * zatwierdza Etap 8, gdy istnieją już powłoka, sufit, lounge, runway i ekrany.
 * Źródło liczb: plan „Event Room — FINAL rev. 3", §6.
 */

export const EVENT_ROOM_LIGHT_CHANNELS = [
  'house',
  'screenKey',
  'ceilingRing',
  'ceilingAccents',
  'sideWash',
  'runway',
  'loungeGlow',
  'exitSafety',
  'bloom',
  'exposure',
] as const;

export type EventRoomLightChannel = (typeof EVENT_ROOM_LIGHT_CHANNELS)[number];

export const EVENT_ROOM_LIGHT_STATE_IDS = [
  'house',
  'focus',
  'blackout',
  'reveal',
  'finale',
] as const;

export type EventRoomLightStateId = (typeof EVENT_ROOM_LIGHT_STATE_IDS)[number];

export type EventRoomLightLevels = Record<EventRoomLightChannel, number>;

/** §6 „Tabela stanów". `exposure` jest wartością absolutną, pozostałe kanały to mnożniki bazy. */
export const EVENT_ROOM_LIGHT_STATES: Record<EventRoomLightStateId, EventRoomLightLevels> = {
  house: {
    house: 1.0,
    screenKey: 0.55,
    ceilingRing: 0.6,
    ceilingAccents: 0.45,
    sideWash: 0.85,
    runway: 0.5,
    loungeGlow: 0.9,
    exitSafety: 1.0,
    bloom: 0.32,
    exposure: 1.2,
  },
  focus: {
    house: 0.32,
    screenKey: 1.0,
    ceilingRing: 0.28,
    ceilingAccents: 0.15,
    sideWash: 0.2,
    runway: 0.78,
    loungeGlow: 0.42,
    exitSafety: 0.85,
    bloom: 0.44,
    exposure: 1.05,
  },
  blackout: {
    house: 0.02,
    screenKey: 0.08,
    ceilingRing: 0.04,
    ceilingAccents: 0.0,
    sideWash: 0.0,
    runway: 0.05,
    loungeGlow: 0.06,
    exitSafety: 0.7,
    bloom: 0.18,
    exposure: 0.82,
  },
  reveal: {
    house: 0.14,
    screenKey: 1.35,
    ceilingRing: 0.85,
    ceilingAccents: 0.7,
    sideWash: 0.32,
    runway: 1.1,
    loungeGlow: 0.52,
    exitSafety: 0.85,
    bloom: 0.56,
    exposure: 1.15,
  },
  finale: {
    house: 0.5,
    screenKey: 1.6,
    ceilingRing: 1.45,
    ceilingAccents: 1.3,
    sideWash: 1.1,
    runway: 1.5,
    loungeGlow: 1.0,
    exitSafety: 1.0,
    bloom: 0.74,
    exposure: 1.32,
  },
};

/** §6 „Przejścia" — stałe czasowe wygładzania wykładniczego, w sekundach. */
export const EVENT_ROOM_LIGHT_TAU: Record<EventRoomLightChannel, number> = {
  screenKey: 0.1,
  bloom: 0.1,
  runway: 0.28,
  ceilingAccents: 0.28,
  exposure: 0.28,
  house: 0.6,
  sideWash: 0.6,
  ceilingRing: 0.6,
  loungeGlow: 0.6,
  exitSafety: 0.6,
};

/** Zbicie do dołu jest 1/0.6 = 1.67× szybsze niż podnoszenie — blackout „zapada się". */
export const EVENT_ROOM_LIGHT_FALL_FACTOR = 0.6;

/** §6 „Bazy" — wartości startowe uchwytów, mnożone przez poziom kanału. */
export const EVENT_ROOM_LIGHT_BASES = {
  hemisphere: 1.05,
  ambient: 0.3,
  /**
   * Wash ekranu. Plan §6 podawał 4.6/3.2, ale te wartości dobrano przy błędnej
   * orientacji, która kierowała światło z powrotem na ścianę ekranu. Po korekcie
   * kierunku ta sama moc zalewa całą salę różem. Wartości zatwierdzone pomiarem
   * A/B (2026-07-30, sprzętowe GPU): posadzka +35 luma, metal +32, ściana
   * kontrolna +2.7 — smuga kierunkowa, bez efektu lustra.
   */
  rectArea: { desktop: 1.6, mobile: 1.1 },
  spot: 2.4,
  emissive: {
    ringNeon: 2.6,
    ringAccent: 1.8,
    runwayLed: 2.2,
    loungeLed: 1.6,
    wallSlit: 1.4,
    exitLed: 1.2,
  },
  /** Mnożnik koloru MeshBasicMaterial ekranu i jego dolny clamp (D8). */
  screen: { multiplier: 1.0, minMultiplier: 0.06 },
  /** Bazowy próg luminancji bloomu; krzywa podnosi go przy niskich poziomach kanału. */
  bloomThreshold: { desktop: 0.84, mobile: 0.9 },
  bloomSmoothing: 0.18,
} as const;

export type EventRoomLightBaseProfile = 'desktop' | 'mobile';

/**
 * Geometria washu ekranu (kanał `screenKey`). Plan §6 podaje wymiary, pozycję i
 * bazy intensywności, ale nie kolor ani orientację — a od nich zależy, czy
 * człon specular RectAreaLight (D3) jest w ogóle widoczny na posadzce i metalu.
 *
 * `tiltRad` liczony od osi −Z: kierunek świecenia = (0, sin θ, −cos θ) dla
 * θ = −π + tilt, czyli od ekranu **w stronę widowni**, opadając. Poprzednia
 * orientacja (−π/2.6) kierowała wash w dół i z powrotem na ścianę ekranu.
 */
export const EVENT_ROOM_SCREEN_WASH = {
  width: 14,
  height: 4.4,
  position: [0, 5.0, -8.9] as const,
  tiltRad: 0.43,
  /** Udział `theme.ledSoft` w kolorze washu; reszta to `theme.screenPrimary`. */
  colorMix: 0.25,
} as const;

/** Kierunek świecenia washu w przestrzeni świata — do diagnostyki i testów. */
export function eventRoomScreenWashDirection(tiltRad = EVENT_ROOM_SCREEN_WASH.tiltRad) {
  const theta = -Math.PI + tiltRad;
  return { x: 0, y: Math.sin(theta), z: -Math.cos(theta) };
}

/** §6 „Mapowanie fazy show → stan". Rig czyta fazę, nigdy nie modyfikuje reducera. */
export const EVENT_ROOM_PHASE_LIGHT_STATE: Record<EventRoomShowPhase, EventRoomLightStateId> = {
  idle: 'house',
  intro: 'focus',
  countdown: 'focus',
  trackReveal: 'reveal',
  finale: 'finale',
  afterloop: 'house',
};

/**
 * Skryptowany beat `blackout` na 0.7 s przed wejściem w `trackReveal`.
 * Kolejkowany w driverze na podstawie znacznika następnego auto-advance —
 * nigdy jako zmiana stanu Reacta ani reducera.
 */
export const EVENT_ROOM_BLACKOUT_BEAT_LEAD_MS = 700;

/** Kolejność ręcznego cyklu `KeyL` (dev). `null` = zwolnienie override → powrót do mapowania faz. */
export const EVENT_ROOM_LIGHT_STATE_CYCLE: readonly (EventRoomLightStateId | null)[] = [
  ...EVENT_ROOM_LIGHT_STATE_IDS,
  null,
];

/**
 * Wygładzanie wykładnicze, niezależne od kroku klatki:
 *   alpha = 1 − exp(−dt / (tau · (target < level ? 0.6 : 1.0)))
 */
export function eventRoomLightAlpha(deltaSeconds: number, tau: number, isFalling: boolean): number {
  const effectiveTau = tau * (isFalling ? EVENT_ROOM_LIGHT_FALL_FACTOR : 1);
  if (effectiveTau <= 0) return 1;
  return 1 - Math.exp(-deltaSeconds / effectiveTau);
}

/** Jeden krok wygładzania jednego kanału. */
export function stepEventRoomLightLevel(
  level: number,
  target: number,
  tau: number,
  deltaSeconds: number,
): number {
  return level + (target - level) * eventRoomLightAlpha(deltaSeconds, tau, target < level);
}

/**
 * Krzywa progu luminancji bloomu: przy niskim poziomie kanału próg rośnie, więc
 * blackout nie rozmywa się w mgłę. Wartości tymczasowe (Etap 8).
 */
export function eventRoomBloomThreshold(level: number, base: number): number {
  const normalized = Math.min(Math.max(level, 0), 1);
  return base + (1 - normalized) * 0.1;
}

/** Mnożnik koloru ekranu z dolnym clampem 0.06 — ekran ściemnia się razem z salą (D8). */
export function eventRoomScreenMultiplier(screenKeyLevel: number): number {
  const { multiplier, minMultiplier } = EVENT_ROOM_LIGHT_BASES.screen;
  return Math.max(screenKeyLevel * multiplier, minMultiplier);
}

/** Kopia poziomów startowych — rig zaczyna w stanie `house`, bez fade-in z zera. */
export function createEventRoomLightLevels(
  stateId: EventRoomLightStateId = 'house',
): EventRoomLightLevels {
  return { ...EVENT_ROOM_LIGHT_STATES[stateId] };
}
