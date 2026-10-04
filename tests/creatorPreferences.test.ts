import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREATOR_PREFERENCES_KEY, defaultCreatorPreferences, parseCreatorPreferences,
  readCreatorPreferences, writeCreatorPreferences,
} from '../src/lib/creatorPreferences.ts';

test('missing, corrupt and unsupported preference versions use independent safe defaults', () => {
  for (const raw of [null, '', '{broken', 'null', '[]', '{"version":2,"volume":0}']) {
    assert.deepEqual(parseCreatorPreferences(raw), defaultCreatorPreferences());
  }
  const a = defaultCreatorPreferences();
  a.lighting.ledColor = '#000000';
  assert.notEqual(a.lighting.ledColor, defaultCreatorPreferences().lighting.ledColor);
});

test('restores preset and custom controls while rejecting invalid types and out of range values', () => {
  const prefs = parseCreatorPreferences(JSON.stringify({ version: 1, roomMood: 'night', volume: 9,
    lighting: { roomBrightness: -1, boothBrightness: 0.6, ledBrightness: 'bright', ledColor: 'javascript:alert(1)', audioReactive: 'false', musicStrength: 0.35 } }));
  assert.equal(prefs.roomMood, 'night');
  assert.equal(prefs.volume, 1);
  assert.equal(prefs.lighting.roomBrightness, 0);
  assert.equal(prefs.lighting.boothBrightness, 0.6);
  assert.equal(prefs.lighting.ledBrightness, 0.3);
  assert.equal(prefs.lighting.ledColor, '#bc8aff');
  assert.equal(prefs.lighting.audioReactive, true);
  assert.equal(prefs.lighting.musicStrength, 0.35);
});

test('stores only preferences and round trips without playback, camera or blob references', () => {
  const map = new Map<string, string>();
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const prefs = { ...defaultCreatorPreferences(), volume: 0.23, isPlaying: true, camEnabled: true, activeMedia: { src: 'blob:temporary' } };
  prefs.lighting.ledColor = '#12aabc';
  prefs.lighting.audioReactive = false;
  assert.equal(writeCreatorPreferences(prefs, storage), true);
  const saved = JSON.parse(map.get(CREATOR_PREFERENCES_KEY)!);
  assert.deepEqual(Object.keys(saved).sort(), ['lighting', 'roomMood', 'version', 'volume']);
  assert.deepEqual(readCreatorPreferences(storage), { roomMood: prefs.roomMood, lighting: prefs.lighting, volume: prefs.volume });
});

test('blocked storage and failed writes never prevent room initialization or control updates', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
  assert.deepEqual(readCreatorPreferences(broken), defaultCreatorPreferences());
  assert.equal(writeCreatorPreferences(defaultCreatorPreferences(), broken), false);
  assert.deepEqual(readCreatorPreferences(null), defaultCreatorPreferences());
  assert.equal(writeCreatorPreferences(defaultCreatorPreferences(), null), false);
});
