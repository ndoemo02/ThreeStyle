import type { LobbyBoxSpec } from './LobbyMeshes';

/**
 * Lobby light pass (C2, Lobby.B mood): cove strips where the walls meet the ceiling, a curved LED
 * line across the ceiling, walls darker low and washed warm under the cove, large glossy floor
 * tiles with the downlights reflected in them. Hub world coordinates, metres.
 */

/** Wall faces of the 20 × 20 m hall and the openings no strip may cross. */
export const LOBBY_WALL_FACE = 9.82;
export const LOBBY_OPENINGS = {
  /** Entry door gap in the front wall (z = 10). */
  entry: { minX: 2.1, maxX: 5.9 },
  /** Corridor mouth in the left wall (x = -10). */
  corridor: { minZ: -6.2, maxZ: -3.8 },
};

/** Below the ceiling baffles (bottom ≈ 4.64), 7 cm off the wall. */
const COVE_Y = 4.6;
const COVE_INSET = LOBBY_WALL_FACE - 0.07;
const strip = (along: 'x' | 'z', fixed: number, from: number, to: number): LobbyBoxSpec => along === 'x'
  ? { position: [(from + to) / 2, COVE_Y, fixed], size: [to - from, 0.06, 0.06] }
  : { position: [fixed, COVE_Y, (from + to) / 2], size: [0.06, 0.06, to - from] };

export const LOBBY_COVE_LED: LobbyBoxSpec[] = [
  strip('x', -COVE_INSET, -COVE_INSET, COVE_INSET),
  strip('z', COVE_INSET, -COVE_INSET, COVE_INSET),
  strip('x', COVE_INSET, -COVE_INSET, LOBBY_OPENINGS.entry.minX - 0.1),
  strip('x', COVE_INSET, LOBBY_OPENINGS.entry.maxX + 0.1, COVE_INSET),
  strip('z', -COVE_INSET, -COVE_INSET, LOBBY_OPENINGS.corridor.minZ - 0.1),
  strip('z', -COVE_INSET, LOBBY_OPENINGS.corridor.maxZ + 0.1, COVE_INSET),
];

/**
 * Curved LED line across the ceiling (Lobby.B): an arc bowing towards the screen wall, ending
 * inside the existing ceiling LED frame (x ±8.8, z ±7.2).
 */
export const LOBBY_CEILING_ARC = {
  center: [0, 6] as [number, number],
  radius: 11,
  thetaStart: Math.PI * 1.22,
  thetaLength: Math.PI * 0.56,
  y: 4.6,
  /** Thin lines alias into dashes at phone DPR from across the hall. */
  width: 0.1,
};

export function lobbyArcPoint(theta: number): [number, number] {
  const { center, radius } = LOBBY_CEILING_ARC;
  return [center[0] + radius * Math.cos(theta), center[1] + radius * Math.sin(theta)];
}

/** Floor tile size and the light that shapes walls and floor (linear values used in the shaders). */
export const LOBBY_FLOOR_TILE = 1.2;
export const LOBBY_WALL_LIGHT = {
  /** Walls are this bright at the floor, full brightness from `shadeHeight` up. */
  floorShade: 0.5,
  shadeHeight: 3.2,
  /** Cove wash: brightest at the ceiling, gone `washDepth` below it. */
  ceiling: 4.8,
  washDepth: 2.1,
  washStrength: 2.6,
};
/** Downlight reflections on the glossy floor: spot radius (m), stretch towards the viewer, strength. */
export const LOBBY_REFLECTION = { height: 4.72, radius: 0.16, stretch: 3.2, strength: 1.1 };

/**
 * Where a ceiling light at `light` appears mirrored in the floor (y = 0) for a camera at `camera`:
 * the floor point on the line from the camera to the light's mirror image below the floor.
 */
export function mirroredLightOnFloor(camera: [number, number, number], light: [number, number, number]): [number, number] {
  const k = camera[1] / (camera[1] + light[1]);
  return [camera[0] + (light[0] - camera[0]) * k, camera[2] + (light[2] - camera[2]) * k];
}
