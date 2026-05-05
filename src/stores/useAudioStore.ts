import { create } from 'zustand';

interface AudioStore {
  /** The shared AnalyserNode, once connected to the master media element. */
  analyserNode: AnalyserNode | null;
  setAnalyserNode: (node: AnalyserNode | null) => void;
  /** Prevents multiple components from racing to create a MediaElementSourceNode. */
  connected: boolean;
  setConnected: (v: boolean) => void;
}

export const useAudioStore = create<AudioStore>((set) => ({
  analyserNode: null,
  setAnalyserNode: (node) => set({ analyserNode: node }),
  connected: false,
  setConnected: (v) => set({ connected: v }),
}));
