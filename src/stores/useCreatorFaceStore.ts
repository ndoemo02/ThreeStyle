import { create } from 'zustand';

export type CreatorFaceStatus = 'off' | 'loading' | 'ready' | 'error';
interface CreatorFaceState {
  enabled: boolean;
  status: CreatorFaceStatus;
  revision: number;
  setEnabled: (enabled: boolean) => void;
  retry: () => void;
  setStatus: (status: CreatorFaceStatus, revision: number) => void;
}

/** Session-only opt-in: entering a room never silently loads the extra model. */
export const useCreatorFaceStore = create<CreatorFaceState>((set, get) => ({
  enabled: false, status: 'off', revision: 0,
  setEnabled: enabled => {
    if (enabled === get().enabled) return;
    set(s => ({ enabled, status: enabled ? 'loading' : 'off', revision: s.revision + 1 }));
  },
  retry: () => { if (get().enabled) set(s => ({ status: 'loading', revision: s.revision + 1 })); },
  setStatus: (status, revision) => {
    if (get().enabled && get().revision === revision) set({ status });
  },
}));
