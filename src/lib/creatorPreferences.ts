import { CREATOR_LIGHTING_PRESETS, patchCreatorLighting, type CreatorLightingSettings, type RoomMood } from './creatorLighting.ts';

export const CREATOR_PREFERENCES_KEY = 'threestyle.creator.preferences.v1';

export type CreatorPreferences = {
  roomMood: RoomMood;
  lighting: CreatorLightingSettings;
  volume: number;
};

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function defaultCreatorPreferences(): CreatorPreferences {
  return { roomMood: 'warm', lighting: { ...CREATOR_LIGHTING_PRESETS.warm }, volume: 0.8 };
}

/** Only preferences are restored. Media, autoplay, device permissions and DOM refs never enter storage. */
export function parseCreatorPreferences(raw: string | null): CreatorPreferences {
  const defaults = defaultCreatorPreferences();
  if (!raw) return defaults;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== 1) return defaults;
    const roomMood: RoomMood = ['warm', 'focus', 'night'].includes(data.roomMood) ? data.roomMood : 'warm';
    const base = { ...CREATOR_LIGHTING_PRESETS[roomMood] };
    const patch: Partial<CreatorLightingSettings> = {};
    const saved = data.lighting;
    if (saved && typeof saved === 'object') {
      for (const key of ['roomBrightness', 'ledBrightness', 'boothBrightness', 'musicStrength'] as const) {
        if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) patch[key] = saved[key];
      }
      if (typeof saved.ledColor === 'string') patch.ledColor = saved.ledColor;
      if (typeof saved.audioReactive === 'boolean') patch.audioReactive = saved.audioReactive;
    }
    const volume = typeof data.volume === 'number' && Number.isFinite(data.volume)
      ? Math.max(0, Math.min(1, data.volume)) : defaults.volume;
    return { roomMood, lighting: patchCreatorLighting(base, patch), volume };
  } catch {
    return defaults;
  }
}

function browserStorage(): PreferenceStorage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

export function readCreatorPreferences(storage: Pick<PreferenceStorage, 'getItem'> | null = browserStorage()): CreatorPreferences {
  try { return parseCreatorPreferences(storage?.getItem(CREATOR_PREFERENCES_KEY) ?? null); }
  catch { return defaultCreatorPreferences(); }
}

export function writeCreatorPreferences(preferences: CreatorPreferences, storage: Pick<PreferenceStorage, 'setItem'> | null = browserStorage()): boolean {
  try {
    if (!storage) return false;
    const validated = parseCreatorPreferences(JSON.stringify({ version: 1,
      roomMood: preferences.roomMood, lighting: preferences.lighting, volume: preferences.volume }));
    storage.setItem(CREATOR_PREFERENCES_KEY, JSON.stringify({ version: 1, ...validated }));
    return true;
  } catch { return false; }
}
