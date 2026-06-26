import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LOBBY_CEILING_HEIGHT,
  LOBBY_DOORS,
  getDegradedLobbyQuality,
  getInitialLobbyQuality,
  shouldDegradeLobbyQuality,
} from '../src/3d/world/hub/lobbyConfig.ts';

test('preserves lobby door anchors and navigation ids', () => {
  assert.deepEqual(
    LOBBY_DOORS.map(({ id, position, rotationY }) => ({ id, position, rotationY })),
    [
      { id: 'room-2', position: [-19, 0, -1.1], rotationY: Math.PI },
      { id: 'room-3', position: [-14, 0, -8.9], rotationY: 0 },
      { id: 'room-4', position: [-19, 0, -8.9], rotationY: 0 },
      { id: 'room-6', position: [-34, 0, -1.1], rotationY: Math.PI },
      { id: 'room-7', position: [-29, 0, -8.9], rotationY: 0 },
      { id: 'room-8', position: [-34, 0, -8.9], rotationY: 0 },
    ],
  );
  assert.equal(LOBBY_CEILING_HEIGHT, 4.8);
});

test('selects deterministic desktop and mobile quality profiles', () => {
  assert.deepEqual(getInitialLobbyQuality(false), {
    id: 'desktop',
    dpr: 1.25,
    lightCount: 3,
    planterCount: 3,
    useNormalMaps: true,
  });
  assert.deepEqual(getInitialLobbyQuality(true), {
    id: 'mobile',
    dpr: 1,
    lightCount: 2,
    planterCount: 2,
    useNormalMaps: true,
  });
});

test('degrades each quality profile at most once per lobby visit', () => {
  const mobileLow = getDegradedLobbyQuality(getInitialLobbyQuality(true));
  assert.deepEqual(mobileLow, {
    id: 'mobile-low',
    dpr: 0.75,
    lightCount: 1,
    planterCount: 1,
    useNormalMaps: false,
  });
  assert.equal(getDegradedLobbyQuality(mobileLow), mobileLow);

  const desktopLow = getDegradedLobbyQuality(getInitialLobbyQuality(false));
  assert.deepEqual(desktopLow, {
    id: 'desktop-low',
    dpr: 1,
    lightCount: 2,
    planterCount: 2,
    useNormalMaps: true,
  });
  assert.equal(getDegradedLobbyQuality(desktopLow), desktopLow);
});

test('requires three sustained seconds below the device FPS floor', () => {
  const mobile = getInitialLobbyQuality(true);
  assert.equal(shouldDegradeLobbyQuality(mobile, 24.9, 2_999), false);
  assert.equal(shouldDegradeLobbyQuality(mobile, 24.9, 3_000), true);
  assert.equal(shouldDegradeLobbyQuality(mobile, 25, 5_000), false);

  const desktop = getInitialLobbyQuality(false);
  assert.equal(shouldDegradeLobbyQuality(desktop, 49.9, 3_000), true);
  assert.equal(shouldDegradeLobbyQuality(desktop, 50, 3_000), false);
});
