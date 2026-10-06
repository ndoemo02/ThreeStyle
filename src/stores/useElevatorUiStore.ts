import { create } from 'zustand';
import type { ElevatorRideStatus } from '../3d/world/elevators/elevatorRidePolicy';

type ElevatorUiState = {
  available: boolean;
  rideStatus: ElevatorRideStatus;
  activate: (() => boolean) | null;
  recover: (() => void) | null;
  setAvailability: (available: boolean) => void;
  setRideStatus: (rideStatus: ElevatorRideStatus) => void;
};

export const useElevatorUiStore = create<ElevatorUiState>((set) => ({
  available: false, rideStatus: 'riding', activate: null, recover: null,
  setAvailability: (available) => set({ available }),
  setRideStatus: (rideStatus) => set({ rideStatus }),
}));
