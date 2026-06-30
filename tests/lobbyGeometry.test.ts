import test from 'node:test';
import assert from 'node:assert/strict';

import { getLobbyAtlasRect, remapLobbyUv } from '../src/3d/world/hub/lobbyGeometry.ts';

test('maps every lobby surface to a padded atlas quadrant', () => {
  assert.deepEqual(getLobbyAtlasRect('stone'), [0.01, 0.51, 0.48, 0.48]);
  assert.deepEqual(getLobbyAtlasRect('wood'), [0.51, 0.51, 0.48, 0.48]);
  assert.deepEqual(getLobbyAtlasRect('plaster'), [0.01, 0.01, 0.48, 0.48]);
  assert.deepEqual(getLobbyAtlasRect('dark'), [0.51, 0.01, 0.48, 0.48]);
});

test('remaps geometry UVs without mutating the input', () => {
  const source = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
  const mapped = remapLobbyUv(source, 'wood');

  assert.deepEqual(Array.from(mapped, value => Number(value.toFixed(2))), [0.51, 0.51, 0.99, 0.51, 0.99, 0.99, 0.51, 0.99]);
  assert.deepEqual(Array.from(source), [0, 0, 1, 0, 1, 1, 0, 1]);
});
