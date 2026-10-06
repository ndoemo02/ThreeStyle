import test from 'node:test';
import assert from 'node:assert/strict';
import { elevatorRideStatus, elevatorShaftOffset, elevatorDoorPosition } from '../src/3d/world/elevators/elevatorRidePolicy.ts';

test('a warm destination still waits for the visible ride', () => {
  assert.equal(elevatorRideStatus(500, true, false), 'riding');
  assert.equal(elevatorRideStatus(2500, true, false), 'opening');
});

test('slow destination stays behind closed doors until ready', () => {
  assert.equal(elevatorRideStatus(5000, false, false), 'waiting');
  assert.equal(elevatorRideStatus(5000, true, false), 'opening');
});

test('failed or stalled destination exposes recovery instead of opening', () => {
  assert.equal(elevatorRideStatus(500, false, true), 'error');
  assert.equal(elevatorRideStatus(31000, false, false), 'error');
  assert.equal(elevatorRideStatus(31000, true, false), 'opening');
});

test('shaft moves upward for descent and reverses for ascent without unbounded drift', () => {
  assert.ok(elevatorShaftOffset(0.1, true) > elevatorShaftOffset(0, true));
  assert.ok(elevatorShaftOffset(0.1, false) < elevatorShaftOffset(0, false));
  for (const time of [0, 1, 50, 10000]) {
    assert.ok(Math.abs(elevatorShaftOffset(time, true)) < 0.8);
    assert.ok(Math.abs(elevatorShaftOffset(time, false)) < 0.8);
  }
});

test('door motion finishes on wall time even with sparse frames and never overshoots', () => {
  assert.equal(elevatorDoorPosition(1.95, 0.65, 1200), 0.65);
  assert.equal(elevatorDoorPosition(0.65, 1.95, 1200), 1.95);
  assert.equal(elevatorDoorPosition(1.95, 0.65, 0), 1.95);
  assert.ok(elevatorDoorPosition(1.95, 0.65, 450) > 0.65);
});