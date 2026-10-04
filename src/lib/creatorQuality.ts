const steps = [0.75, 1, 1.25, 1.5];

/** A caller supplies sustained windows and a cooldown, never an individual slow frame. */
export function nextCreatorDpr(current: number, max: number, frameMs: number, moving: boolean) {
  const index = Math.max(0, steps.findIndex(step => step >= current));
  let next = current;
  if (frameMs > 36) next = steps[Math.max(0, index - 1)];
  else if (frameMs > 23 && current > 1) next = 1;
  else if (moving && current > 1.25) next = 1.25;
  else if (frameMs < 19) next = steps[Math.min(steps.length - 1, index + 1)];
  return Math.min(max, moving ? Math.min(next, 1.25) : next);
}
