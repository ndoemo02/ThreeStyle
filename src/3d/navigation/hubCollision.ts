import { LOBBY_OBSTACLES, type LobbyFloorRect } from '../world/hub/lobbyFurnitureLayout.ts';

/** Camera body radius kept between the eye and lobby furniture. */
export const HUB_CAMERA_RADIUS = 0.3;

function insideExpanded(rect: LobbyFloorRect, x: number, z: number, radius: number) {
  return x > rect.minX - radius && x < rect.maxX + radius && z > rect.minZ - radius && z < rect.maxZ + radius;
}

export function isHubPositionBlocked(x: number, z: number, obstacles: readonly LobbyFloorRect[] = LOBBY_OBSTACLES) {
  return obstacles.some(rect => insideExpanded(rect, x, z, HUB_CAMERA_RADIUS));
}

/** Longest unchecked move; well below the thinnest collider plus two radii (1 m). */
export const HUB_MAX_STEP = 0.25;

function slideStep(previousX: number, previousZ: number, nextX: number, nextZ: number): [number, number] {
  if (!isHubPositionBlocked(nextX, nextZ)) return [nextX, nextZ];
  if (!isHubPositionBlocked(nextX, previousZ)) return [nextX, previousZ];
  if (!isHubPositionBlocked(previousX, nextZ)) return [previousX, nextZ];
  return [previousX, previousZ];
}

/**
 * Slides along furniture instead of stopping dead. The hub has no wall clamp;
 * only the furniture footprints are solid. A long frame is swept in short steps
 * so it cannot tunnel through the desk. A camera that already starts inside a
 * footprint (scripted placement) may always move, so it can never be trapped.
 */
export function constrainHubMovement(
  previousX: number,
  previousZ: number,
  nextX: number,
  nextZ: number,
): [number, number] {
  if (isHubPositionBlocked(previousX, previousZ)) return [nextX, nextZ];
  const steps = Math.max(1, Math.ceil(Math.hypot(nextX - previousX, nextZ - previousZ) / HUB_MAX_STEP));
  // Fixed increments: a blocked axis simply stops advancing, it never catches up.
  const dx = (nextX - previousX) / steps;
  const dz = (nextZ - previousZ) / steps;
  let x = previousX;
  let z = previousZ;
  for (let step = 0; step < steps; step++) [x, z] = slideStep(x, z, x + dx, z + dz);
  return [x, z];
}
