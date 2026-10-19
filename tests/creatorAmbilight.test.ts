import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AMBILIGHT_TINT, ambilightGlow, ambilightTint, ambilightUvTransform, ambilightZones, averageColor } from '../src/lib/creatorAmbilight.ts';

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test('the average colour ignores alpha and survives empty or ragged input', () => {
  const out = { r: 0, g: 0, b: 0 };
  averageColor([255, 0, 0, 0, 0, 0, 255, 255], out);
  near(out.r, 0.5); near(out.g, 0); near(out.b, 0.5);
  assert.deepEqual(averageColor([], out), { r: 0, g: 0, b: 0 });
  assert.deepEqual(averageColor([255, 255, 255], out), { r: 0, g: 0, b: 0 }, 'an incomplete pixel is skipped');
});

test('the light takes the picture hue at full brightness, and keeps the room colour on black', () => {
  const room = { r: 1, g: 0.9, b: 0.8 }, out = { r: 0, g: 0, b: 0 };
  ambilightTint({ r: 0.1, g: 0, b: 0.2 }, room, out);
  near(out.b, room.b + (1 - room.b) * AMBILIGHT_TINT);
  near(out.r, room.r + (0.5 - room.r) * AMBILIGHT_TINT);
  near(out.g, room.g * (1 - AMBILIGHT_TINT));
  assert.deepEqual(ambilightTint({ r: 0.01, g: 0.02, b: 0 }, room, out), room, 'a dark picture does not tint');
  assert.deepEqual(ambilightTint({ r: NaN, g: -1, b: Infinity }, room, out), room);
});

test('the screen maps onto 0..1 of the glow plane, so its edges spill outwards', () => {
  const screen = { width: 3.2, height: 1.8 };
  const { repeat, offset } = ambilightUvTransform({ width: 6.4, height: 3.6 }, screen);
  // Screen-uv of a glow-plane uv: uv * repeat + offset.
  near(0.25 * repeat.x + offset.x, 0);
  near(0.75 * repeat.x + offset.x, 1);
  near(0.25 * repeat.y + offset.y, 0);
  const shifted = ambilightUvTransform({ width: 6.4, height: 3.6 }, screen, { x: 0, y: -0.9 });
  near(0.5 * shifted.repeat.y + shifted.offset.y, 0);
  near((0.5 + 0.9 / 3.6) * shifted.repeat.y + shifted.offset.y, 0.5);
});

test('zones average their part of the picture, top row first', () => {
  // 4×2 picture: left half red, right half blue; split 2×1.
  const rgba: number[] = [];
  for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) rgba.push(x < 2 ? 255 : 0, 0, x < 2 ? 0 : 255, 255);
  const zones = ambilightZones(rgba, 4, 2, 2, 1, new Float32Array(6));
  assert.deepEqual(Array.from(zones), [1, 0, 0, 0, 0, 1]);
  assert.deepEqual(Array.from(ambilightZones([], 4, 2, 2, 1, new Float32Array(6))), [0, 0, 0, 0, 0, 0], 'short input is black');
});

test('the glow lifts dim colour, keeps the hue and leaves background black', () => {
  const zones = Float32Array.from([0.2, 0.1, 0, 0.03, 0.03, 0.03, 0.9, 0.5, 0.1, NaN, 0, 0]);
  for (let zone = 0; zone < 4; zone++) ambilightGlow(zones, zone);
  assert.ok(zones[0] > 0.55 && Math.abs(zones[1] / zones[0] - 0.5) < 1e-6, 'a dim orange is lifted, same hue');
  assert.deepEqual(Array.from(zones.slice(3, 6)), [0, 0, 0], 'near-black background gives no glow');
  assert.ok(Math.abs(zones[6] - 0.9) < 1e-6, 'a bright colour is left as it is');
  assert.deepEqual(Array.from(zones.slice(9, 12)), [0, 0, 0]);
});
