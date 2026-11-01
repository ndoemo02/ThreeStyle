'use client';
import { create } from 'zustand';
import type { EntryPhase } from '../lib/entryTransition';

export const useEntryStore = create<{
  phase: EntryPhase; startedAt: number; reducedMotion: boolean;
  setPhase: (phase: EntryPhase) => void;
  reset: (reducedMotion: boolean) => void;
}>((set) => ({
  phase: 'idle', startedAt: 0, reducedMotion: false,
  setPhase: phase => set({ phase, startedAt: performance.now() }),
  reset: reducedMotion => set({ phase: 'idle', startedAt: 0, reducedMotion }),
}));
