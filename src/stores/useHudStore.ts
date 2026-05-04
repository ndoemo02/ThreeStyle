import { create } from 'zustand';

interface HudState {
  isOpen: boolean;
  activeScreenId: string | null;
  isPlaying: boolean;
  camEnabled: boolean;
  masterVideoRef: HTMLVideoElement | null;
  openHud: (screenId: string) => void;
  closeHud: () => void;
  setIsPlaying: (playing: boolean) => void;
  setCamEnabled: (enabled: boolean) => void;
  setMasterVideoRef: (ref: HTMLVideoElement | null) => void;
}

export const useHudStore = create<HudState>((set) => ({
  isOpen: false,
  activeScreenId: null,
  isPlaying: false,
  camEnabled: false,
  masterVideoRef: null,
  openHud: (screenId) => set({ isOpen: true, activeScreenId: screenId }),
  closeHud: () => set({ isOpen: false, activeScreenId: null }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCamEnabled: (enabled) => set({ camEnabled: enabled }),
  setMasterVideoRef: (ref) => set({ masterVideoRef: ref }),
}));
