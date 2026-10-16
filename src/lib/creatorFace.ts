export const CREATOR_FACE_MODEL = '/models/optimized/facecap.glb';

/** ARKit channels used by the expressions; the remaining facecap layers never reach the GPU. */
export const FACE_MORPHS = [
  'jawOpen', 'eyeBlink_L', 'eyeBlink_R', 'browDown_L', 'browDown_R',
  'browInnerUp', 'browOuterUp_L', 'browOuterUp_R', 'eyeSquint_L', 'eyeSquint_R', 'eyeWide_L', 'eyeWide_R',
  'cheekSquint_L', 'cheekSquint_R', 'cheekPuff', 'noseSneer_L', 'noseSneer_R',
  'mouthSmile_L', 'mouthSmile_R', 'mouthFrown_L', 'mouthFrown_R', 'mouthPucker', 'mouthFunnel',
  'mouthLeft', 'mouthRight', 'mouthStretch_L', 'mouthStretch_R', 'mouthPress_L', 'mouthPress_R',
] as const;
export type FaceMorph = typeof FACE_MORPHS[number];
export type FacePose = number[];
type Expression = Partial<Record<FaceMorph, number>>;

export const FACE_EXPRESSIONS = {
  smile: { mouthSmile_L: 0.8, mouthSmile_R: 0.8, cheekSquint_L: 0.35, cheekSquint_R: 0.35, eyeSquint_L: 0.2, eyeSquint_R: 0.2 },
  laugh: { mouthSmile_L: 1, mouthSmile_R: 1, jawOpen: 0.45, cheekSquint_L: 0.7, cheekSquint_R: 0.7, eyeSquint_L: 0.6, eyeSquint_R: 0.6, browInnerUp: 0.2 },
  angry: { browDown_L: 1, browDown_R: 1, noseSneer_L: 1, noseSneer_R: 1, mouthFrown_L: 1, mouthFrown_R: 1, eyeSquint_L: 0.8, eyeSquint_R: 0.8, cheekSquint_L: 0.4, cheekSquint_R: 0.4, mouthPress_L: 0.6, mouthPress_R: 0.6, mouthStretch_L: 0.3, mouthStretch_R: 0.3 },
  squint: { eyeSquint_L: 1, eyeSquint_R: 1, eyeBlink_L: 0.55, eyeBlink_R: 0.55, cheekSquint_L: 1, cheekSquint_R: 1, browDown_L: 0.6, browDown_R: 0.6, noseSneer_L: 0.4, noseSneer_R: 0.4, mouthPress_L: 0.5, mouthPress_R: 0.5 },
  grimace: { mouthStretch_L: 1, mouthStretch_R: 0.8, mouthLeft: 0.7, noseSneer_L: 1, noseSneer_R: 0.5, browDown_L: 0.9, browInnerUp: 0.7, eyeSquint_L: 0.8, cheekSquint_L: 0.6, mouthFrown_L: 0.5, mouthFrown_R: 0.8, jawOpen: 0.15 },
  surprise: { browInnerUp: 0.9, browOuterUp_L: 0.9, browOuterUp_R: 0.9, eyeWide_L: 0.8, eyeWide_R: 0.8, jawOpen: 0.4, mouthFunnel: 0.5 },
  smirk: { mouthSmile_R: 1, mouthRight: 0.5, cheekSquint_R: 0.7, eyeSquint_R: 0.5, browOuterUp_L: 0.7, browDown_R: 0.3 },
  pucker: { mouthPucker: 1, mouthFunnel: 0.4, cheekPuff: 0.8, browInnerUp: 0.5, browOuterUp_L: 0.3, browOuterUp_R: 0.3, eyeWide_L: 0.2, eyeWide_R: 0.2 },
} satisfies Record<string, Expression>;
export type FaceExpression = keyof typeof FACE_EXPRESSIONS;

// Every face stays possible; loudness only shifts the odds towards big (hot) or subtle (calm) ones.
const HOT: FaceExpression[] = ['laugh', 'angry', 'surprise', 'grimace'];
const CALM: FaceExpression[] = ['smile', 'smirk', 'squint', 'pucker'];

function pickExpression(current: FaceExpression | null, loudness: number, random: () => number): FaceExpression {
  const level = Math.min(1, Math.max(0, (loudness - 0.1) / 0.5));
  const choices = [...HOT.map(name => [name, 0.15 + level] as const), ...CALM.map(name => [name, 1.15 - level] as const)]
    .filter(([name]) => name !== current);
  let ticket = random() * choices.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [name, weight] of choices) if ((ticket -= weight) < 0) return name;
  return choices[choices.length - 1][0];
}
const morphIndex = Object.fromEntries(FACE_MORPHS.map((name, index) => [name, index])) as Record<FaceMorph, number>;

export function neutralFacePose(): FacePose { return new Array(FACE_MORPHS.length).fill(0); }

export function faceExpressionPose(expression: FaceExpression, intensity = 1): FacePose {
  const pose = neutralFacePose();
  for (const [name, weight] of Object.entries(FACE_EXPRESSIONS[expression]) as [FaceMorph, number][]) pose[morphIndex[name]] = Math.min(1, weight * intensity);
  return pose;
}

function band(data: Uint8Array, start: number, end: number) {
  const stop = Math.min(end, data.length);
  if (stop <= start) return 0;
  let sum = 0;
  for (let i = start; i < stop; i++) sum += data[i];
  return sum / ((stop - start) * 255);
}

export interface FaceDirector {
  expression: FaceExpression | null;
  sinceSwitch: number;
  bassAverage: number;
  blinkIn: number;
  blinkLeft: number;
  /** Decaying head-nod impulse fired on detected beats, 0..1. */
  nod: number;
}

export function createFaceDirector(random: () => number = Math.random): FaceDirector {
  return { expression: null, sinceSwitch: 0, bassAverage: 0, blinkIn: 1.5 + random() * 2, blinkLeft: 0, nod: 0 };
}

/**
 * Changes the face on the beat, like the original Face Cap performance: a new
 * expression at most every ~0.45 s (reduced motion: 1.6 s) and at the latest
 * after ~1.3 s, chosen by loudness and never repeated back to back. The jaw also
 * follows the vocal band. This is energy/rhythm driven, not phoneme lip sync.
 * Silence or pause returns to neutral.
 */
export function directFace(state: FaceDirector, data: Uint8Array | null, delta: number, reducedMotion = false, random: () => number = Math.random): FacePose {
  const step = Number.isFinite(delta) ? Math.min(Math.max(delta, 0), 0.1) : 0;
  state.nod = Math.max(0, state.nod - step * 4);
  if (!data) {
    state.expression = null; state.sinceSwitch = 0; state.bassAverage = 0; state.blinkLeft = 0; state.nod = 0;
    return neutralFacePose();
  }
  // FFT512 bins 1–3 ≈ 90–280 Hz: the kick, kept apart from the vocal band so singing is not a beat.
  const kick = band(data, 1, 4), low = band(data, 1, 8), voice = band(data, 4, 18);
  const energy = Math.max(low, voice);
  const beat = kick > 0.15 && kick - state.bassAverage > 0.06;
  state.bassAverage += (kick - state.bassAverage) * (1 - Math.exp(-step * 4));
  state.sinceSwitch += step;

  const minHold = reducedMotion ? 1.6 : 0.45, maxHold = reducedMotion ? 3.2 : 1.3;
  if (energy < 0.03) { state.expression = null; state.sinceSwitch = 0; }
  else if (!state.expression || (beat && state.sinceSwitch >= minHold) || state.sinceSwitch >= maxHold) {
    state.expression = pickExpression(state.expression, Math.max(state.bassAverage, voice), random);
    state.sinceSwitch = 0;
    if (beat && !reducedMotion) state.nod = 1;
  }

  const intensity = (reducedMotion ? 0.5 : 1) * (0.65 + 0.35 * Math.min(1, energy * 1.6));
  const pose = state.expression ? faceExpressionPose(state.expression, intensity) : neutralFacePose();
  const jaw = Math.min(0.6, Math.max(0, voice * 0.55 + low * 0.2 - 0.02)) * (reducedMotion ? 0.55 : 1);
  pose[morphIndex.jawOpen] = Math.min(1, Math.max(pose[morphIndex.jawOpen], jaw));

  state.blinkIn -= step;
  if (state.blinkIn <= 0) { state.blinkLeft = 0.15; state.blinkIn = 2.2 + random() * 3; }
  if (state.blinkLeft > 0) {
    state.blinkLeft -= step;
    pose[morphIndex.eyeBlink_L] = pose[morphIndex.eyeBlink_R] = 1;
  }
  return pose;
}

export function smoothFacePose(current: FacePose, target: FacePose, delta: number) {
  if (!Number.isFinite(delta) || delta <= 0) return;
  for (let i = 0; i < current.length; i++) {
    const alpha = 1 - Math.exp(-Math.min(delta, 0.1) * (target[i] > current[i] ? 12 : 7));
    current[i] += (target[i] - current[i]) * alpha;
  }
}
