import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CREATOR_ROOM_OBSTACLES, constrainCreatorRoomMovement } from '../src/3d/navigation/creatorRoomCollision.ts';
import { HUB_CAMERA_RADIUS, isHubPositionBlocked } from '../src/3d/navigation/hubCollision.ts';
import { RUG } from '../src/3d/world/rooms/creatorAccentLayout.ts';

const blocked = (x: number, z: number) => isHubPositionBlocked(x, z, CREATOR_ROOM_OBSTACLES);
/** Walkable bounds of clampCameraToCreatorRoom. */
const BOUNDS = { minX: -6.65, maxX: 6.65, minZ: -5.45, maxZ: 7.55 };
/** ELEVATOR_ROOM_EXIT_POSITION (navigationConfig) and the cabin threshold. */
const EXIT: [number, number] = [0, 5.15];
const LANDING: [number, number] = [0, 6.9];
const EYE = 2.05;

/** Free cells reachable from the elevator landing on a 0.1 m grid (4-neighbour flood fill). */
function reachableCells() {
  const step = 0.1, cols = Math.round((BOUNDS.maxX - BOUNDS.minX) / step) + 1, rows = Math.round((BOUNDS.maxZ - BOUNDS.minZ) / step) + 1;
  const seen = new Set<number>(), cells: [number, number][] = [];
  const at = (c: number, r: number): [number, number] => [BOUNDS.minX + c * step, BOUNDS.minZ + r * step];
  const start = [Math.round((LANDING[0] - BOUNDS.minX) / step), Math.round((LANDING[1] - BOUNDS.minZ) / step)];
  const queue = [start];
  seen.add(start[1] * cols + start[0]);
  while (queue.length) {
    const [c, r] = queue.pop()!;
    cells.push(at(c, r));
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || seen.has(nr * cols + nc)) continue;
      const [x, z] = at(nc, nr);
      if (blocked(x, z)) continue;
      seen.add(nr * cols + nc); queue.push([nc, nr]);
    }
  }
  return cells;
}

test('elevator landing, exit point and the walk into the room stay open', () => {
  for (const [x, z] of [LANDING, EXIT]) assert.equal(blocked(x, z), false, `${x},${z}`);
  for (let z = 7.2; z >= -3; z -= 0.1) assert.equal(blocked(0, z), false, `aisle at z=${z.toFixed(1)}`);
  const [x, z] = constrainCreatorRoomMovement(0, 6.9, 0, -3);
  assert.ok(Math.abs(x) < 1e-9 && Math.abs(z + 3) < 1e-9, `walked to ${x},${z}`);
});

test('tablet, play plaque, desk front and booth window are reachable within their interaction distance', () => {
  const cells = reachableCells();
  const nearest = (x: number, y: number, z: number) => Math.min(...cells.map(([cx, cz]) => Math.hypot(cx - x, EYE - y, cz - z)));
  assert.ok(nearest(6.3, 1.9, -2.2) < 3, 'play plaque (maxDistance 3)');
  assert.ok(nearest(6.0, 1.4, -2.0) < 3, 'tablet (maxDistance 3)');
  assert.ok(cells.some(([x, z]) => Math.abs(x - 3.5) < 0.2 && z > -3.75 && z < -2.9), 'standing room between desk and chair');
  assert.ok(cells.some(([x, z]) => x < -6.2 && z > -4.5 && z < -0.5), 'booth window');
  assert.ok(cells.some(([x, z]) => x > RUG.minX && x < RUG.maxX && z > RUG.minZ && z < RUG.maxZ), 'rug area');
});

test('a long frame cannot tunnel through the pouf, the sofa or the cabinet', () => {
  const [, poufZ] = constrainCreatorRoomMovement(3.15, 1.5, 3.15, 5);
  assert.ok(poufZ < 3.25 - 0.42 - HUB_CAMERA_RADIUS + 1e-9, `stopped at ${poufZ}`);
  const [sofaX] = constrainCreatorRoomMovement(3.8, 1.5, 9, 1.5);
  assert.ok(sofaX < 4.45 - HUB_CAMERA_RADIUS + 1e-9, `stopped at ${sofaX}`);
  const [cabinetX] = constrainCreatorRoomMovement(-4, 3, -9, 3);
  assert.ok(cabinetX > -5.33 + HUB_CAMERA_RADIUS - 1e-9, `stopped at ${cabinetX}`);
  // Sliding: a diagonal push into the sofa keeps the free axis.
  const [slideX, slideZ] = constrainCreatorRoomMovement(4.0, 2.0, 4.6, 1.4);
  assert.ok(slideX < 4.15 + 1e-9 && Math.abs(slideZ - 1.4) < 1e-9, `slid to ${slideX},${slideZ}`);
});

test('a camera placed inside furniture by a fixture can always walk out', () => {
  assert.deepEqual(constrainCreatorRoomMovement(3.15, 3.25, 3.15, 3.3), [3.15, 3.3]);
});

test('footprints stay inside the room and clear of the elevator aisle', () => {
  for (const rect of CREATOR_ROOM_OBSTACLES) {
    assert.ok(rect.minX < rect.maxX && rect.minZ < rect.maxZ, JSON.stringify(rect));
    assert.ok(rect.minX >= -7 && rect.maxX <= 7 && rect.minZ >= -6 && rect.maxZ <= 7, JSON.stringify(rect));
    assert.ok(rect.maxX + HUB_CAMERA_RADIUS <= -1.3 || rect.minX - HUB_CAMERA_RADIUS >= 1.3 || rect.maxZ + HUB_CAMERA_RADIUS <= 4.5, `aisle ${JSON.stringify(rect)}`);
  }
});
