export const CREATOR_FACE_MODEL = '/models/optimized/facecap.glb';
export const FACE_MORPHS = ['jawOpen', 'eyeBlink_L', 'eyeBlink_R', 'browDown_L', 'browDown_R'] as const;
export type FacePose = [number, number, number, number, number];

function band(data: Uint8Array, start: number, end: number) {
  const stop = Math.min(end, data.length);
  if (stop <= start) return 0;
  let sum = 0;
  for (let i = start; i < stop; i++) sum += data[i];
  return sum / ((stop - start) * 255);
}

/** Audio energy drives expression, not phoneme/lip synchronization. Silence is neutral. */
export function faceAudioTargets(data: Uint8Array | null, reducedMotion = false): FacePose {
  if (!data) return [0, 0, 0, 0, 0];
  const low = band(data, 1, 8), voice = band(data, 4, 18), high = band(data, 18, 40);
  const jaw = Math.min(0.8, Math.max(0, low * 0.35 + voice * 0.6 - 0.025));
  const blink = reducedMotion ? 0 : Math.max(0, high - 0.12) * 0.35;
  const brow = reducedMotion ? 0 : voice * 0.25;
  return [jaw * (reducedMotion ? 0.55 : 1), blink, blink, brow, brow];
}

export function smoothFacePose(current: FacePose, target: FacePose, delta: number) {
  if (!Number.isFinite(delta) || delta <= 0) return;
  for (let i = 0; i < current.length; i++) {
    const alpha = 1 - Math.exp(-Math.min(delta, 0.1) * (target[i] > current[i] ? 12 : 7));
    current[i] += (target[i] - current[i]) * alpha;
  }
}
