import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  LOBBY_KEEP_CLEAR, LOBBY_SIGHTLINE, LOBBY_OBSTACLES, LOBBY_DOWNLIGHTS, LOBBY_DOWNLIGHT_X_GRID, LOBBY_LIGHT_POOLS,
  LOBBY_PLANTER_POSITIONS, LOBBY_PLANTER_POT, LOUNGE_FABRIC, LOUNGE_PLINTH, RECEPTION_COUNTER, RECEPTION_CAPS, LOUNGE_TABLE,
  LOUNGE_LAMP, LOUNGE_ISLANDS, loungeModuleCenters, type LobbyFloorRect,
} from '../src/3d/world/hub/lobbyFurnitureLayout.ts';
import { constrainHubMovement, isHubPositionBlocked, HUB_CAMERA_RADIUS } from '../src/3d/navigation/hubCollision.ts';
import { getInitialLobbyQuality, getDegradedLobbyQuality } from '../src/3d/world/hub/lobbyConfig.ts';
import { WAYFINDING_ATLAS, wayfindingUv } from '../src/3d/world/hub/lobbyWayfindingAtlas.ts';

const overlaps = (a: LobbyFloorRect, b: LobbyFloorRect, margin = 0) =>
  a.minX < b.maxX + margin && a.maxX > b.minX - margin && a.minZ < b.maxZ + margin && a.maxZ > b.minZ - margin;

const footprint = ([x, , z]: number[], [w, , d]: number[]): LobbyFloorRect =>
  ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

test('furniture colliders leave the entry threshold and the corridor route free', () => {
  for (const obstacle of LOBBY_OBSTACLES) {
    for (const [name, band] of Object.entries(LOBBY_KEEP_CLEAR)) {
      assert.ok(!overlaps(obstacle, band, HUB_CAMERA_RADIUS), `${JSON.stringify(obstacle)} intrudes on ${name}`);
    }
  }
});

test('nothing solid stands between the intro camera and the welcome board', () => {
  const [x0, z0] = LOBBY_SIGHTLINE.from;
  const [x1, z1] = LOBBY_SIGHTLINE.to;
  for (let step = 0; step <= 100; step++) {
    const t = step / 100;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    for (const obstacle of LOBBY_OBSTACLES) {
      const dx = Math.max(obstacle.minX - x, 0, x - obstacle.maxX);
      const dz = Math.max(obstacle.minZ - z, 0, z - obstacle.maxZ);
      assert.ok(Math.hypot(dx, dz) > LOBBY_SIGHTLINE.halfWidth, `sightline blocked near ${x.toFixed(2)},${z.toFixed(2)}`);
    }
  }
});

test('spawn, intro end and route waypoints are never blocked', () => {
  for (const [x, z] of [[0, 5], [0, 5.4], [0, 6], [4, 6.2], [4, 9], [-5.5, -5], [-2, -5], [1.5, -5], [-9.9, -5]]) {
    assert.equal(isHubPositionBlocked(x, z), false, `${x},${z} must stay walkable`);
  }
});

test('every visible solid piece is covered by a collider', () => {
  const solids = [
    ...[...RECEPTION_COUNTER, ...LOUNGE_FABRIC, ...LOUNGE_PLINTH].map(box => footprint(box.position, box.size)),
    ...RECEPTION_CAPS.map(cap => footprint(cap.position, [cap.radius * 2, 0, cap.radius * 2])),
    footprint(LOUNGE_TABLE.position, [LOUNGE_TABLE.radius * 2, 0, LOUNGE_TABLE.radius * 2]),
    footprint(LOUNGE_LAMP.position, [0.36, 0, 0.36]),
    ...LOUNGE_ISLANDS.flatMap(island => [
      footprint([island.center[0], 0, island.center[1]], [island.tableRadius * 2, 0, island.tableRadius * 2]),
      ...loungeModuleCenters(island).map(([x, z]) => footprint([x, 0, z], [0, 0, 0])),
    ]),
  ];
  for (const solid of solids) {
    // Half-round caps only cover half of their square footprint; check the solid half.
    const cx = (solid.minX + solid.maxX) / 2;
    const cz = (solid.minZ + solid.maxZ) / 2;
    assert.ok(LOBBY_OBSTACLES.some(o => cx >= o.minX && cx <= o.maxX && cz >= o.minZ && cz <= o.maxZ),
      `solid centred at ${cx.toFixed(2)},${cz.toFixed(2)} has no collider`);
  }
});

test('movement slides along the desk and never traps a camera placed inside furniture', () => {
  const [x, z] = constrainHubMovement(-8, 1.6, -8.4, 1.8);
  assert.equal(x, -8, 'blocked axis keeps its previous value');
  assert.ok(Math.abs(z - 1.8) < 1e-9, 'free axis keeps moving');
  assert.deepEqual(constrainHubMovement(-9.2, 1.6, -9.1, 1.6), [-9.1, 1.6], 'escape from a scripted inside placement');
  const [openX, openZ] = constrainHubMovement(0, 0, 0.1, -0.1);
  assert.ok(Math.abs(openX - 0.1) < 1e-9 && Math.abs(openZ + 0.1) < 1e-9, 'open floor is unaffected');
});

test('a long frame cannot tunnel through furniture', () => {
  // A 3.4 m step (slow phone frame or resumed tab) would land beyond the desk.
  const [x, z] = constrainHubMovement(-7.6, 1.6, -11, 1.6);
  assert.ok(x > -8.48 - HUB_CAMERA_RADIUS - 1e-9, `stopped at ${x}`);
  assert.ok(x < -7.6);
  assert.equal(z, 1.6);
  const [freeX] = constrainHubMovement(-3, -5, -12, -5);
  assert.ok(Math.abs(freeX + 12) < 1e-9, 'a long step along the corridor route stays unobstructed');
});

test('downlights sit in the gaps between ceiling baffles', () => {
  for (const light of LOBBY_DOWNLIGHTS) {
    const slot = (light.position[0] - LOBBY_DOWNLIGHT_X_GRID.origin) / LOBBY_DOWNLIGHT_X_GRID.step;
    assert.ok(Math.abs(slot - Math.round(slot)) < 1e-6, `downlight x=${light.position[0]} overlaps a baffle`);
  }
});

test('quality tiers keep accents bounded and drop transparent fill on the lowest tier', () => {
  for (const mobile of [false, true]) {
    const full = getInitialLobbyQuality(mobile);
    const low = getDegradedLobbyQuality(full);
    for (const tier of [full, low]) {
      assert.ok(tier.poolCount <= LOBBY_LIGHT_POOLS.length);
      assert.ok(tier.planterCount <= LOBBY_PLANTER_POSITIONS.length);
    }
    assert.ok(low.poolCount <= full.poolCount);
  }
  const mobileLow = getDegradedLobbyQuality(getInitialLobbyQuality(true));
  assert.equal(mobileLow.poolCount, 0);
  assert.equal(mobileLow.accentGlow, false);
  assert.ok(getInitialLobbyQuality(true).poolCount <= 3, 'mobile overdraw budget');
});

test('planters stay out of colliders and walking bands', () => {
  for (const [x, , z] of LOBBY_PLANTER_POSITIONS) {
    const r = LOBBY_PLANTER_POT.radius;
    const pot = { minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r };
    for (const band of Object.values(LOBBY_KEEP_CLEAR)) assert.ok(!overlaps(pot, band));
    for (const obstacle of LOBBY_OBSTACLES) assert.ok(!overlaps(pot, obstacle));
  }
});

test('lounge islands sit inside the hall and their rugs stay off the walking bands', () => {
  for (const { center: [x, z], rugRadius, innerRadius, seatDepth, backDepth } of LOUNGE_ISLANDS) {
    const outer = innerRadius + seatDepth + backDepth;
    assert.ok(outer < rugRadius, 'the rug shows beyond the sofa back');
    const rug = { minX: x - rugRadius, maxX: x + rugRadius, minZ: z - rugRadius, maxZ: z + rugRadius };
    assert.ok(rug.minX > -9.82 && rug.maxX < 9.82 && rug.minZ > -9.82 && rug.maxZ < 9.82, 'rug inside the walls');
    for (const [name, band] of Object.entries(LOBBY_KEEP_CLEAR)) assert.ok(!overlaps(rug, band), `rug intrudes on ${name}`);
  }
});

test('wayfinding atlas regions fit, do not overlap, and ship within budget', async () => {
  const { size, directory, logo } = WAYFINDING_ATLAS;
  for (const [x, y, w, h] of [directory, logo]) assert.ok(x >= 0 && y >= 0 && x + w <= size && y + h <= size);
  assert.ok(directory[0] + directory[2] <= logo[0], 'regions are side by side');
  for (const region of [directory, logo]) {
    for (const [u, v] of [[0, 0], [1, 1]]) {
      const [s, t] = wayfindingUv(region, u, v);
      assert.ok(s > 0 && s < 1 && t > 0 && t < 1);
    }
  }
  for (const [variant, pixels] of [['desktop', 1024], ['mobile', 512]] as const) {
    const file = path.resolve(import.meta.dirname, '../public/textures/runtime/lobby', variant, 'wayfinding.webp');
    const [info, bytes] = await Promise.all([sharp(file).metadata(), stat(file)]);
    assert.equal(info.width, pixels);
    assert.equal(info.height, pixels);
    assert.ok(bytes.size < 100_000, `${variant} wayfinding is ${bytes.size} bytes`);
  }
});
