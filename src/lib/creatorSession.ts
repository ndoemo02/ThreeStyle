import type { PlaybackStatus } from './creatorMedia';

/**
 * Creator Room session: idle (not in the room, or nothing selected) → ready (a track is selected)
 * → live (music playing) → paused → ended. The playback status alone cannot tell ready from paused:
 * selecting a track publishes 'paused' before anything has played, so the previous state decides.
 */
export type CreatorSessionState = 'idle' | 'ready' | 'live' | 'paused' | 'ended';

export interface CreatorSessionInput {
  playback: PlaybackStatus;
  /** The AudioContext runs; 'playing' without it is still starting, like the lighting provider reads it. */
  audible: boolean;
  inRoom: boolean;
  /**
   * The track reached its end. Never true today: the HUD player loops, and that stays until the owner decides.
   * A non-looping element fires 'pause' before 'ended', so ended is reachable from paused as well as live.
   */
  ended: boolean;
}

export interface CreatorSession {
  state: CreatorSessionState;
  /** Counts real state changes, so a consumer updating less often never misses one (like the shared beat count). */
  changes: number;
}

const PLAYBACK = new Set<PlaybackStatus>(['idle', 'loading', 'playing', 'paused', 'error']);
const STATES = new Set<CreatorSessionState>(['idle', 'ready', 'live', 'paused', 'ended']);

export function createCreatorSession(): CreatorSession {
  return { state: 'idle', changes: 0 };
}

export function nextCreatorSessionState(previous: CreatorSessionState, input: CreatorSessionInput): CreatorSessionState {
  const state = STATES.has(previous) ? previous : 'idle';
  if (!PLAYBACK.has(input.playback)) return state;
  if (input.inRoom !== true || input.playback === 'idle') return 'idle';
  if (input.playback === 'playing' && input.audible === true) return 'live';
  if (input.ended === true) return 'ended';
  // A track that cannot play is still selected; the session waits for another one.
  if (input.playback === 'error') return 'ready';
  if (input.playback === 'paused') return state === 'live' || state === 'paused' ? 'paused' : 'ready';
  // Loading (also 'playing' before the audio runs) holds the state, so buffering mid-song never drops live.
  return state === 'idle' ? 'ready' : state;
}

/** Advances the session in place; returns whether the state changed. */
export function stepCreatorSession(session: CreatorSession, input: CreatorSessionInput) {
  const next = nextCreatorSessionState(session.state, input);
  if (next === session.state) return false;
  session.state = next;
  session.changes++;
  return true;
}
