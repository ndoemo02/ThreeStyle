import { create } from 'zustand';

interface HudState {
  isOpen: boolean;
  activeScreenId: string | null;
  isPlaying: boolean;
  camEnabled: boolean;
  camFacingMode: 'user' | 'environment';
  camVideoElement: HTMLVideoElement | null;
  masterVideoRef: HTMLVideoElement | null;
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
  openHud: (screenId) => set({ isOpen: true, activeScreenId: screenId }),
  closeHud: () => set({ isOpen: false, activeScreenId: null }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCamEnabled: (enabled) => set({ camEnabled: enabled }),
  setCamFacingMode: (mode) => set({ camFacingMode: mode }),
  setCamVideoElement: (el) => set({ camVideoElement: el }),
  setMasterVideoRef: (ref) => set({ masterVideoRef: ref }),
}));
