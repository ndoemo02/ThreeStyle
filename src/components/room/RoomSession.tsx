'use client';

import { useEffect } from 'react';
import { roomLayoutFromRow, sameRoomLayout, type AccountRoomRow, type RoomLayout } from '../../lib/accountRoom';
import { accountRoom } from '../../lib/supabase/accountRoom';
import { createAccountClient } from '../../lib/supabase/browser';
import { getSupabaseConfig } from '../../lib/supabase/config';
import { useHudStore } from '../../stores/useHudStore';
import { useRoomStore, type RoomMode } from '../../stores/useRoomStore';

/** Light sliders fire on every tick; one write follows a short pause instead. */
export const ROOM_SAVE_DELAY_MS = 800;

/**
 * Connects the scene to a saved room. No UI and no live sync: the owner's room is read once
 * on entry and written after edits; a visitor's copy is read once and never written.
 */
export function RoomSession({ mode, visitorRoom }: { mode: RoomMode; visitorRoom?: AccountRoomRow | null }) {
  useEffect(() => {
    const store = useRoomStore.getState();
    if (mode === 'visitor') {
      if (!visitorRoom) return;
      store.set({ mode, room: visitorRoom, loadStatus: 'ready', saveStatus: 'idle', message: null });
      useHudStore.getState().applyRoomLayout(roomLayoutFromRow(visitorRoom), true);
      return () => { useHudStore.getState().releaseRoomLayout(); useRoomStore.getState().reset(); };
    }
    store.reset();
    if (mode !== 'owner') return;
    if (!getSupabaseConfig()) { store.set({ mode, loadStatus: 'error', message: 'Zapis pokoju wymaga konfiguracji Supabase.' }); return; }
    const rooms = accountRoom(createAccountClient());
    let active = true;
    let saved: RoomLayout | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    const current = (): RoomLayout => { const hud = useHudStore.getState(); return { roomMood: hud.roomMood, lighting: hud.lighting }; };
    const save = async () => {
      timer = null;
      if (!active || !saved || inFlight) return;
      const layout = current();
      if (sameRoomLayout(layout, saved)) { useRoomStore.getState().set({ saveStatus: 'saved' }); return; }
      inFlight = true;
      useRoomStore.getState().set({ saveStatus: 'saving', message: null });
      try {
        const row = await rooms.saveLayout(layout);
        if (!active) return;
        saved = layout;
        useRoomStore.getState().set({ room: row, saveStatus: 'saved' });
      } catch (error) {
        if (active) useRoomStore.getState().set({ saveStatus: 'error', message: error instanceof Error ? error.message : 'Nie udało się zapisać układu pokoju.' });
        return;
      } finally { inFlight = false; }
      // Edits made while the request ran are saved by the next pass.
      if (active && !sameRoomLayout(current(), layout)) timer = setTimeout(() => void save(), ROOM_SAVE_DELAY_MS);
    };
    const unsubscribe = useHudStore.subscribe((state, previous) => {
      if (!saved || (state.lighting === previous.lighting && state.roomMood === previous.roomMood)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void save(), ROOM_SAVE_DELAY_MS);
    });
    const load = async () => {
      useRoomStore.getState().set({ mode, loadStatus: 'loading', message: null });
      try {
        const row = await rooms.mine();
        if (!active) return;
        const layout = roomLayoutFromRow(row);
        // The account's saved room wins over this device's local look.
        useHudStore.getState().applyRoomLayout(layout, false);
        saved = layout;
        useRoomStore.getState().set({ room: row, loadStatus: 'ready', saveStatus: 'saved' });
      } catch (error) {
        if (active) useRoomStore.getState().set({ loadStatus: 'error', message: error instanceof Error ? error.message : 'Nie udało się wczytać Twojego pokoju.' });
      }
    };
    // "Ponów": before the first load it reads again; afterwards it only re-sends the current look,
    // so unsaved edits are never replaced by the stored row.
    const unsubscribeRetry = useRoomStore.subscribe((state, previous) => {
      if (state.retryToken === previous.retryToken) return;
      if (!saved) void load(); else { if (timer) clearTimeout(timer); void save(); }
    });
    void load();
    return () => { active = false; unsubscribe(); unsubscribeRetry(); if (timer) clearTimeout(timer); useRoomStore.getState().reset(); };
  }, [mode, visitorRoom]);

  return null;
}
