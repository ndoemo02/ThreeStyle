export type InteractionCandidate = {
  id: string;
  enabled: boolean;
  distance: number;
  maxDistance: number;
  priority: number;
  occluded?: boolean;
};

export function isInteractionKey(event: { code: string; key: string }) {
  return event.code === 'KeyE' || event.key.toLowerCase() === 'e';
}

export function resolveInteraction<T extends InteractionCandidate>(
  input: { repeat: boolean; editing: boolean; hudOpen: boolean },
  candidates: readonly T[],
): T | null {
  if (input.repeat || input.editing || input.hudOpen) return null;
  let best: T | null = null;
  for (const candidate of candidates) {
    if (!candidate.enabled || candidate.occluded || !Number.isFinite(candidate.distance)
      || candidate.distance < 0 || candidate.distance > candidate.maxDistance) continue;
    if (!best || candidate.priority > best.priority
      || (candidate.priority === best.priority && candidate.distance < best.distance)) best = candidate;
  }
  return best;
}

export function performInteraction(
  target: (InteractionCandidate & { activate: () => boolean; releasePointer: boolean }) | null,
  releasePointer: () => void,
  releaseWithoutTarget = false,
) {
  if (!target || !target.activate()) {
    if (!releaseWithoutTarget) return false;
    releasePointer();
    return true;
  }
  if (target.releasePointer) releasePointer();
  return true;
}

type TapPoint = { pointerId: number; clientX: number; clientY: number };
export function isInteractionTap(start: TapPoint | null, end: TapPoint) {
  return !!start && start.pointerId === end.pointerId
    && Math.hypot(end.clientX - start.clientX, end.clientY - start.clientY) <= 8;
}
