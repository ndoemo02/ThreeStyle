import * as THREE from 'three';

export const ROOM_ZONE = 'room1' as const;
export const HUB_ZONE = 'hub' as const;

export type PrimaryZoneId = typeof ROOM_ZONE | typeof HUB_ZONE;

export type CameraPreset = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
};

export function getRoomCameraPreset(width: number, height: number): CameraPreset {
  if (height > width) {
    return {
      position: [0.55, 2.24, 5.2],
      target: [1.45, 1.78, -2.15],
      fov: 52,
    };
  }

  if (width < 1024) {
    return {
      position: [0.1, 2.1, 2.9],
      target: [0.95, 1.95, -2.45],
      fov: 54,
    };
  }

  return {
    position: [0, 2.1, 2.4],
    target: [0.8, 1.95, -2.2],
    fov: 58,
  };
}

export function getHubCameraPreset(width: number, height: number): CameraPreset {
  if (height > width) {
    return {
      position: [0, 2.05, 6],
      target: [0, 2.05, 0],
      fov: 58,
    };
  }

  if (width < 1024) {
    return {
      position: [0, 2.05, 5.4],
      target: [0, 2.05, 0],
      fov: 58,
    };
  }

  return {
    position: [0, 2.05, 5],
    target: [0, 2.05, 0],
    fov: 60,
  };
}

export function getCameraPreset(zone: string, width: number, height: number): CameraPreset {
  return zone === HUB_ZONE
    ? getHubCameraPreset(width, height)
    : getRoomCameraPreset(width, height);
}

export const ELEVATOR_LOBBY_POSITION = new THREE.Vector3(-24, 0, 1.5);

// In the studio, keep the cabin beyond the doorway so it reads like a transition point,
// not a freestanding object parked in the middle of the room.
export const ELEVATOR_ROOM_POSITION = new THREE.Vector3(0, 0, 9.65);

export const ELEVATOR_LOBBY_EXIT_POSITION = new THREE.Vector3(-24, 2.05, -2.35);
export const ELEVATOR_LOBBY_EXIT_LOOK_AT = new THREE.Vector3(-19, 2.05, -1.15);

export const ELEVATOR_ROOM_EXIT_POSITION = new THREE.Vector3(0, 2.05, 5.15);
export const ELEVATOR_ROOM_EXIT_LOOK_AT = new THREE.Vector3(0.8, 1.95, -2.2);
