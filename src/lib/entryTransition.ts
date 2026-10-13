export type EntryPhase = 'idle' | 'preparing' | 'approaching' | 'opening' | 'entering' | 'complete' | 'error';

export const ENTRY = { x: 4, z: 10, width: 3.8, doorWidth: 3.6, height: 4.45, fov: 52 } as const;
export const ENTRY_TIMING = { approaching: 1000, opening: 1100, entering: 800, timeout: 25000 } as const;
export const entryEase = (t: number) => { const p = Math.max(0, Math.min(1, t)); return p * p * (3 - 2 * p); };

export function entryImageSource(portrait: boolean) {
  return portrait
    ? { w: 941, h: 1672, x: 416, y: 554, left: 138, right: 679, top: 175, bottom: 933, url: '/Entry%20screen%20IMG/clean-v1/entry-mobile-clean-v1.webp' }
    : { w: 1672, h: 941, x: 376, y: 460, left: 110, right: 638, top: 123, bottom: 797, url: '/Entry%20screen%20IMG/clean-v1/entry-desktop-clean-v1.webp' };
}

/** Zoom about the seam, retaining its horizontal screen position through the 2D/3D handoff. */
export function entryImageFraming(width: number, height: number) {
  const source = entryImageSource(height > width);
  const cover = Math.max(width / source.w, height / source.h);
  const cx = width / 2 + (source.x - source.w / 2) * cover;
  const cy = height / 2 + (source.y - source.h / 2) * cover;
  const doorH = source.bottom - source.top;
  const scale = Math.max(1, height * 0.94 / (doorH * cover));
  const scaleX = scale * (ENTRY.doorWidth / ENTRY.height) / ((source.right - source.left) / doorH);
  const doorPixels = doorH * cover * scale;
  return {
    source, cx, cy, scale, scaleX, doorPixels,
    origin: `${cx}px ${cy}px`,
    transform: `translate3d(0px, ${height / 2 - cy}px, 0) scale(${scaleX}, ${scale})`,
    viewOffsetX: width / 2 - cx,
    distance: ENTRY.height * height / (doorPixels * 2 * Math.tan(ENTRY.fov * Math.PI / 360)),
  };
}

export function entryImageTransform(width: number, height: number) {
  return entryImageFraming(width, height).transform;
}

export function entryPhaseAfter(phase: EntryPhase, elapsed: number, reducedMotion: boolean): EntryPhase {
  if (reducedMotion && ['approaching', 'opening', 'entering'].includes(phase)) return 'complete';
  if (phase === 'approaching' && elapsed >= ENTRY_TIMING.approaching) return 'opening';
  if (phase === 'opening' && elapsed >= ENTRY_TIMING.opening) return 'entering';
  if (phase === 'entering' && elapsed >= ENTRY_TIMING.entering) return 'complete';
  return phase;
}
