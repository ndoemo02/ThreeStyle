import { create } from 'zustand';
import type { AccountRoomRow } from '../lib/accountRoom';

/**
 * Whose room the scene shows. demo: no account, session-only look. owner: the signed-in
 * account's own saved room (editable). visitor: someone else's room, read-only.
 */
export type RoomMode = 'demo' | 'owner' | 'visitor';
export type RoomLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type RoomSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface RoomState {
  mode: RoomMode;
  room: AccountRoomRow | null;
  loadStatus: RoomLoadStatus;
  saveStatus: RoomSaveStatus;
  message: string | null;
  /** Bumped by the HUD "retry" actions; the session watches it. */
  retryToken: number;
  set: (patch: Partial<Omit<RoomState, 'set' | 'reset' | 'retry'>>) => void;
  retry: () => void;
  reset: () => void;
}

const initial = { mode: 'demo' as RoomMode, room: null, loadStatus: 'idle' as RoomLoadStatus, saveStatus: 'idle' as RoomSaveStatus, message: null };

export const useRoomStore = create<RoomState>(set => ({
  ...initial,
  retryToken: 0,
  set: patch => set(patch),
  retry: () => set(state => ({ retryToken: state.retryToken + 1 })),
  reset: () => set(initial),
}));
