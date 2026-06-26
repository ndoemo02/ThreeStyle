import type { EventRoomShowState, EventRoomThemeId } from './EventRoomTypes';
import { INITIAL_EVENT_ROOM_SHOW_STATE } from './EventRoomTypes';

export type EventRoomShowAction =
  | { type: 'START' }
  | { type: 'AUTO_ADVANCE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'NEXT' }
  | { type: 'PREVIOUS' }
  | { type: 'FINALE' }
  | { type: 'RESET' }
  | { type: 'SET_THEME'; theme: EventRoomThemeId; hostOverride?: boolean };

function withHostOverride(state: EventRoomShowState): EventRoomShowState {
  return { ...state, isHostOverrideActive: true };
}

export function getNextAutomaticShowState(state: EventRoomShowState): EventRoomShowState {
  if (state.isPaused) return state;

  if (state.phase === 'idle') return { ...state, phase: 'intro' };
  if (state.phase === 'intro') return { ...state, phase: 'countdown', currentRank: 10 };
  if (state.phase === 'countdown') return { ...state, phase: 'trackReveal' };
  if (state.phase === 'trackReveal' && state.currentRank > 1) {
    return { ...state, phase: 'countdown', currentRank: state.currentRank - 1 };
  }
  if (state.phase === 'trackReveal') return { ...state, phase: 'finale', currentRank: 1 };
  if (state.phase === 'finale') return { ...state, phase: 'afterloop' };

  return state;
}

export function getPreviousShowState(state: EventRoomShowState): EventRoomShowState {
  if (state.phase === 'afterloop') return { ...state, phase: 'finale', currentRank: 1 };
  if (state.phase === 'finale') return { ...state, phase: 'trackReveal', currentRank: 1 };
  if (state.phase === 'trackReveal') return { ...state, phase: 'countdown' };
  if (state.phase === 'countdown' && state.currentRank < 10) {
    return { ...state, phase: 'trackReveal', currentRank: state.currentRank + 1 };
  }
  if (state.phase === 'countdown') return { ...state, phase: 'intro', currentRank: 10 };
  if (state.phase === 'intro') return { ...state, phase: 'idle', currentRank: 10 };

  return state;
}

export function eventRoomShowReducer(
  state: EventRoomShowState,
  action: EventRoomShowAction,
): EventRoomShowState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        phase: 'intro',
        currentRank: 10,
        isPaused: false,
        isHostOverrideActive: false,
      };

    case 'AUTO_ADVANCE':
      return getNextAutomaticShowState(state);

    case 'PAUSE':
      return { ...state, isPaused: true, isHostOverrideActive: true };

    case 'RESUME':
      return { ...state, isPaused: false, isHostOverrideActive: true };

    case 'NEXT':
      return withHostOverride(getNextAutomaticShowState({ ...state, isPaused: false }));

    case 'PREVIOUS':
      return withHostOverride(getPreviousShowState({ ...state, isPaused: false }));

    case 'FINALE':
      return { ...state, phase: 'finale', currentRank: 1, isPaused: false, isHostOverrideActive: true };

    case 'RESET':
      return { ...INITIAL_EVENT_ROOM_SHOW_STATE, theme: state.theme };

    case 'SET_THEME':
      return {
        ...state,
        theme: action.theme,
        isHostOverrideActive: action.hostOverride ?? state.isHostOverrideActive,
      };
  }
}
