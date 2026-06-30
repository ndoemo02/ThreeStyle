import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldShowLobbyWorldLabel } from '../src/3d/world/hub/lobbyVisibility.ts';

test('shows a world label only when it is near and in front of the camera', () => {
  assert.equal(shouldShowLobbyWorldLabel([0, 2, 0], [-1, 0, 0], [-6, 2, 0], 12), true);
  assert.equal(shouldShowLobbyWorldLabel([0, 2, 0], [1, 0, 0], [-6, 2, 0], 12), false);
  assert.equal(shouldShowLobbyWorldLabel([0, 2, 0], [-1, 0, 0], [-13, 2, 0], 12), false);
});
