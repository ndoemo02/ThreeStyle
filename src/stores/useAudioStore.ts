import { create } from 'zustand';

interface AudioStore {
  /** The shared AnalyserNode, once connected to the master media element. */
  analyserNode: AnalyserNode | null;
  setAnalyserNode: (node: AnalyserNode | null) => void;
  /** Shared AudioContext — created and resumed in HUD (user gesture). */
  audioContext: AudioContext | null;
  setAudioContext: (ctx: AudioContext | null) => void;
  /** Prevents multiple components from racing to create a MediaElementAudioSourceNode. */
  connected: boolean;
  setConnected: (v: boolean) => void;
}

export const useAudioStore = create<AudioStore>((set) => ({
  analyserNode: null,
  setAnalyserNode: (node) => set({ analyserNode: node }),
  audioContext: null,
  setAudioContext: (ctx) => set({ audioContext: ctx }),
  connected: false,
  setConnected: (v) => set({ connected: v }),
}));
