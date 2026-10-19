export type RoomMood = 'warm' | 'focus' | 'night';

export interface CreatorLightingSettings {
  roomBrightness: number;
  ledBrightness: number;
  ledColor: string;
  boothBrightness: number;
  audioReactive: boolean;
  musicStrength: number;
  /** LED strips walk a colour palette on the beat instead of holding `ledColor`. */
  ledCycle: boolean;
}

export const CREATOR_LIGHTING_PRESETS: Record<RoomMood, CreatorLightingSettings> = {
  warm: { roomBrightness: 1, ledBrightness: 0.65, ledColor: '#ff9f45', boothBrightness: 0.7, audioReactive: true, musicStrength: 0.65, ledCycle: false },
  focus: { roomBrightness: 1, ledBrightness: 0.4, ledColor: '#a5d8ff', boothBrightness: 0.85, audioReactive: false, musicStrength: 0.4, ledCycle: false },
  night: { roomBrightness: 0, ledBrightness: 0.3, ledColor: '#bc8aff', boothBrightness: 0.35, audioReactive: true, musicStrength: 0.8, ledCycle: true },
};

export function patchCreatorLighting(current: CreatorLightingSettings, patch: Partial<CreatorLightingSettings>): CreatorLightingSettings {
  const next = { ...current, ...patch };
  for (const key of ['roomBrightness', 'ledBrightness', 'boothBrightness', 'musicStrength'] as const) {
    next[key] = Number.isFinite(next[key]) ? Math.max(0, Math.min(1, next[key])) : current[key];
  }
  if (!/^#[0-9a-f]{6}$/i.test(next.ledColor)) next.ledColor = current.ledColor;
  if (typeof next.ledCycle !== 'boolean') next.ledCycle = current.ledCycle;
  return next;
}

export function creatorLightingLevels(settings: CreatorLightingSettings, energy: number, playing: boolean) {
  const music = settings.audioReactive && playing ? Math.max(0, Math.min(1, energy)) * settings.musicStrength : 0;
  return {
    room: settings.roomBrightness,
    led: settings.ledBrightness * (1 + music * 2.2),
    booth: settings.boothBrightness * (1 + music * 0.45),
    screen: 0.18 + settings.roomBrightness * 0.82,
  };
}

/** Club palette the LED strips walk through when `ledCycle` is on. */
export const LED_PALETTE = ['#ff9f45', '#ff4f9a', '#9a5cff', '#3fc6ff', '#ff5a3c', '#ffd35a'] as const;
/** Without beats (reduced motion) the palette still drifts, one colour every few seconds. */
export const LED_CALM_STEP_SECONDS = 4;

export interface LedRhythm {
  time: number;
  lastStep: number;
  /** 0..1 light hit, set to 1 on a beat and decaying; drives the LED/booth pulse. */
  pulse: number;
  /** Continuous palette position (1 = one colour); eases towards `target`. */
  position: number;
  target: number;
}

export function createLedRhythm(): LedRhythm {
  return { time: 0, lastStep: -Infinity, pulse: 0, position: 0, target: 0 };
}

/**
 * Advances the LED response by `delta` seconds. `beat` comes from the shared tracker
 * (creatorMusic stepBeatTracker, already capped at 2 per second), or null when nothing plays.
 * Reduced motion never flashes. Returns true when a light hit fired this step.
 */
export function stepLedRhythm(state: LedRhythm, beat: boolean | null, delta: number, reducedMotion = false): boolean {
  const step = Number.isFinite(delta) ? Math.max(0, Math.min(delta, 0.1)) : 0;
  state.time += step;
  state.pulse *= Math.exp(-step * 5);
  let hit = false;
  if (beat && !reducedMotion) {
    state.lastStep = state.time; state.pulse = 1; state.target += 1; hit = true;
  } else if (beat !== null && reducedMotion && state.time - state.lastStep >= LED_CALM_STEP_SECONDS) {
    state.lastStep = state.time; state.target += 1;
  }
  // A colour change glides over ~0.3 s (reduced: ~1.5 s), so a step is never a hard cut.
  state.position += (state.target - state.position) * (1 - Math.exp(-step * (reducedMotion ? 2 : 10)));
  return hit;
}

/** Palette colour at a continuous position (wraps), blended linearly in sRGB hex space. */
export function ledPaletteColor(position: number, out: { r: number; g: number; b: number }) {
  const count = LED_PALETTE.length;
  const p = ((Number.isFinite(position) ? position : 0) % count + count) % count;
  const i = Math.floor(p), t = p - i;
  const a = parseInt(LED_PALETTE[i].slice(1), 16), b = parseInt(LED_PALETTE[(i + 1) % count].slice(1), 16);
  out.r = (((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t) / 255;
  out.g = (((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t) / 255;
  out.b = ((a & 255) * (1 - t) + (b & 255) * t) / 255;
  return out;
}
