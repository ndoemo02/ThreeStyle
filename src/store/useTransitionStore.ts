import { create } from 'zustand';

export type ZoneId = 'hub' | 'room1' | 'room2' | string;
export type ElevatorState = 'idle' | 'doors_closing' | 'moving' | 'doors_opening';
export type ElevatorId = 'A' | 'B' | null;

interface TransitionState {
  activeZone: ZoneId;
  elevatorState: ElevatorState;
  activeElevator: ElevatorId;
  targetZone: ZoneId | null;

  setActiveZone: (zone: ZoneId) => void;
  enterElevator: (elevator: ElevatorId, targetZone: ZoneId) => void;
  setElevatorState: (state: ElevatorState) => void;
  /** Reset windy po odejściu gracza — nie zmienia strefy */
  releaseElevator: () => void;
}

export const useTransitionStore = create<TransitionState>((set) => ({
  activeZone: 'room1',
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
    if (state === 'moving' && prev.targetZone) {
      return { elevatorState: state, activeZone: prev.targetZone };
    }
    return { elevatorState: state };
  }),

  releaseElevator: () => set({
    activeElevator: null,
    targetZone: null,
    elevatorState: 'idle',
  }),
}));
