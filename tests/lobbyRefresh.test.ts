import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  getInitialLobbyQuality, createLobbyPerformanceSample, sampleLobbyPerformance, getLobbyAreaLights,
} from '../src/3d/world/hub/lobbyConfig.ts';
import { createLobbyFloorGeometry } from '../src/3d/world/hub/lobbyGeometry.ts';
import { lobbySignUv } from '../src/3d/world/hub/lobbySignAtlas.ts';

test('ignores asset warm-up and degrades only after a sustained slow visible visit', () => {
  const profile = getInitialLobbyQuality(true);
  let sample = createLobbyPerformanceSample();
  for (let frame = 0; frame < 119; frame++) {
    const result = sampleLobbyPerformance(profile, sample, 0.05, false);
    assert.equal(result.degrade, false, 'initial shader/asset work must not lower quality');
    sample = result.sample;
  }
  let degraded = false;
  for (let frame = 0; frame < 75; frame++) {
    const result = sampleLobbyPerformance(profile, sample, 0.05, false);
    sample = result.sample;
    degraded ||= result.degrade;
  }
  assert.equal(degraded, true, 'sustained 20 FPS after warm-up must still protect mobile');
});

test('backgrounding or a large frame gap clears partial degradation evidence', () => {
  const profile = getInitialLobbyQuality(true);
  const interrupted = { warmupSeconds: 10, elapsedSeconds: 0.4, frames: 8, belowThresholdMs: 2800 };
  for (const [delta, hidden] of [[5, false], [0.05, true], [NaN, false]] as const) {
    assert.deepEqual(sampleLobbyPerformance(profile, interrupted, delta, hidden), {
      sample: createLobbyPerformanceSample(), degrade: false,
    });
  }
  let sample = { ...interrupted, elapsedSeconds: 0, frames: 0 };
  for (let frame = 0; frame < 60; frame++) {
    const result = sampleLobbyPerformance(profile, sample, 1 / 60, false);
    sample = result.sample;
    assert.equal(result.degrade, false);
  }
  assert.equal(sample.belowThresholdMs, 0, 'healthy frames cancel a partial slow window');
});

test('each light tier covers lobby and the far end of the corridor within its light budget', () => {
  for (const count of [1, 2, 3]) {
    const lights = getLobbyAreaLights(count);
    assert.equal(lights.length, count);
    for (const [x, z] of [[0, 0], [-18, -5], [-38, -5]]) {
      assert.ok(lights.some(light => Math.abs(x - light.position[0]) <= light.width / 2
        && Math.abs(z - light.position[2]) <= light.height / 2), `tier ${count} misses ${x},${z}`);
    }
  }
});

test('floor tiles preserve footprint, upward facing surface and a fixed texture scale', () => {
  const geometry = createLobbyFloorGeometry([30, 0.09, 8]);
  const bounds = geometry.boundingBox!;
  assert.deepEqual([bounds.min.x, bounds.max.x, bounds.min.z, bounds.max.z], [-15, 15, -4, 4]);
  assert.ok(Math.abs(bounds.min.y - 0.045) < 0.000001);
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  assert.equal(positions.count, 20 * 6 * 6);
  assert.equal(positions.getX(2) - positions.getX(0), 1.5);
  for (let index = 0; index < positions.count; index++) {
    assert.equal(normals.getY(index), 1);
    assert.ok(uv.getX(index) >= 0.0099 && uv.getX(index) <= 0.4901);
    assert.ok(uv.getY(index) >= 0.5099 && uv.getY(index) <= 0.9901);
  }
  const abx = positions.getX(1) - positions.getX(0);
  const abz = positions.getZ(1) - positions.getZ(0);
  const acx = positions.getX(2) - positions.getX(0);
  const acz = positions.getZ(2) - positions.getZ(0);
  assert.ok(abz * acx - abx * acz > 0, 'triangles must face the camera above the floor');
  geometry.dispose();
});

test('ten signage tiles remain inside padded atlas cells with upright text', () => {
  for (let tile = 0; tile < 10; tile++) {
    const [left, bottom] = lobbySignUv(tile, 0, 0);
    const [right, top] = lobbySignUv(tile, 1, 1);
    const column = tile % 2;
    const row = Math.floor(tile / 2);
    assert.ok(left > column / 2 && right < (column + 1) / 2);
    assert.ok(bottom > 1 - (row + 1) / 5 && top < 1 - row / 5);
    assert.ok(top > bottom);
  }
});

test('ships one bounded static signage atlas for each device profile', async () => {
  for (const [variant, size] of [['mobile', 1024], ['desktop', 2048]] as const) {
    const file = path.resolve(import.meta.dirname, '..', 'public', 'textures', 'runtime', 'lobby', variant, 'signage.webp');
    const [metadata, fileStat] = await Promise.all([sharp(file).metadata(), stat(file)]);
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size * 1.25);
    assert.ok(fileStat.size < 500_000, `${variant} signage must stay below 500 KB`);
  }
});

test('large welcome screen has its own resolution without inflating the mobile door atlas', async () => {
  for (const [variant, width] of [['mobile', 1024], ['desktop', 2048]] as const) {
    const file = path.resolve(import.meta.dirname, '..', 'public', 'textures', 'runtime', 'lobby', variant, 'welcome.webp');
    const [metadata, fileStat] = await Promise.all([sharp(file).metadata(), stat(file)]);
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, width / 2);
    assert.ok(fileStat.size < 150_000, `${variant} welcome must stay below 150 KB`);
  }
});
