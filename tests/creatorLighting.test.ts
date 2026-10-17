import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CREATOR_LIGHTING_PRESETS, LED_MIN_BEAT_INTERVAL, LED_PALETTE, createLedRhythm, creatorLightingLevels, ledPaletteColor, patchCreatorLighting, stepLedRhythm } from '../src/lib/creatorLighting.ts';
import { parseCreatorPreferences } from '../src/lib/creatorPreferences.ts';
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

/** Square kick: 0.9 for 60 ms at every beat of `bpm`, quiet otherwise; returns beat times. */
function runKicks(bpm: number, seconds: number, reduced = false, double = false) {
  const rhythm = createLedRhythm();
  const beats: number[] = [];
  const dt = 1 / 60, period = 60 / bpm;
  for (let t = 0; t < seconds; t += dt) {
    const phase = t % period;
    const kick = phase < 0.06 || (double && phase > 0.12 && phase < 0.18) ? 0.9 : 0.05;
    if (stepLedRhythm(rhythm, kick, dt, reduced)) beats.push(rhythm.time);
  }
  return { rhythm, beats };
}

test('LED light hits never exceed two per second, whatever the tempo or double kicks', () => {
  for (const [bpm, double] of [[90, false], [128, false], [174, false], [200, true], [240, true]] as const) {
    const { beats } = runKicks(bpm, 20, false, double);
    assert.ok(beats.length > 10, `${bpm} BPM should still react`);
    for (let i = 1; i < beats.length; i++) assert.ok(beats[i] - beats[i - 1] >= LED_MIN_BEAT_INTERVAL - 1e-9, `${bpm} BPM gap ${beats[i] - beats[i - 1]}`);
    // Any one-second window holds at most two hits (below the 3 flashes/s threshold).
    for (const start of beats) assert.ok(beats.filter(t => t >= start && t < start + 1).length <= 2);
  }
});

test('reduced motion never flashes the LEDs but the palette still drifts slowly', () => {
  const { rhythm, beats } = runKicks(128, 20, true);
  assert.equal(beats.length, 0);
  assert.equal(rhythm.pulse, 0);
  assert.ok(rhythm.target >= 4 && rhythm.target <= 5, `drift steps ${rhythm.target}`);
});

test('a colour step glides instead of cutting, and silence holds the colour', () => {
  const rhythm = createLedRhythm();
  stepLedRhythm(rhythm, 0.05, 1 / 60);
  stepLedRhythm(rhythm, 0.9, 1 / 60);
  assert.equal(rhythm.target, 1);
  assert.ok(rhythm.position > 0 && rhythm.position < 0.3, `first frame ${rhythm.position}`);
  for (let i = 0; i < 60; i++) stepLedRhythm(rhythm, 0.05, 1 / 60);
  assert.ok(Math.abs(rhythm.position - 1) < 0.01);
  const held = rhythm.position;
  for (let i = 0; i < 600; i++) stepLedRhythm(rhythm, null, 1 / 60);
  assert.equal(rhythm.target, 1);
  assert.ok(Math.abs(rhythm.position - held) < 0.01);
  assert.ok(rhythm.pulse < 1e-6);
  stepLedRhythm(rhythm, NaN, NaN);
  assert.ok(Number.isFinite(rhythm.position) && Number.isFinite(rhythm.pulse));
});

test('palette colours wrap and blend between neighbours', () => {
  const rgb = { r: 0, g: 0, b: 0 };
  const first = parseInt(LED_PALETTE[0].slice(1), 16);
  ledPaletteColor(LED_PALETTE.length * 3, rgb);
  assert.ok(Math.abs(rgb.r - ((first >> 16) & 255) / 255) < 1e-9);
  ledPaletteColor(-0.5, rgb);
  for (const value of [rgb.r, rgb.g, rgb.b]) assert.ok(value >= 0 && value <= 1);
  ledPaletteColor(NaN, rgb);
  assert.ok(Number.isFinite(rgb.r));
});

test('colour cycling is a validated, persisted preference that only Night enables by default', () => {
  assert.equal(CREATOR_LIGHTING_PRESETS.warm.ledCycle, false);
  assert.equal(CREATOR_LIGHTING_PRESETS.focus.ledCycle, false);
  assert.equal(CREATOR_LIGHTING_PRESETS.night.ledCycle, true);
  const base = { ...CREATOR_LIGHTING_PRESETS.warm };
  assert.equal(patchCreatorLighting(base, { ledCycle: 'yes' as unknown as boolean }).ledCycle, false);
  assert.equal(patchCreatorLighting(base, { ledCycle: true }).ledCycle, true);
  const saved = JSON.stringify({ version: 1, roomMood: 'warm', lighting: { ...base, ledCycle: true }, volume: 0.5 });
  assert.equal(parseCreatorPreferences(saved).lighting.ledCycle, true);
  assert.equal(parseCreatorPreferences(JSON.stringify({ version: 1, roomMood: 'warm', lighting: { ledCycle: 1 } })).lighting.ledCycle, false);
});
