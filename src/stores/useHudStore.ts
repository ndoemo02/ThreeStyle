import { create } from 'zustand';

interface HudState {
  isOpen: boolean;
  activeScreenId: string | null;
  isPlaying: boolean;
  masterVideoRef: HTMLVideoElement | null;
  openHud: (screenId: string) => void;
  closeHud: () => void;
  setIsPlaying: (playing: boolean) => void;
  setMasterVideoRef: (ref: HTMLVideoElement | null) => void;
}

export const useHudStore = create<HudState>((set) => ({
  isOpen: false,
  activeScreenId: null,
  isPlaying: false,
  masterVideoRef: null,
  openHud: (screenId) => set({ isOpen: true, activeScreenId: screenId }),
  closeHud: () => set({ isOpen: false, activeScreenId: null }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setMasterVideoRef: (ref) => set({ masterVideoRef: ref }),
}));
