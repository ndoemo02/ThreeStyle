/** Lucky, the Creator Room host behind the booth glass. Body motion only; the face uses `creatorFace`. */
export const luckyModelUrl = (mobile: boolean) => `/models/lucky/${mobile ? 'mobile' : 'desktop'}/lucky.glb`;

/** Booth-local placement (booth group space): behind the microphone, facing the window. */
export const LUCKY_BOOTH_POSITION: [number, number, number] = [1.75, 0, -1.4];
export const LUCKY_BOOTH_ROTATION_Y = -0.18;
/** The booth and its microphone are oversized; at 1.25× (≈2.3 m) his face sits at the room's eye height (2.05 m). */
export const LUCKY_SCALE = 1.25;
export const LUCKY_GREETING_SECONDS = 2.6;
/** Greets once the camera is this close (metres) and the booth is in view. */
export const LUCKY_GREETING_DISTANCE = 9;

export interface LuckyPose {
  headPitch: number;
  headYaw: number;
  neckPitch: number;
  spinePitch: number;
  spineRoll: number;
  chestPitch: number;
}

export function neutralLuckyPose(): LuckyPose {
  return { headPitch: 0, headYaw: 0, neckPitch: 0, spinePitch: 0, spineRoll: 0, chestPitch: 0 };
}

/** 0 → 1 → 0 over the greeting with a short hold at the bottom of the nod. */
export function luckyGreetingWeight(elapsed: number) {
  if (!Number.isFinite(elapsed) || elapsed <= 0 || elapsed >= LUCKY_GREETING_SECONDS) return 0;
  const t = elapsed / LUCKY_GREETING_SECONDS;
  const rise = Math.min(1, t / 0.35), fall = Math.min(1, (1 - t) / 0.4);
  const ease = (x: number) => x * x * (3 - 2 * x);
  return ease(Math.min(rise, fall));
}

/**
 * Hat-tip greeting (head and neck nod, slight bow), calm breathing and look-around while idle,
 * a groove sway while music plays plus the beat nod from the face director (0..1).
 * Reduced motion halves the greeting and drops sway and nods.
 */
export function luckyBodyPose(time: number, greetingElapsed: number, beatNod: number, playing: boolean, reducedMotion = false): LuckyPose {
  const pose = neutralLuckyPose();
  const t = Number.isFinite(time) ? time : 0;
  const greet = luckyGreetingWeight(greetingElapsed) * (reducedMotion ? 0.5 : 1);
  pose.headPitch += greet * 0.3;
  pose.neckPitch += greet * 0.1;
  pose.spinePitch += greet * 0.08;
  pose.chestPitch += Math.sin(t * 1.6) * 0.012;
  if (!reducedMotion) {
    pose.headYaw += Math.sin(t * 0.37) * 0.06 * (1 - greet);
    if (playing) {
      pose.spineRoll += Math.sin(t * 2.1) * 0.03;
      pose.headPitch += (Number.isFinite(beatNod) ? Math.max(0, Math.min(1, beatNod)) : 0) * 0.12;
    }
  }
  return pose;
}
