import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveInteraction, performInteraction, isInteractionKey, isInteractionTap } from '../src/3d/systems/sceneInteractionPolicy.ts';

const input = { repeat: false, editing: false, hudOpen: false };
const door = { id: 'door', enabled: true, distance: 4, maxDistance: 4.5, priority: 0 };

test('E without a target does not release pointer lock', () => {
  let releases = 0;
  assert.equal(performInteraction(resolveInteraction(input, []), () => releases++), false);
  assert.equal(releases, 0);
});
test('crosshair and cursor hits obey the same range and active-state policy', () => {
  assert.equal(resolveInteraction(input, [door])?.id, 'door');
  for (const rejected of [{ ...door, enabled: false }, { ...door, distance: 4.51 }, { ...door, occluded: true }]) {
    assert.equal(resolveInteraction(input, [rejected]), null);
  }
});
test('the closest eligible target wins; a valid elevator zone takes priority', () => {
  const device = { ...door, id: 'device', distance: 1, maxDistance: 3 };
  assert.equal(resolveInteraction(input, [door, device])?.id, 'device');
  assert.equal(resolveInteraction(input, [device, { ...door, id: 'elevator', priority: 10 }])?.id, 'elevator');
  assert.equal(resolveInteraction(input, [device, { ...door, id: 'elevator', priority: 10, enabled: false }])?.id, 'device');
});
test('repeated E, typing, and an open HUD block world interactions', () => {
  for (const blocked of [{ ...input, repeat: true }, { ...input, editing: true }, { ...input, hudOpen: true }]) {
    assert.equal(resolveInteraction(blocked, [door]), null);
  }
});
test('rejected cooldown/trigger does not release or try a second target', () => {
  let calls = 0, releases = 0;
  const target = { ...door, activate: () => { calls++; return false; }, releasePointer: true };
  assert.equal(performInteraction(target, () => releases++), false);
  assert.equal(calls, 1);
  assert.equal(releases, 0);
});
test('accepted panel opens before pointer lock is released', () => {
  const sequence: string[] = [];
  const target = { ...door, activate: () => { sequence.push('open'); return true; }, releasePointer: true };
  assert.equal(performInteraction(target, () => sequence.push('release')), true);
  assert.deepEqual(sequence, ['open', 'release']);
});
test('accepted doors and elevator preserve pointer lock', () => {
  let releases = 0;
  assert.equal(performInteraction({ ...door, activate: () => true, releasePointer: false }, () => releases++), true);
  assert.equal(releases, 0);
});
test('invalid distances cannot become eligible targets', () => {
  for (const distance of [-1, NaN, Infinity]) assert.equal(resolveInteraction(input, [{ ...door, distance }]), null);
});
test('interaction key accepts E and rejects other keys', () => {
  assert.equal(isInteractionKey({ code: 'KeyE', key: 'e' }), true);
  assert.equal(isInteractionKey({ code: '', key: 'E' }), true);
  assert.equal(isInteractionKey({ code: 'KeyW', key: 'w' }), false);
});

test('touch accepts a short tap and rejects a drag, another finger, or missing start', () => {
  const start = { pointerId: 3, clientX: 200, clientY: 300 };
  assert.equal(isInteractionTap(start, { ...start, clientX: 204 }), true);
  assert.equal(isInteractionTap(start, { ...start, clientX: 220 }), false);
  assert.equal(isInteractionTap(start, { ...start, pointerId: 4 }), false);
  assert.equal(isInteractionTap(null, start), false);
});
