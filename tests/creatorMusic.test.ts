import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEAT_MIN_INTERVAL, bandLevelFromDecibels, createBeatTracker, createMusicFrame, createSharedMusic, readSharedMusic, stepBeatTracker } from '../src/lib/creatorMusic.ts';

test('band levels match the byte scale, survive short buffers and are not clipped at the top', () => {
  assert.equal(bandLevelFromDecibels(new Float32Array(256).fill(-65), 1, 4), 0.5);
  assert.equal(bandLevelFromDecibels([], 1, 4), 0);
  assert.ok(Math.abs(bandLevelFromDecibels([0, -30], 1, 4) - 1 / 3) < 1e-9, 'missing bins count as silence');
  assert.ok(bandLevelFromDecibels([0, -10, -10, -10], 1, 4) > 1);
  assert.equal(bandLevelFromDecibels([0, 0], 4, 4), 0);
});

test('the tracker ignores silence and invalid input and keeps the two-per-second cap', () => {
  const tracker = createBeatTracker();
  assert.equal(stepBeatTracker(tracker, null, 1 / 30), false);
  assert.equal(stepBeatTracker(tracker, NaN, NaN), false);
  assert.equal(stepBeatTracker(tracker, 0.1, 1 / 30), false);
  assert.equal(stepBeatTracker(tracker, 0.9, 1 / 30), true);
  stepBeatTracker(tracker, 0.1, 1 / 30);
  assert.equal(stepBeatTracker(tracker, 0.9, 1 / 30), false, 'a second kick within 0.5 s is not a beat');
  for (let t = 0; t < BEAT_MIN_INTERVAL; t += 1 / 30) stepBeatTracker(tracker, 0.1, 1 / 30);
  assert.equal(stepBeatTracker(tracker, 0.9, 1 / 30), true);
  assert.ok(Number.isFinite(tracker.bassFloor) && Number.isFinite(tracker.time));
});

test('every consumer sees each shared beat once, even when it updates less often', () => {
  const shared = createSharedMusic();
  const fast = { beats: 0 }, slow = { beats: 0 }, out = createMusicFrame();
  shared.playing = true; shared.kick = 0.8; shared.low = 0.7; shared.voice = 0.4;
  shared.beats++;
  assert.equal(readSharedMusic(shared, fast, out)?.beat, true);
  assert.equal(readSharedMusic(shared, fast, out)?.beat, false);
  shared.beats++;
  assert.equal(readSharedMusic(shared, fast, out)?.beat, true);
  const frame = readSharedMusic(shared, slow, out);
  assert.deepEqual(frame, { kick: 0.8, low: 0.7, voice: 0.4, beat: true });
  assert.equal(readSharedMusic(shared, slow, out)?.beat, false);
});

test('a paused reading is null and does not replay its beats on resume', () => {
  const shared = createSharedMusic(), cursor = { beats: 0 }, out = createMusicFrame();
  shared.beats = 3;
  assert.equal(readSharedMusic(shared, cursor, out), null);
  shared.playing = true;
  assert.equal(readSharedMusic(shared, cursor, out)?.beat, false);
});
