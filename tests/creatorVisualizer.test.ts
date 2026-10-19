import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VISUALIZER_BARS, VISUALIZER_REST, createVisualizer, stepVisualizer, visualizerBandEdges, visualizerTargets } from '../src/lib/creatorVisualizer.ts';

test('bands skip the DC bin, grow towards the highs and fit short spectra', () => {
  const edges = visualizerBandEdges(256);
  assert.equal(edges.length, VISUALIZER_BARS + 1);
  assert.equal(edges[0], 1);
  for (let i = 1; i < edges.length; i++) assert.ok(edges[i] > edges[i - 1], `band ${i - 1} is empty`);
  assert.ok(edges[VISUALIZER_BARS] - edges[VISUALIZER_BARS - 1] > edges[1] - edges[0], 'high bands are wider');
  assert.ok(edges[VISUALIZER_BARS] <= 256);
  const short = visualizerBandEdges(16, 8);
  for (let i = 1; i < short.length; i++) assert.ok(short[i] > short[i - 1]);
});

test('silence and broken input give empty bars; a loud master does not peg every bar', () => {
  const edges = visualizerBandEdges(256), out = new Float32Array(VISUALIZER_BARS);
  assert.ok(visualizerTargets(new Float32Array(256).fill(-Infinity), edges, out).every(v => v === 0));
  assert.ok(visualizerTargets(new Float32Array(256).fill(NaN), edges, out).every(v => v === 0));
  assert.ok(visualizerTargets([], edges, out).every(v => v === 0));
  // A loud, bass-heavy master: -10 dB in the lows falling 6 dB per octave.
  const loud = Float32Array.from({ length: 256 }, (_, bin) => -10 - 6 * Math.log2(Math.max(1, bin)));
  visualizerTargets(loud, edges, out);
  assert.equal(out[0], 1, 'the bass bar is full');
  assert.ok(out[VISUALIZER_BARS - 1] < 1, 'the air bar is not');
  assert.ok(out.every(v => v >= 0 && v <= 1));
});

test('bars jump up, fall slower, hold their peaks and settle at the rest level', () => {
  const state = createVisualizer(4), full = [1, 1, 1, 1];
  stepVisualizer(state, full, 1 / 30);
  assert.ok(state.levels[0] > 0.5, 'a hit shows within one frame');
  for (let i = 0; i < 30; i++) stepVisualizer(state, full, 1 / 30);
  assert.equal(state.levels[0], 1);
  stepVisualizer(state, null, 1 / 30);
  assert.ok(state.levels[0] > 0.7, 'release is slower than attack');
  assert.equal(state.peaks[0], 1, 'the peak holds');
  let moving = true;
  for (let i = 0; i < 300 && moving; i++) moving = stepVisualizer(state, null, 1 / 30, VISUALIZER_REST);
  assert.equal(moving, false, 'settles, so a paused screen can stop redrawing');
  assert.ok(state.levels.every(v => v === Math.fround(VISUALIZER_REST)) && state.peaks.every(v => v === Math.fround(VISUALIZER_REST)));
});

test('reduced motion is smoother; garbage input is safe', () => {
  const quick = createVisualizer(1), calm = createVisualizer(1);
  stepVisualizer(quick, [1], 1 / 30);
  stepVisualizer(calm, [1], 1 / 30, 0, true);
  assert.ok(calm.levels[0] < quick.levels[0]);
  const state = createVisualizer(2);
  stepVisualizer(state, [NaN, 5], NaN, NaN);
  assert.deepEqual(Array.from(state.levels), [0, 0], 'a broken step moves nothing');
  stepVisualizer(state, [NaN, 5], 1 / 30, NaN);
  assert.equal(state.levels[0], 0);
  assert.ok(state.levels[1] > 0 && state.levels[1] <= 1);
});
