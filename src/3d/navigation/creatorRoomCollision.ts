import type { LobbyFloorRect } from '../world/hub/lobbyFurnitureLayout.ts';
import { FLOOR_PLANT, POUF } from '../world/rooms/creatorDecorLayout.ts';
import { constrainHubMovement } from './hubCollision.ts';

/**
 * Creator Room furniture footprints (room space = world space, the room is mounted at the origin).
 * Desk, chair, sofa and cabinet from a downward-raycast occupancy map of the loaded models
 * (2026-10-17, 0.25 m grid); the pouf and the floor plant from their own layout.
 */
export const CREATOR_ROOM_OBSTACLES: readonly LobbyFloorRect[] = [
  { minX: 0.5, maxX: 6.75, minZ: -6, maxZ: -4.0 }, // desk
  { minX: 5.5, maxX: 6.75, minZ: -4.0, maxZ: -1.2 }, // desk return with the tablet and the play plaque
  { minX: 2.75, maxX: 3.95, minZ: -2.55, maxZ: -1.45 }, // office chair
  { minX: 4.45, maxX: 6.75, minZ: -0.4, maxZ: 6.75 }, // sofa, long arm
  { minX: 1.65, maxX: 4.45, minZ: 4.4, maxZ: 6.75 }, // sofa, short arm
  { minX: -6.75, maxX: -5.33, minZ: 0.15, maxZ: 6.25 }, // TV cabinet
  { minX: POUF.position[0] - POUF.radius, maxX: POUF.position[0] + POUF.radius, minZ: POUF.position[2] - POUF.radius, maxZ: POUF.position[2] + POUF.radius },
  { minX: FLOOR_PLANT.position[0] - FLOOR_PLANT.radius, maxX: FLOOR_PLANT.position[0] + FLOOR_PLANT.radius, minZ: FLOOR_PLANT.position[2] - FLOOR_PLANT.radius, maxZ: FLOOR_PLANT.position[2] + FLOOR_PLANT.radius },
];

/** Slides along the Creator Room furniture, swept like the lobby so a long frame cannot tunnel. */
export function constrainCreatorRoomMovement(previousX: number, previousZ: number, nextX: number, nextZ: number) {
  return constrainHubMovement(previousX, previousZ, nextX, nextZ, CREATOR_ROOM_OBSTACLES);
}
