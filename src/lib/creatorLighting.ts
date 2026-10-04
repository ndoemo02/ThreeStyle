export type RoomMood = 'warm' | 'focus' | 'night';

export interface CreatorLightingSettings {
  roomBrightness: number;
  ledBrightness: number;
  ledColor: string;
  boothBrightness: number;
  audioReactive: boolean;
  musicStrength: number;
}

export const CREATOR_LIGHTING_PRESETS: Record<RoomMood, CreatorLightingSettings> = {
  warm: { roomBrightness: 1, ledBrightness: 0.65, ledColor: '#ff9f45', boothBrightness: 0.7, audioReactive: true, musicStrength: 0.65 },
  focus: { roomBrightness: 1, ledBrightness: 0.4, ledColor: '#a5d8ff', boothBrightness: 0.85, audioReactive: false, musicStrength: 0.4 },
  night: { roomBrightness: 0, ledBrightness: 0.3, ledColor: '#bc8aff', boothBrightness: 0.35, audioReactive: true, musicStrength: 0.8 },
};

export function patchCreatorLighting(current: CreatorLightingSettings, patch: Partial<CreatorLightingSettings>): CreatorLightingSettings {
  const next = { ...current, ...patch };
  for (const key of ['roomBrightness', 'ledBrightness', 'boothBrightness', 'musicStrength'] as const) {
    next[key] = Number.isFinite(next[key]) ? Math.max(0, Math.min(1, next[key])) : current[key];
  }
  if (!/^#[0-9a-f]{6}$/i.test(next.ledColor)) next.ledColor = current.ledColor;
  return next;
}

export function creatorLightingLevels(settings: CreatorLightingSettings, energy: number, playing: boolean) {
  const music = settings.audioReactive && playing ? Math.max(0, Math.min(1, energy)) * settings.musicStrength : 0;
  return {
    room: settings.roomBrightness,
    led: settings.ledBrightness * (1 + music * 2.2),
    booth: settings.boothBrightness * (1 + music * 0.45),
    screen: 0.18 + settings.roomBrightness * 0.82,
  };
}
