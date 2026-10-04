import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CREATOR_LIGHTING_PRESETS, creatorLightingLevels, patchCreatorLighting } from '../src/lib/creatorLighting.ts';
import { prepareCreatorRoomMaterial } from '../src/3d/world/rooms/creatorRoomMaterials.ts';
import { nextCreatorDpr } from '../src/lib/creatorQuality.ts';

test('sustained slow frames lower quality while movement and device DPR cap sharpness', () => {
  assert.equal(nextCreatorDpr(1.5, 1.5, 40, false), 1.25);
  assert.equal(nextCreatorDpr(1, 1.5, 45, false), 0.75);
  assert.equal(nextCreatorDpr(1.5, 1.5, 25, false), 1);
  assert.equal(nextCreatorDpr(1.25, 1.5, 16.7, false), 1.5);
  assert.equal(nextCreatorDpr(1.25, 1.5, 16.7, true), 1.25);
  assert.equal(nextCreatorDpr(1, 1, 16.7, false), 1);
});

test('night extinguishes the room while retaining independent screen and booth light', () => {
  const result = creatorLightingLevels(CREATOR_LIGHTING_PRESETS.night, 1, true);
  assert.equal(result.room, 0);
  assert.ok(result.screen > 0 && result.screen < 0.25);
  assert.ok(result.booth > 0);
  assert.ok(result.led > 0);
});

test('music reaction stops on pause and can be disabled without losing base light', () => {
  const settings = CREATOR_LIGHTING_PRESETS.warm;
  const base = creatorLightingLevels(settings, 0, false);
  assert.deepEqual(creatorLightingLevels(settings, 1, false), base);
  assert.deepEqual(creatorLightingLevels({ ...settings, audioReactive: false }, 1, true), base);
  const pulse = creatorLightingLevels(settings, 1, true);
  assert.ok(pulse.led > base.led);
  assert.equal(pulse.room, base.room);
});

test('invalid slider/color values cannot leak NaN or unbounded intensity into the renderer', () => {
  const original = { ...CREATOR_LIGHTING_PRESETS.warm };
  const next = patchCreatorLighting(original, { roomBrightness: -10, ledBrightness: 100, boothBrightness: NaN, musicStrength: Infinity, ledColor: 'invalid' });
  assert.equal(next.roomBrightness, 0);
  assert.equal(next.ledBrightness, 1);
  assert.equal(next.boothBrightness, original.boothBrightness);
  assert.equal(next.musicStrength, original.musicStrength);
  assert.equal(next.ledColor, original.ledColor);
  assert.deepEqual(original, CREATOR_LIGHTING_PRESETS.warm);
});

test('room glass avoids transmission without mutating the cached source or losing transparency', () => {
  const source = new THREE.MeshPhysicalMaterial({ transmission: 0.7694, thickness: 0.5 });
  const prepared = prepareCreatorRoomMaterial(source) as THREE.MeshPhysicalMaterial;
  assert.equal(prepared.transmission, 0);
  assert.equal(prepared.transparent, true);
  assert.ok(prepared.opacity < 1);
  assert.equal(prepared.depthWrite, false);
  assert.equal(source.transmission, 0.7694);
  assert.equal(source.transparent, false);
  source.dispose(); prepared.dispose();
});
