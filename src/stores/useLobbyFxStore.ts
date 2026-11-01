import { create } from 'zustand';

/** Lobby post-processing switches, set by the lobby quality tier and read by the world composer. */
type LobbyFxState = {
  bloom: boolean;
  setBloom: (bloom: boolean) => void;
};

export const useLobbyFxStore = create<LobbyFxState>((set) => ({
  bloom: false,
  setBloom: (bloom) => set({ bloom }),
}));
