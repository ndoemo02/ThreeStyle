import { CREATOR_LIGHTING_PRESETS, patchCreatorLighting, type CreatorLightingSettings, type RoomMood } from './creatorLighting.ts';

export type RoomVisibility = 'private' | 'public';

/** Mirrors public.rooms (supabase/migrations/20261105090000_account_rooms.sql). */
export type AccountRoomRow = {
  owner_id: string;
  slug: string | null;
  visibility: RoomVisibility;
  room_mood: RoomMood;
  room_brightness: number;
  led_brightness: number;
  led_color: string;
  booth_brightness: number;
  audio_reactive: boolean;
  music_strength: number;
  led_cycle: boolean;
  created_at: string;
  updated_at: string;
};

export type AccountRoomLayoutColumns = Pick<AccountRoomRow,
  'room_mood' | 'room_brightness' | 'led_brightness' | 'led_color' | 'booth_brightness' | 'audio_reactive' | 'music_strength' | 'led_cycle'>;

export interface RoomLayout { roomMood: RoomMood; lighting: CreatorLightingSettings }

/** Same rule as the database CHECK: 3–32 chars, a-z, 0-9 and inner hyphens. */
export const ROOM_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const MOODS: readonly RoomMood[] = ['warm', 'focus', 'night'];

/** Typed names are case-insensitive and tolerate surrounding spaces; nothing else is rewritten. */
export function normalizeRoomSlug(value: string) {
  return value.trim().toLowerCase();
}

export function isValidRoomSlug(value: string) {
  return ROOM_SLUG_PATTERN.test(value);
}

export function roomPath(slug: string) {
  return `/pokoj/${encodeURIComponent(slug)}`;
}

/** Row values pass through the same clamps as the HUD, so a malformed row never reaches the scene. */
export function roomLayoutFromRow(row: Partial<AccountRoomLayoutColumns>): RoomLayout {
  const roomMood: RoomMood = MOODS.includes(row.room_mood as RoomMood) ? row.room_mood as RoomMood : 'warm';
  const base = { ...CREATOR_LIGHTING_PRESETS[roomMood] };
  const patch: Partial<CreatorLightingSettings> = {};
  const numbers = { roomBrightness: row.room_brightness, ledBrightness: row.led_brightness, boothBrightness: row.booth_brightness, musicStrength: row.music_strength };
  for (const [key, value] of Object.entries(numbers) as [keyof typeof numbers, unknown][]) {
    if (typeof value === 'number' && Number.isFinite(value)) patch[key] = value;
  }
  if (typeof row.led_color === 'string') patch.ledColor = row.led_color;
  if (typeof row.audio_reactive === 'boolean') patch.audioReactive = row.audio_reactive;
  if (typeof row.led_cycle === 'boolean') patch.ledCycle = row.led_cycle;
  return { roomMood, lighting: patchCreatorLighting(base, patch) };
}

export function roomColumnsFromLayout(layout: RoomLayout): AccountRoomLayoutColumns {
  const clean = roomLayoutFromRow({
    room_mood: layout.roomMood, room_brightness: layout.lighting.roomBrightness, led_brightness: layout.lighting.ledBrightness,
    led_color: layout.lighting.ledColor, booth_brightness: layout.lighting.boothBrightness, audio_reactive: layout.lighting.audioReactive,
    music_strength: layout.lighting.musicStrength, led_cycle: layout.lighting.ledCycle,
  });
  return {
    room_mood: clean.roomMood, room_brightness: clean.lighting.roomBrightness, led_brightness: clean.lighting.ledBrightness,
    // The database stores lowercase hex; the colour picker may report either case.
    led_color: clean.lighting.ledColor.toLowerCase(), booth_brightness: clean.lighting.boothBrightness,
    audio_reactive: clean.lighting.audioReactive, music_strength: clean.lighting.musicStrength, led_cycle: clean.lighting.ledCycle,
  };
}

export function sameRoomLayout(a: RoomLayout, b: RoomLayout) {
  const x = roomColumnsFromLayout(a), y = roomColumnsFromLayout(b);
  return (Object.keys(x) as (keyof AccountRoomLayoutColumns)[]).every(key => x[key] === y[key]);
}
