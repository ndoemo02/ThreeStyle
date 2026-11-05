import { create } from 'zustand';
import type { CreatorMediaItem, PlaybackStatus } from '../lib/creatorMedia';
import { CREATOR_LIGHTING_PRESETS, patchCreatorLighting, type CreatorLightingSettings } from '../lib/creatorLighting';
import { readCreatorPreferences, writeCreatorPreferences } from '../lib/creatorPreferences';
import type { RoomLayout } from '../lib/accountRoom';

interface HudState {
  isOpen: boolean;
  activeScreenId: string | null;
  isPlaying: boolean;
  camEnabled: boolean;
  camFacingMode: 'user' | 'environment';
  camVideoElement: HTMLVideoElement | null;
  masterVideoRef: HTMLVideoElement | null;
  activeMedia: CreatorMediaItem | null;
  playbackStatus: PlaybackStatus;
  roomMood: 'warm' | 'focus' | 'night';
  lighting: CreatorLightingSettings;
  volume: number;
  preferencesReady: boolean;
  /** Someone else's room: its owner's look is shown read-only and never stored on this device. */
  lightingLocked: boolean;
  restorePreferences: () => void;
  /** Shows a saved room look. `locked` makes it read-only (visitor). Nothing is written to this device. */
  applyRoomLayout: (layout: RoomLayout, locked: boolean) => void;
  /** Leaves a visited room: unlocks and returns to this device's own preferences. */
  releaseRoomLayout: () => void;
  setVolume: (volume: number) => void;
  setLighting: (patch: Partial<CreatorLightingSettings>) => void;
  resetLighting: () => void;
  setRoomMood: (mood: 'warm' | 'focus' | 'night') => void;
  setMediaState: (media: CreatorMediaItem | null, status: PlaybackStatus) => void;
  openHud: (screenId: string) => void;
  closeHud: () => void;
  setIsPlaying: (playing: boolean) => void;
  setCamEnabled: (enabled: boolean) => void;
  setCamFacingMode: (mode: 'user' | 'environment') => void;
  setCamVideoElement: (el: HTMLVideoElement | null) => void;
  setMasterVideoRef: (ref: HTMLVideoElement | null) => void;
}

export const useHudStore = create<HudState>((set, get) => ({
  isOpen: false,
  activeScreenId: null,
  isPlaying: false,
  camEnabled: false,
  camFacingMode: 'user',
  camVideoElement: null,
  masterVideoRef: null,
  activeMedia: null,
  playbackStatus: 'idle',
  roomMood: 'warm',
  lighting: { ...CREATOR_LIGHTING_PRESETS.warm },
  volume: 0.8,
  preferencesReady: false,
  lightingLocked: false,
  restorePreferences: () => {
    if (get().lightingLocked) return;
    if (!get().preferencesReady) set({ ...readCreatorPreferences(), preferencesReady: true });
  },
  applyRoomLayout: (layout, locked) => {
    // preferencesReady stays true so a later restore cannot overwrite the room look.
    set({ roomMood: layout.roomMood, lighting: patchCreatorLighting(CREATOR_LIGHTING_PRESETS[layout.roomMood], layout.lighting), lightingLocked: locked, preferencesReady: true });
  },
  releaseRoomLayout: () => {
    if (!get().lightingLocked) return;
    set({ ...readCreatorPreferences(), lightingLocked: false, preferencesReady: true });
  },
  setVolume: (volume) => {
    if (!Number.isFinite(volume)) return;
    set({ volume: Math.max(0, Math.min(1, volume)) });
    // A visitor keeps their own stored look; only the listening volume is theirs to save.
    writeCreatorPreferences(get().lightingLocked ? { ...readCreatorPreferences(), volume: get().volume } : get());
  },
  setRoomMood: (roomMood) => {
    if (get().lightingLocked) return;
    set({ roomMood, lighting: { ...CREATOR_LIGHTING_PRESETS[roomMood] } });
    writeCreatorPreferences(get());
  },
  setLighting: (patch) => {
    if (get().lightingLocked) return;
    set(state => ({ lighting: patchCreatorLighting(state.lighting, patch) }));
    writeCreatorPreferences(get());
  },
  resetLighting: () => {
    if (get().lightingLocked) return;
    set({ roomMood: 'warm', lighting: { ...CREATOR_LIGHTING_PRESETS.warm } });
    writeCreatorPreferences(get());
  },
  setMediaState: (activeMedia, playbackStatus) => set({ activeMedia, playbackStatus, isPlaying: playbackStatus === 'playing' }),
  openHud: (screenId) => set({ isOpen: true, activeScreenId: screenId }),
  closeHud: () => set({ isOpen: false, activeScreenId: null }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCamEnabled: (enabled) => set({ camEnabled: enabled }),
  setCamFacingMode: (mode) => set({ camFacingMode: mode }),
  setCamVideoElement: (el) => set((s) => s.camVideoElement === el ? s : { camVideoElement: el }),
  setMasterVideoRef: (ref) => set((s) => s.masterVideoRef === ref ? s : { masterVideoRef: ref }),
}));
