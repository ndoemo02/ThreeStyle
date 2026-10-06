export const ELEVATOR_MIN_RIDE_MS = 2400;
export const ELEVATOR_LOAD_TIMEOUT_MS = 30000;
export type ElevatorRideStatus = 'riding' | 'waiting' | 'opening' | 'error';

export function elevatorDoorPosition(from: number, target: number, elapsedMs: number): number {
  const t = Math.max(0, Math.min(1, elapsedMs / 900));
  if (t === 1) return target;
  return from + (target - from) * t * t * (3 - 2 * t);
}

export function elevatorRideStatus(elapsedMs: number, ready: boolean, failed: boolean): ElevatorRideStatus {
  if (failed || (!ready && elapsedMs >= ELEVATOR_LOAD_TIMEOUT_MS)) return 'error';
  if (elapsedMs < ELEVATOR_MIN_RIDE_MS) return 'riding';
  return ready ? 'opening' : 'waiting';
}

/** Visible shaft marks rise when the cabin descends. Wrapping avoids long-session drift. */
export function elevatorShaftOffset(seconds: number, descending: boolean): number {
  const offset = (Math.max(0, seconds) * 2.4) % 0.8;
  return descending ? offset : -offset;
}
