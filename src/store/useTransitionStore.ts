import { create } from 'zustand';

export type ZoneId = 'hub' | 'room1' | 'room2' | string;
export type ElevatorState = 'idle' | 'doors_closing' | 'moving' | 'doors_opening';
export type ElevatorId = 'A' | 'B' | null;

interface TransitionState {
  activeZone: ZoneId;
  elevatorState: ElevatorState;
  activeElevator: ElevatorId;
  targetZone: ZoneId | null;
  
  // Bezpośrednia zmiana strefy (np. dev / szybkie wyjście)
  setActiveZone: (zone: ZoneId) => void;
  
  // Rozpoczęcie sekwencji wejścia do windy
  enterElevator: (elevator: ElevatorId, targetZone: ZoneId) => void;
  
  // Zmiana kroku animacji windy
  setElevatorState: (state: ElevatorState) => void;
}

export const useTransitionStore = create<TransitionState>((set) => ({
  activeZone: 'hub',
  elevatorState: 'idle',
  activeElevator: null,
  targetZone: null,

  setActiveZone: (zone) => set({ 
    activeZone: zone, 
    elevatorState: 'idle', 
    activeElevator: null, 
    targetZone: null 
  }),

  enterElevator: (elevator, targetZone) => set({
    activeElevator: elevator,
    targetZone: targetZone,
    elevatorState: 'doors_closing'
  }),

  setElevatorState: (state) => set((prev) => {
    // Gdy drzwi się zamkną i zaczynamy jazdę ('moving'), przełączamy strefę docelową
    if (state === 'moving' && prev.targetZone) {
      return { elevatorState: state, activeZone: prev.targetZone };
    }
    // Po zakończeniu przejazdu czyścimy stan windy — przywraca możliwość
    // repozycjonowania kamery przez ZoneController
    if (state === 'idle') {
      return { elevatorState: state, activeElevator: null, targetZone: null };
    }
    return { elevatorState: state };
  }),
}));
