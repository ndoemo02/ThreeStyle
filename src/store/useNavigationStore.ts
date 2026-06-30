import { create } from 'zustand';

export type ZoneId = 'hub' | 'room1' | 'room2' | string;
export type ElevatorState = 'idle' | 'doors_closing' | 'moving' | 'doors_opening';
export type ElevatorId = 'A' | 'B' | null;
export type NavigationPhase = 'idle' | 'doors_closing' | 'transition_fx' | 'doors_opening';

export type NavigationEvent =
  | { type: 'SET_ZONE'; zone: ZoneId }
  | { type: 'ENTER_ELEVATOR'; elevator: ElevatorId; targetZone: ZoneId }
  | { type: 'DOORS_CLOSED' }
  | { type: 'TRANSITION_FX_DONE' }
  | { type: 'DOORS_OPENED' }
  | { type: 'RELEASE_ELEVATOR' };

interface NavigationState {
  activeZone: ZoneId;
  originZone: ZoneId | null;
  targetZone: ZoneId | null;
  navigationPhase: NavigationPhase;
  elevatorState: ElevatorState;
  activeElevator: ElevatorId;
  isTransitionFxActive: boolean;

  send: (event: NavigationEvent) => void;
  setActiveZone: (zone: ZoneId) => void;
  enterElevator: (elevator: ElevatorId, targetZone: ZoneId) => void;
  setElevatorState: (state: ElevatorState) => void;
  releaseElevator: () => void;
}

function createIdleState(zone: ZoneId): Pick<
  NavigationState,
  | 'activeZone'
  | 'originZone'
  | 'targetZone'
  | 'navigationPhase'
  | 'elevatorState'
  | 'activeElevator'
  | 'isTransitionFxActive'
> {
  return {
    activeZone: zone,
    originZone: null,
    targetZone: null,
    navigationPhase: 'idle',
    elevatorState: 'idle',
    activeElevator: null,
    isTransitionFxActive: false,
  };
}

export const useNavigationStore = create<NavigationState>((set) => ({
  ...createIdleState('room1'),

  send: (event) => set((prev) => {
    switch (event.type) {
      case 'SET_ZONE':
        return createIdleState(event.zone);

      case 'ENTER_ELEVATOR':
        if (prev.navigationPhase !== 'idle') return prev;
        return {
          originZone: prev.activeZone,
          targetZone: event.targetZone,
          activeElevator: event.elevator,
          navigationPhase: 'doors_closing',
          elevatorState: 'doors_closing',
          isTransitionFxActive: false,
        };

      case 'DOORS_CLOSED':
        if (prev.navigationPhase !== 'doors_closing' || !prev.targetZone) return prev;
        return {
          activeZone: prev.targetZone,
          navigationPhase: 'transition_fx',
          elevatorState: 'moving',
          isTransitionFxActive: true,
        };

      case 'TRANSITION_FX_DONE':
        if (prev.navigationPhase !== 'transition_fx') return prev;
        return {
          navigationPhase: 'doors_opening',
          elevatorState: 'doors_opening',
          isTransitionFxActive: false,
        };

      case 'DOORS_OPENED':
      case 'RELEASE_ELEVATOR':
        return {
          originZone: null,
          targetZone: null,
          navigationPhase: 'idle',
          elevatorState: 'idle',
          activeElevator: null,
          isTransitionFxActive: false,
        };

      default:
        return prev;
    }
  }),

  setActiveZone: (zone) => set(createIdleState(zone)),
  enterElevator: (elevator, targetZone) => set((prev) => {
    if (prev.navigationPhase !== 'idle') return prev;
    return {
      originZone: prev.activeZone,
      targetZone,
      activeElevator: elevator,
      navigationPhase: 'doors_closing',
      elevatorState: 'doors_closing',
      isTransitionFxActive: false,
    };
  }),
  setElevatorState: (state) => set((prev) => {
    if (state === 'idle') {
      return {
        originZone: null,
        targetZone: null,
        navigationPhase: 'idle',
        elevatorState: 'idle',
        activeElevator: null,
        isTransitionFxActive: false,
      };
    }

    if (state === 'moving') {
      if (!prev.targetZone) return prev;
      return {
        activeZone: prev.targetZone,
        navigationPhase: 'transition_fx',
        elevatorState: 'moving',
        isTransitionFxActive: true,
      };
    }

    return {
      navigationPhase: state,
      elevatorState: state,
      isTransitionFxActive: false,
    };
  }),
  releaseElevator: () => set((prev) => ({
    activeZone: prev.activeZone,
    originZone: null,
    targetZone: null,
    navigationPhase: 'idle',
    elevatorState: 'idle',
    activeElevator: null,
    isTransitionFxActive: false,
  })),
}));
