import test from 'node:test';
import assert from 'node:assert/strict';
import { entryImageTransform, entryImageFraming, entryPhaseAfter, entryEase, ENTRY, ENTRY_TIMING } from '../src/lib/entryTransition.ts';

test('loading and error never open the entry on a timer alone', () => {
  assert.equal(entryPhaseAfter('preparing', 100000, false), 'preparing');
  assert.equal(entryPhaseAfter('error', 100000, false), 'error');
  assert.equal(entryPhaseAfter('idle', 100000, false), 'idle');
});
test('the physical threshold opens symmetrically before crossing it', () => {
  assert(ENTRY.width > 3.5);
  assert.equal(entryPhaseAfter('approaching', ENTRY_TIMING.approaching - 1, false), 'approaching');
  assert.equal(entryPhaseAfter('approaching', ENTRY_TIMING.approaching, false), 'opening');
  assert.equal(entryPhaseAfter('opening', ENTRY_TIMING.opening, false), 'entering');
  assert.equal(entryPhaseAfter('entering', ENTRY_TIMING.entering, false), 'complete');
  assert.equal(entryEase(-1), 0); assert.equal(entryEase(2), 1); assert.equal(entryEase(0.5), 0.5);
});
test('reduced motion still waits for readiness, then skips spatial movement', () => {
  assert.equal(entryPhaseAfter('preparing', 100000, true), 'preparing');
  assert.equal(entryPhaseAfter('approaching', 0, true), 'complete');
});
test('zoom never translates the photographic doorway sideways', () => {
  for (const [width, height] of [[1440,900], [390,844], [844,390], [768,1024]]) {
    const tx = Number(entryImageTransform(width,height).match(/^translate3d\(([^p]+)px/)![1]);
    assert.equal(tx, 0, 'the seam must remain on its original horizontal axis during approach');
  }
});

test('photo and physical door share seam position, height and aspect at handoff', () => {
  for (const [width, height] of [[1440,900], [390,844], [844,390], [768,1024]]) {
    const frame = entryImageFraming(width,height);
    const photoWidth = (frame.source.right - frame.source.left) * Math.max(width/frame.source.w,height/frame.source.h) * frame.scaleX;
    assert.equal(width/2 - frame.viewOffsetX, frame.cx);
    assert(frame.scale >= 1, 'approach cannot zoom backwards');
    assert(Math.abs(photoWidth / frame.doorPixels - ENTRY.doorWidth / ENTRY.height) < 0.001);
    const projectedHeight = ENTRY.height * height / (2 * frame.distance * Math.tan(ENTRY.fov*Math.PI/360));
    assert(Math.abs(projectedHeight - frame.doorPixels) < 0.001);
  }
});
