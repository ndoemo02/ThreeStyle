import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/database.types.ts';
import { CREATOR_LIGHTING_PRESETS } from '../src/lib/creatorLighting.ts';
import { isValidRoomSlug, normalizeRoomSlug, roomColumnsFromLayout, roomLayoutFromRow, roomPath, sameRoomLayout, type AccountRoomRow } from '../src/lib/accountRoom.ts';
import { accountRoom, ROOM_UNAVAILABLE } from '../src/lib/supabase/accountRoom.ts';

const USER = '11111111-1111-4111-8111-111111111111';
const row: AccountRoomRow = {
  owner_id: USER, slug: 'studio-a', visibility: 'public', room_mood: 'night', room_brightness: 0, led_brightness: 0.3,
  led_color: '#3fc6ff', booth_brightness: 0.35, audio_reactive: true, music_strength: 0.8, led_cycle: true,
  created_at: '2026-11-05T00:00:00Z', updated_at: '2026-11-05T00:00:00Z',
};

test('room names follow the database rule; typing case and spaces are forgiven', () => {
  for (const ok of ['abc', 'studio-a', 'a1-b2', '9'.repeat(32)]) assert.equal(isValidRoomSlug(ok), true, ok);
  for (const bad of ['ab', '-abc', 'abc-', 'Studio', 'pokój', 'a b c', 'a'.repeat(33), '../x']) assert.equal(isValidRoomSlug(bad), false, bad);
  assert.equal(normalizeRoomSlug('  Studio-A '), 'studio-a');
  assert.equal(roomPath('studio-a'), '/pokoj/studio-a');
});

test('a stored room becomes the same look the owner set, and back', () => {
  const layout = roomLayoutFromRow(row);
  assert.deepEqual(layout, { roomMood: 'night', lighting: { roomBrightness: 0, ledBrightness: 0.3, ledColor: '#3fc6ff', boothBrightness: 0.35, audioReactive: true, musicStrength: 0.8, ledCycle: true } });
  const columns = roomColumnsFromLayout(layout);
  for (const key of Object.keys(columns) as (keyof typeof columns)[]) assert.equal(columns[key], row[key], key);
});

test('malformed rows fall back to safe values instead of reaching the scene', () => {
  const layout = roomLayoutFromRow({ room_mood: 'disco' as never, room_brightness: 7, led_color: 'red', music_strength: Number.NaN });
  assert.equal(layout.roomMood, 'warm');
  assert.equal(layout.lighting.roomBrightness, 1);
  assert.equal(layout.lighting.ledColor, CREATOR_LIGHTING_PRESETS.warm.ledColor);
  assert.equal(layout.lighting.musicStrength, CREATOR_LIGHTING_PRESETS.warm.musicStrength);
});

test('saved colours are lowercase for the database CHECK and equal layouts compare equal', () => {
  const layout = { roomMood: 'warm' as const, lighting: { ...CREATOR_LIGHTING_PRESETS.warm, ledColor: '#A5D8FF' } };
  assert.equal(roomColumnsFromLayout(layout).led_color, '#a5d8ff');
  assert.equal(sameRoomLayout(layout, { ...layout, lighting: { ...layout.lighting, ledColor: '#a5d8ff' } }), true);
  assert.equal(sameRoomLayout(layout, { ...layout, lighting: { ...layout.lighting, ledBrightness: 0.1 } }), false);
});

type Call = { op: string; payload?: unknown; filters: [string, unknown][] };
function fixture(options: { loggedOut?: boolean; result?: { data: unknown; error: unknown } } = {}) {
  const calls: Call[] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: options.loggedOut ? null : { id: USER, is_anonymous: false } }, error: null }) },
    from: (table: string) => {
      assert.equal(table, 'rooms');
      const call: Call = { op: 'select', filters: [] };
      calls.push(call);
      const done = async () => options.result ?? { data: row, error: null };
      const query = {
        select: () => query,
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return query; },
        eq: (column: string, value: unknown) => { call.filters.push([column, value]); return query; },
        single: done, maybeSingle: done,
      };
      return query;
    },
  };
  return { rooms: accountRoom(client as unknown as SupabaseClient<Database>), calls };
}

test('the owner saves only layout columns, filtered to their own row', async () => {
  const { rooms, calls } = fixture();
  await rooms.saveLayout(roomLayoutFromRow(row));
  assert.equal(calls[0].op, 'update');
  assert.deepEqual(calls[0].filters, [['owner_id', USER]]);
  const payload = calls[0].payload as Record<string, unknown>;
  for (const forbidden of ['owner_id', 'slug', 'visibility', 'created_at', 'updated_at']) assert.equal(forbidden in payload, false, forbidden);
});

test('sharing validates the name before any request and maps database errors', async () => {
  const { rooms, calls } = fixture();
  await assert.rejects(rooms.saveSharing({ slug: 'Zła nazwa', visibility: 'public' }), /3–32 znaki/);
  await assert.rejects(rooms.saveSharing({ slug: '', visibility: 'public' }), /Nadaj pokojowi nazwę/);
  assert.equal(calls.length, 0);
  await rooms.saveSharing({ slug: ' Studio-A ', visibility: 'public' });
  assert.deepEqual(calls[0].payload, { slug: 'studio-a', visibility: 'public' });
  await rooms.saveSharing({ slug: '', visibility: 'private' });
  assert.deepEqual(calls[1].payload, { slug: null, visibility: 'private' });
  await assert.rejects(fixture({ result: { data: null, error: { code: '23505' } } }).rooms.saveSharing({ slug: 'zajety', visibility: 'public' }), /zajęta/);
});

test('a guest can look up a room; missing and private rooms look the same', async () => {
  const found = fixture({ loggedOut: true });
  assert.equal((await found.rooms.bySlug('Studio-A'))?.slug, 'studio-a');
  assert.deepEqual(found.calls[0].filters, [['slug', 'studio-a']]);
  const hidden = fixture({ loggedOut: true, result: { data: null, error: null } });
  assert.equal(await hidden.rooms.bySlug('prywatny'), null);
  const invalid = fixture({ loggedOut: true });
  assert.equal(await invalid.rooms.bySlug('../x'), null);
  assert.equal(invalid.calls.length, 0);
  assert.match(ROOM_UNAVAILABLE, /nie udostępnia/);
});

test('saving without an account fails without touching the database', async () => {
  const { rooms, calls } = fixture({ loggedOut: true });
  await assert.rejects(rooms.saveLayout(roomLayoutFromRow(row)), /Zaloguj się/);
  await assert.rejects(rooms.mine(), /Zaloguj się/);
  assert.equal(calls.length, 0);
});
