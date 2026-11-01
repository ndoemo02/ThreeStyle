/**
 * Spectrum bars for the Creator Room screen, fed from the shared dB reading (see creatorMusic).
 * Bands are log-spaced so the bars spread over bass, voice and air instead of crowding the low end.
 */

export const VISUALIZER_BARS = 28;
/** Paused tracks leave the bars standing low; with nothing selected they fall to zero. */
export const VISUALIZER_REST = 0.06;
/** dB at the bottom and top of a bar, after the tilt below. */
const FLOOR_DB = -80;
const CEILING_DB = -24;
/** Music falls off towards the highs; this much per octave above the first band keeps the right half alive. */
const TILT_DB_PER_OCTAVE = 3;
/** Highest bin used (≈16 kHz at 48 kHz, FFT512); above it there is little but noise. */
const TOP_BIN = 171;

/** Band edges [edges[i], edges[i + 1]) over bins 1..TOP_BIN; each band has at least one bin. */
export function visualizerBandEdges(bins: number, bars = VISUALIZER_BARS) {
  const top = Math.max(bars + 1, Math.min(TOP_BIN, Math.floor(bins)));
  const edges = new Uint16Array(bars + 1);
  edges[0] = 1;
  for (let i = 1; i <= bars; i++) {
    const log = Math.round(Math.pow(top, i / bars));
    // Keep room for one bin per remaining band.
    edges[i] = Math.min(top - (bars - i), Math.max(edges[i - 1] + 1, log));
  }
  return edges;
}

/** Bar heights 0..1 for one spectrum reading. Missing or non-finite bins count as silence. */
export function visualizerTargets(decibels: ArrayLike<number>, edges: ArrayLike<number>, out: Float32Array) {
  const firstCentre = Math.sqrt(edges[0] * edges[1]);
  for (let bar = 0; bar < out.length; bar++) {
    const start = edges[bar], end = edges[bar + 1];
    let sum = 0;
    for (let bin = start; bin < end; bin++) {
      const value = bin < decibels.length ? decibels[bin] : -100;
      sum += Number.isFinite(value) ? Math.max(-100, value) : -100;
    }
    const mean = end > start ? sum / (end - start) : -100;
    // -100 dB is the analyser's silence; the tilt must not lift it into a visible bar.
    if (mean <= -99.9) { out[bar] = 0; continue; }
    const tilt = TILT_DB_PER_OCTAVE * Math.log2(Math.sqrt(start * end) / firstCentre);
    out[bar] = Math.max(0, Math.min(1, (mean + tilt - FLOOR_DB) / (CEILING_DB - FLOOR_DB)));
  }
  return out;
}

export interface VisualizerState {
  levels: Float32Array;
  /** Peak caps: hold briefly at the top of a bar, then fall. */
  peaks: Float32Array;
  hold: Float32Array;
}

export function createVisualizer(bars = VISUALIZER_BARS): VisualizerState {
  return { levels: new Float32Array(bars), peaks: new Float32Array(bars), hold: new Float32Array(bars) };
}

const PEAK_HOLD = 0.4;
const PEAK_FALL = 0.8;

/**
 * Moves the bars towards `targets` (fast up, slower down), or towards `rest` when nothing plays.
 * Reduced motion smooths both ways. Returns whether anything is still moving, so a paused screen
 * can stop redrawing once the bars have settled.
 */
export function stepVisualizer(state: VisualizerState, targets: ArrayLike<number> | null, delta: number, rest = 0, reduced = false) {
  const step = Number.isFinite(delta) ? Math.max(0, Math.min(delta, 0.1)) : 0;
  const up = 1 - Math.exp(-step * (reduced ? 6 : 28));
  const down = 1 - Math.exp(-step * (reduced ? 3 : 7));
  const floor = Number.isFinite(rest) ? Math.max(0, Math.min(1, rest)) : 0;
  let moving = false;
  for (let bar = 0; bar < state.levels.length; bar++) {
    const raw = targets ? targets[bar] : floor;
    const target = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : floor;
    const level = state.levels[bar];
    const next = level + (target - level) * (target > level ? up : down);
    state.levels[bar] = Math.abs(next - target) < 0.002 ? target : next;
    if (state.levels[bar] >= state.peaks[bar]) { state.peaks[bar] = state.levels[bar]; state.hold[bar] = PEAK_HOLD; }
    else if (state.hold[bar] > 0) state.hold[bar] = Math.max(0, state.hold[bar] - step);
    else state.peaks[bar] = Math.max(state.levels[bar], state.peaks[bar] - PEAK_FALL * step);
    // Float32 storage: compare with a tolerance, not exactly.
    if (Math.abs(state.levels[bar] - target) > 1e-4 || state.peaks[bar] !== state.levels[bar]) moving = true;
  }
  return moving;
}
