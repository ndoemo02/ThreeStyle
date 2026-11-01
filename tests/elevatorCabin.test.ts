import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CABIN_BRASS, CABIN_LED, CABIN_WALLS, CALL_PANEL, DOOR, FRAME_BOXES, HUB_HEADER, HUB_POCKETS, cabinShade, doorFaceBoxes, faceUvScale, type CabinBox } from '../src/3d/world/elevators/elevatorCabinLayout.ts';
import { ELEVATOR_FRAME } from '../src/3d/world/rooms/creatorAccentLayout.ts';

const ROOM_CABIN_Z = 9.65;
/** Wall faces in cabin-local z: brick (room) and plaster (corridor). */
const BRICK_FACE = ROOM_CABIN_Z - 6.75;
const CORRIDOR_FACE = 1.5 - -1.18;
const range = (box: CabinBox, axis: 0 | 1 | 2) => [box.position[axis] - box.size[axis] / 2, box.position[axis] + box.size[axis] / 2];

test('head height inside the cabin stays free (the ride keeps the camera within |x| < 1.75, z -2.25…2.35)', () => {
  // The back wall face is at z -2.225, so the panel and its frame sit on it; nothing reaches into the room for a head.
  for (const box of [...CABIN_WALLS, ...FRAME_BOXES, ...HUB_POCKETS, ...CABIN_BRASS, ...CABIN_LED, CALL_PANEL, HUB_HEADER]) {
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

/** A door leaf (box and outer face) at its centre x along the travel. */
function leaf(x: number): CabinBox[] {
  const side = x < 0 ? -1 : 1;
  return [
    { position: [x, 1.75, DOOR.z], size: [DOOR.width, DOOR.height, DOOR.depth] },
    ...doorFaceBoxes(side).map(box => ({ ...box, position: [x + box.position[0], 1.75, DOOR.z + box.position[2]] as [number, number, number] })),
  ];
}
const overlaps = (a: CabinBox, b: CabinBox) => ([0, 1, 2] as const).every(axis => range(a, axis)[0] < range(b, axis)[1] && range(b, axis)[0] < range(a, axis)[1]);

test('open leaves hide in the room brick and inside the corridor pockets', () => {
  for (const x of [-DOOR.openX, DOOR.openX]) {
    for (const box of leaf(x)) {
      assert.ok(range(box, 2)[1] < BRICK_FACE, 'every part of the leaf is behind the brick face in the room');
      const [x0, x1] = range(box, 0);
      const outside = x0 < 0 ? Math.min(x1, -ELEVATOR_FRAME.halfWidth) : Math.max(x0, ELEVATOR_FRAME.halfWidth);
      const pocket = HUB_POCKETS.find(p => range(p, 0)[0] <= outside && outside <= range(p, 0)[1]);
      assert.ok(pocket, 'the part beyond the frame is inside a pocket');
      for (const axis of [0, 1, 2] as const) {
        const [p0, p1] = range(pocket!, axis), [b0, b1] = range(box, axis);
        if (axis === 0) assert.ok(x0 < 0 ? b0 >= p0 : b1 <= p1, 'the leaf ends inside the pocket');
        else assert.ok(b0 >= p0 && b1 <= p1, `the leaf stays inside the pocket on axis ${axis}`);
      }
    }
  }
  // Closed, the leaves stand just behind the brick inside the opening.
  for (const box of leaf(DOOR.closedX)) assert.ok(range(box, 2)[1] < BRICK_FACE && range(box, 2)[1] > BRICK_FACE - 0.02);
});

test('the call panel sits in front of the leaves, on the pocket and just proud of the brick', () => {
  for (let x = DOOR.closedX; x <= DOOR.openX + 1e-9; x += 0.05) {
    for (const box of leaf(x)) assert.ok(!overlaps(box, CALL_PANEL), `the right leaf at x ${x.toFixed(2)} hits the call panel`);
  }
  const [back, front] = range(CALL_PANEL, 2);
  const pocket = Math.max(...HUB_POCKETS.map(box => range(box, 2)[1]));
  assert.ok(back <= pocket && front > pocket, 'mounted on the corridor pocket');
  assert.ok(front > BRICK_FACE && front - BRICK_FACE < 0.08, 'stands a few cm off the brick in the room');
  assert.ok(range(CALL_PANEL, 0)[0] > ELEVATOR_FRAME.halfWidth, 'beside the frame, not on it');
  // The pockets reach back to the plaster and up to the frame top; the destination sign above stays clear.
  for (const box of HUB_POCKETS) {
    assert.ok(Math.abs(range(box, 2)[0] - CORRIDOR_FACE) < 0.01, 'pocket starts at the corridor wall face');
    assert.ok(range(box, 1)[1] <= ELEVATOR_FRAME.height + 0.001);
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
