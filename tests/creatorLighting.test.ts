import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BOOTH_LIVE_BOOST, CREATOR_LIGHTING_PRESETS, LED_PALETTE, createLedRhythm, creatorLightingLevels, ledPaletteColor, onAirLevel, patchCreatorLighting, stepLedRhythm } from '../src/lib/creatorLighting.ts';
import { BEAT_MIN_INTERVAL, createBeatTracker, kickLevelFromDecibels, stepBeatTracker } from '../src/lib/creatorMusic.ts';
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
  const rhythm = createLedRhythm(), tracker = createBeatTracker();
  const beats: number[] = [];
  const dt = 1 / 60, period = 60 / bpm;
  for (let t = 0; t < seconds; t += dt) {
    const phase = t % period;
    const kick = phase < 0.06 || (double && phase > 0.12 && phase < 0.18) ? 0.9 : 0.05;
    if (stepLedRhythm(rhythm, stepBeatTracker(tracker, kick, dt), dt, reduced)) beats.push(rhythm.time);
  }
  return { rhythm, beats };
}

test('LED light hits never exceed two per second, whatever the tempo or double kicks', () => {
  for (const [bpm, double] of [[90, false], [128, false], [174, false], [200, true], [240, true]] as const) {
    const { beats } = runKicks(bpm, 20, false, double);
    assert.ok(beats.length > 10, `${bpm} BPM should still react`);
    for (let i = 1; i < beats.length; i++) assert.ok(beats[i] - beats[i - 1] >= BEAT_MIN_INTERVAL - 1e-9, `${bpm} BPM gap ${beats[i] - beats[i - 1]}`);
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
  stepLedRhythm(rhythm, false, 1 / 60);
  stepLedRhythm(rhythm, true, 1 / 60);
  assert.equal(rhythm.target, 1);
  assert.ok(rhythm.position > 0 && rhythm.position < 0.3, `first frame ${rhythm.position}`);
  for (let i = 0; i < 60; i++) stepLedRhythm(rhythm, false, 1 / 60);
  assert.ok(Math.abs(rhythm.position - 1) < 0.01);
  const held = rhythm.position;
  for (let i = 0; i < 600; i++) stepLedRhythm(rhythm, null, 1 / 60);
  assert.equal(rhythm.target, 1);
  assert.ok(Math.abs(rhythm.position - held) < 0.01);
  assert.ok(rhythm.pulse < 1e-6);
  stepLedRhythm(rhythm, true, NaN);
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

/** Analyser-like kick band for a loud master: dB above maxDecibels (-30), smoothing 0.8, read at 30 Hz. */
function loudMaster(bpm: number, seconds: number, kickDb: number, troughDb: number, jitterDb = 0) {
  const rhythm = createLedRhythm(), tracker = createBeatTracker(), beats: number[] = [];
  let magnitude = 0, level = 0, read = 0, seed = 3;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const dt = 1 / 60, period = 60 / bpm;
  for (let t = 0; t < seconds; t += dt) {
    const db = (t % period < 0.08 ? kickDb : troughDb) + (random() - 0.5) * 2 * jitterDb;
    magnitude = 0.8 * magnitude + 0.2 * 10 ** (db / 20);
    read += dt;
    if (read >= 1 / 30) { read = 0; const bandDb = 20 * Math.log10(magnitude); level = kickLevelFromDecibels([0, bandDb, bandDb, bandDb]); }
    if (stepLedRhythm(rhythm, stepBeatTracker(tracker, level, dt), dt)) beats.push(rhythm.time);
  }
  return beats;
}

test('kicks stay visible in a loud master whose bass sits above the byte ceiling', () => {
  for (const bpm of [100, 120, 128]) {
    const beats = loudMaster(bpm, 20, -22, -29);
    assert.ok(beats.length / 20 >= 1.4, `${bpm} BPM: ${beats.length} beats in 20 s`);
    assert.ok(beats.filter(t => t > 10).length >= 14, `${bpm} BPM keeps detecting after the first seconds`);
    for (let i = 1; i < beats.length; i++) assert.ok(beats[i] - beats[i - 1] >= BEAT_MIN_INTERVAL - 1e-9);
  }
});

test('steady bass with small jitter and no kicks barely triggers light hits', () => {
  const beats = loudMaster(120, 20, -26, -26, 0.6);
  assert.ok(beats.length <= 3, `${beats.length} false hits in 20 s`);
});

test('dB kick level is finite for silence and not clipped for loud bass', () => {
  assert.equal(kickLevelFromDecibels([-Infinity, -Infinity, -Infinity, -Infinity]), 0);
  assert.ok(kickLevelFromDecibels([0, -20, -20, -20]) > 1);
  assert.ok(Number.isFinite(kickLevelFromDecibels([NaN, NaN, NaN, NaN])));
});

test('the booth key is brighter while live, also without the music reaction, and only then', () => {
  const settings = CREATOR_LIGHTING_PRESETS.warm;
  const base = creatorLightingLevels(settings, 0, false);
  assert.equal(creatorLightingLevels(settings, 0, true, true).booth, settings.boothBrightness * BOOTH_LIVE_BOOST);
  assert.equal(creatorLightingLevels({ ...settings, audioReactive: false }, 1, true, true).booth, settings.boothBrightness * BOOTH_LIVE_BOOST);
  const live = creatorLightingLevels(settings, 0, true, true);
  assert.equal(live.room, base.room); assert.equal(live.led, base.led); assert.equal(live.screen, base.screen);
  assert.ok(creatorLightingLevels(settings, 1, true, true).booth > live.booth, 'the beat still lifts it with the reaction on');
});

test('ON AIR is unlit when idle, dim while waiting, lit when live, and only pulses live', () => {
  assert.ok(onAirLevel('idle', 0) < onAirLevel('ready', 0));
  assert.equal(onAirLevel('ready', 0), onAirLevel('paused', 0));
  assert.equal(onAirLevel('ended', 0), onAirLevel('paused', 0));
  assert.ok(onAirLevel('live', 0) > 3 * onAirLevel('paused', 0));
  for (const state of ['idle', 'ready', 'paused', 'ended'] as const) assert.equal(onAirLevel(state, 1), onAirLevel(state, 0), `${state} never pulses`);
  assert.ok(onAirLevel('live', 1) > onAirLevel('live', 0));
  assert.equal(onAirLevel('live', 5), onAirLevel('live', 1));
  assert.equal(onAirLevel('live', NaN), onAirLevel('live', 0));
  assert.equal(onAirLevel('broken' as 'idle', 1), onAirLevel('idle', 0));
});

test('reduced motion and the music reaction off give a steady ON AIR: the LED rhythm never hits', () => {
  const { rhythm } = runKicks(128, 10, true);
  assert.equal(onAirLevel('live', rhythm.pulse), onAirLevel('live', 0));
});
