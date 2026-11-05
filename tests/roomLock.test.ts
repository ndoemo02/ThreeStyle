import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// The stores use extensionless app imports (bundler style); resolve them to .ts for Node.
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !/\\.[cm]?[jt]sx?$/.test(specifier)) return next(specifier + '.ts', context); throw error; }
}`));

const memory = new Map<string, string>();
Object.assign(globalThis, { window: { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); } } } });
const { useHudStore } = await import('../src/stores/useHudStore.ts');
const { CREATOR_PREFERENCES_KEY } = await import('../src/lib/creatorPreferences.ts');
const { CREATOR_LIGHTING_PRESETS } = await import('../src/lib/creatorLighting.ts');

const owner = { roomMood: 'night' as const, lighting: { ...CREATOR_LIGHTING_PRESETS.night, ledColor: '#3fc6ff' } };

test('a visited room is read-only and never overwrites the visitor’s own stored look', () => {
  useHudStore.getState().restorePreferences();
  useHudStore.getState().setLighting({ ledColor: '#ff739e' });
  const mine = memory.get(CREATOR_PREFERENCES_KEY);
  assert.match(mine ?? '', /#ff739e/);

  useHudStore.getState().applyRoomLayout(owner, true);
  useHudStore.getState().setLighting({ ledColor: '#000000' });
  useHudStore.getState().setRoomMood('focus');
  useHudStore.getState().resetLighting();
  useHudStore.getState().restorePreferences();
  assert.equal(useHudStore.getState().lighting.ledColor, '#3fc6ff');
  assert.equal(useHudStore.getState().roomMood, 'night');

  // Volume is the visitor's own; saving it keeps their look, not the owner's.
  useHudStore.getState().setVolume(0.3);
  const stored = JSON.parse(memory.get(CREATOR_PREFERENCES_KEY) ?? '{}');
  assert.equal(stored.lighting.ledColor, '#ff739e');
  assert.equal(stored.volume, 0.3);

  useHudStore.getState().releaseRoomLayout();
  assert.equal(useHudStore.getState().lightingLocked, false);
  assert.equal(useHudStore.getState().lighting.ledColor, '#ff739e');
});

test('the owner’s saved room replaces the local look and stays editable', () => {
  useHudStore.getState().applyRoomLayout(owner, false);
  assert.equal(useHudStore.getState().lighting.ledColor, '#3fc6ff');
  useHudStore.getState().setLighting({ ledBrightness: 0.2 });
  assert.equal(useHudStore.getState().lighting.ledBrightness, 0.2);
});
