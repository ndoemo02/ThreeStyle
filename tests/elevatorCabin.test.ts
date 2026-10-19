import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CABIN_BRASS, CABIN_LED, CABIN_WALLS, CALL_PANEL, CLADDING_BOXES, FRAME_BOXES, HUB_HEADER, cabinShade, faceUvScale, type CabinBox } from '../src/3d/world/elevators/elevatorCabinLayout.ts';
import { ELEVATOR_FRAME } from '../src/3d/world/rooms/creatorAccentLayout.ts';

const ROOM_CABIN_Z = 9.65;
/** Wall faces in cabin-local z: brick (room) and plaster (corridor). */
const BRICK_FACE = ROOM_CABIN_Z - 6.74;
const CORRIDOR_FACE = 1.5 - -1.18;
const range = (box: CabinBox, axis: 0 | 1 | 2) => [box.position[axis] - box.size[axis] / 2, box.position[axis] + box.size[axis] / 2];

test('head height inside the cabin stays free (the ride keeps the camera within |x| < 1.75, z -2.25…2.35)', () => {
  // The back wall face is at z -2.225, so the panel and its frame sit on it; nothing reaches into the room for a head.
  for (const box of [...CABIN_WALLS, ...FRAME_BOXES, ...CLADDING_BOXES, ...CABIN_BRASS, ...CABIN_LED, CALL_PANEL, HUB_HEADER]) {
    const [x0, x1] = range(box, 0), [y0, y1] = range(box, 1), [z0, z1] = range(box, 2);
    const inside = x0 < 1.7 && x1 > -1.7 && y0 < 2.4 && y1 > 1.4 && z0 < 2.35 && z1 > -2.1;
    assert.ok(!inside, `box at ${box.position} enters the head space`);
  }
});

test('the frame keeps the outline the Creator Room halo is laid out around', () => {
  const outer = Math.max(...FRAME_BOXES.map(box => range(box, 0)[1]));
  const top = Math.max(...FRAME_BOXES.map(box => range(box, 1)[1]));
  const front = Math.max(...FRAME_BOXES.map(box => range(box, 2)[1]));
  assert.ok(Math.abs(outer - ELEVATOR_FRAME.halfWidth) < 0.02, `half-width ${outer}`);
  assert.ok(Math.abs(top - ELEVATOR_FRAME.height) < 0.02, `top ${top}`);
  assert.ok(Math.abs(ROOM_CABIN_Z - front - ELEVATOR_FRAME.frontZ) < 0.02, `front ${ROOM_CABIN_Z - front}`);
});

test('the call panel sits on the corridor cladding and just proud of the brick', () => {
  const [back, front] = range(CALL_PANEL, 2);
  const cladding = Math.max(...CLADDING_BOXES.map(box => range(box, 2)[1]));
  assert.ok(back <= cladding && front > cladding, 'mounted on the cladding in the corridor');
  assert.ok(front > BRICK_FACE && front - BRICK_FACE < 0.06, 'stands a few cm off the brick in the room');
  const [x0] = range(CALL_PANEL, 0);
  assert.ok(x0 > ELEVATOR_FRAME.halfWidth, 'beside the frame, not on it');
  // Cladding and header stay hidden in the brick; header and cladding sit at or behind the corridor face.
  for (const box of CLADDING_BOXES) {
    const [x0, x1] = range(box, 0);
    assert.ok(range(box, 2)[1] < BRICK_FACE, 'cladding is behind the brick face');
    assert.ok(x0 >= 1.3 - 1e-9 || x1 <= -1.3 + 1e-9, 'cladding is outside the 2.6 m brick opening');
  }
  assert.ok(range(HUB_HEADER, 2)[1] <= CORRIDOR_FACE + 0.05);
});

test('lights and rails stay on the walls, out of the walking space', () => {
  for (const box of [...CABIN_LED, ...CABIN_BRASS]) {
    const [y0, y1] = range(box, 1);
    assert.ok(y0 >= 0 && y1 <= 3.55, `${box.position} within floor and ceiling`);
  }
});

test('faces map one texture repeat to one metre; the baked shade rises towards the cove', () => {
  const size = [4.4, 3.5, 5] as const;
  assert.deepEqual(faceUvScale(0, size), [5, 3.5]);
  assert.deepEqual(faceUvScale(3, size), [4.4, 5]);
  assert.deepEqual(faceUvScale(5, size), [4.4, 3.5]);
  assert.equal(cabinShade(0), 0.5);
  assert.equal(cabinShade(3.4), 1);
  assert.ok(cabinShade(1) < cabinShade(2));
});
