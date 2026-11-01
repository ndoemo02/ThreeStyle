import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOBBY_CEILING_ARC, LOBBY_COVE_LED, LOBBY_OPENINGS, LOBBY_WALL_FACE, lobbyArcPoint, mirroredLightOnFloor,
} from '../src/3d/world/hub/lobbyLightLayout.ts';

const BAFFLE_BOTTOM = 4.64;
const range = (position: number[], size: number[], axis: number) => [position[axis] - size[axis] / 2, position[axis] + size[axis] / 2];

test('cove strips hug the walls under the baffles and never cross the entry or the corridor mouth', () => {
  for (const { position, size } of LOBBY_COVE_LED) {
    const [, y1] = range(position, size, 1);
    assert.ok(y1 <= BAFFLE_BOTTOM, 'below the baffles');
    const alongX = size[0] > size[2];
    const wallDistance = LOBBY_WALL_FACE - Math.abs(alongX ? position[2] : position[0]);
    assert.ok(wallDistance > 0 && wallDistance < 0.12, `${position} sits on a wall`);
    const [a0, a1] = range(position, size, alongX ? 0 : 2);
    assert.ok(a0 >= -LOBBY_WALL_FACE && a1 <= LOBBY_WALL_FACE, 'stays inside the hall');
    if (alongX && position[2] > 0) assert.ok(a1 <= LOBBY_OPENINGS.entry.minX || a0 >= LOBBY_OPENINGS.entry.maxX, 'clear of the entry');
    if (!alongX && position[0] < 0) assert.ok(a1 <= LOBBY_OPENINGS.corridor.minZ || a0 >= LOBBY_OPENINGS.corridor.maxZ, 'clear of the corridor mouth');
  }
  // All four walls are lit.
  assert.ok(LOBBY_COVE_LED.some(s => s.size[0] > s.size[2] && s.position[2] < 0));
  assert.ok(LOBBY_COVE_LED.some(s => s.size[0] > s.size[2] && s.position[2] > 0));
  assert.ok(LOBBY_COVE_LED.some(s => s.size[2] > s.size[0] && s.position[0] < 0));
  assert.ok(LOBBY_COVE_LED.some(s => s.size[2] > s.size[0] && s.position[0] > 0));
});

test('the ceiling arc stays inside the existing LED frame and below the baffles', () => {
  const { thetaStart, thetaLength, y, width } = LOBBY_CEILING_ARC;
  assert.ok(y + 0.001 <= BAFFLE_BOTTOM);
  for (let i = 0; i <= 64; i++) {
    const [x, z] = lobbyArcPoint(thetaStart + thetaLength * i / 64);
    assert.ok(Math.abs(x) < 8.8 - width && Math.abs(z) < 7.2 - width, `arc point ${x.toFixed(2)}, ${z.toFixed(2)} leaves the frame`);
  }
  const ends = [lobbyArcPoint(thetaStart), lobbyArcPoint(thetaStart + thetaLength)];
  assert.ok(Math.abs(ends[0][0] + ends[1][0]) < 1e-9 && Math.abs(ends[0][1] - ends[1][1]) < 1e-9, 'symmetric about the hall centre line');
});

test('a ceiling light mirrors into the floor between the camera and the light', () => {
  // Straight below: camera under the light sees it at its own feet.
  assert.deepEqual(mirroredLightOnFloor([2, 2, 3], [2, 4.7, 3]), [2, 3]);
  // Same height as the light: the reflection is half way.
  const [x, z] = mirroredLightOnFloor([0, 4.7, 0], [4, 4.7, -2]);
  assert.ok(Math.abs(x - 2) < 1e-9 && Math.abs(z + 1) < 1e-9);
  // Eye height 2.05 under a 4.72 m ceiling: about 30 % of the way, so near lights reflect near the viewer.
  const [nx] = mirroredLightOnFloor([0, 2.05, 0], [10, 4.72, 0]);
  assert.ok(nx > 2.9 && nx < 3.1);
});
