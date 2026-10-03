import { create } from 'zustand';
import type { CreatorMediaItem, PlaybackStatus } from '../lib/creatorMedia';

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

export const useHudStore = create<HudState>((set) => ({
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
  setRoomMood: (roomMood) => set({ roomMood }),
  setMediaState: (activeMedia, playbackStatus) => set({ activeMedia, playbackStatus, isPlaying: playbackStatus === 'playing' }),
  openHud: (screenId) => set({ isOpen: true, activeScreenId: screenId }),
  closeHud: () => set({ isOpen: false, activeScreenId: null }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCamEnabled: (enabled) => set({ camEnabled: enabled }),
  setCamFacingMode: (mode) => set({ camFacingMode: mode }),
  setCamVideoElement: (el) => set((s) => s.camVideoElement === el ? s : { camVideoElement: el }),
  setMasterVideoRef: (ref) => set((s) => s.masterVideoRef === ref ? s : { masterVideoRef: ref }),
}));
