/**
 * One music reading for the whole Creator Room: the lighting provider reads the analyser once
 * (30 Hz, dB) and every consumer — LEDs, booth light, the face and Lucky — shares its levels and beats.
 */

/** A beat is a rise of the kick band this far above its recent trough (0.05 = 3.5 dB on the dB/70 scale). */
export const BEAT_RISE = 0.05;
/**
 * Hard floor between beats, whatever the tempo or double kicks: at most 2 per second,
 * below the 3 flashes per second photosensitivity threshold for the light hits they drive.
 */
export const BEAT_MIN_INTERVAL = 0.5;

/**
 * Mean level of analyser bins [start, end) from dB values: (dB + 100) / 70, the byte scale of the
 * default -100..-30 dB range, but not clamped at the top, so loud masters keep their kicks.
 * Bins missing from a short buffer count as silence.
 */
export function bandLevelFromDecibels(decibels: ArrayLike<number>, start: number, end: number) {
  if (end <= start) return 0;
  let sum = 0;
  for (let bin = start; bin < end; bin++) {
    const value = bin < decibels.length ? decibels[bin] : -100;
    sum += Number.isFinite(value) ? Math.max(-100, value) : -100;
  }
  return (sum / (end - start) + 100) / 70;
}

// FFT512 at 48 kHz: bins 1–3 ≈ 90–280 Hz (kick), 1–7 the low end, 4–17 ≈ 0.4–1.6 kHz (voice),
// so singing is not a beat.
export const kickLevelFromDecibels = (decibels: ArrayLike<number>) => bandLevelFromDecibels(decibels, 1, 4);
export const lowLevelFromDecibels = (decibels: ArrayLike<number>) => bandLevelFromDecibels(decibels, 1, 8);
export const voiceLevelFromDecibels = (decibels: ArrayLike<number>) => bandLevelFromDecibels(decibels, 4, 18);

export interface BeatTracker {
  time: number;
  lastBeat: number;
  /** Trough tracker: drops with the level at once, creeps up slowly; a beat is a rise above it. */
  bassFloor: number;
}

export function createBeatTracker(): BeatTracker {
  return { time: 0, lastBeat: -Infinity, bassFloor: 0 };
}

/**
 * Advances the tracker by `delta` seconds. `kick` is the kick-band level (see kickLevelFromDecibels;
 * ~0..1, may exceed 1), or null when nothing plays. Beats are onsets — a rise of BEAT_RISE above the
 * trough — so steady loud bass does not hide them. Capped by BEAT_MIN_INTERVAL. Returns true on a beat.
 */
export function stepBeatTracker(state: BeatTracker, kick: number | null, delta: number): boolean {
  const step = Number.isFinite(delta) ? Math.max(0, Math.min(delta, 0.1)) : 0;
  state.time += step;
  if (kick === null || !Number.isFinite(kick)) return false;
  const level = Math.max(0, Math.min(2, kick));
  if (level < state.bassFloor) state.bassFloor = level;
  else state.bassFloor += (level - state.bassFloor) * (1 - Math.exp(-step * 1.5));
  if (level > 0.15 && level - state.bassFloor > BEAT_RISE && state.time - state.lastBeat >= BEAT_MIN_INTERVAL) {
    state.lastBeat = state.time; state.bassFloor = level;
    return true;
  }
  return false;
}

/** What a consumer sees of the music on one of its own updates. */
export interface MusicFrame {
  kick: number;
  low: number;
  voice: number;
  /** A beat fired since this consumer's previous look. */
  beat: boolean;
}

/** The provider's latest reading; `beats` counts every beat so slower consumers never miss one. */
export interface SharedMusic {
  playing: boolean;
  kick: number;
  low: number;
  voice: number;
  beats: number;
}

export function createSharedMusic(): SharedMusic {
  return { playing: false, kick: 0, low: 0, voice: 0, beats: 0 };
}

/**
 * Copies the shared reading into `out` for a consumer that may update less often than the provider
 * (the face runs at 30 or 15 Hz). Each beat is reported once per consumer. Null while nothing plays.
 */
export function readSharedMusic(shared: SharedMusic, cursor: { beats: number }, out: MusicFrame): MusicFrame | null {
  const beat = shared.beats !== cursor.beats;
  cursor.beats = shared.beats;
  if (!shared.playing) return null;
  out.kick = shared.kick; out.low = shared.low; out.voice = shared.voice; out.beat = beat;
  return out;
}

export function createMusicFrame(): MusicFrame {
  return { kick: 0, low: 0, voice: 0, beat: false };
}
