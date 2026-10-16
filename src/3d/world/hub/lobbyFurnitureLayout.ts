import type { LobbyBoxSpec, LobbyPlaneSpec } from './LobbyMeshes';

/** Axis-aligned floor rectangle in hub world coordinates (metres). */
export type LobbyFloorRect = { minX: number; maxX: number; minZ: number; maxZ: number };

/**
 * Areas that must stay free for movement and framing: the entry threshold
 * (door at x=4, z=10, intro ends at [4, 2.05, 6.2]) and the route along the floor
 * arrows to the corridor mouth (x=-10, z -6.3…-3.7).
 */
export const LOBBY_KEEP_CLEAR: Record<'entry' | 'corridorRoute', LobbyFloorRect> = {
  entry: { minX: 1.5, maxX: 6.5, minZ: 3.5, maxZ: 10 },
  corridorRoute: { minX: -10, maxX: 4.5, minZ: -6.6, maxZ: -3.4 },
};

/** Intro camera end point and the welcome board it frames. */
export const LOBBY_SIGHTLINE = { from: [4, 6.2] as const, to: [0, -9.4] as const, halfWidth: 1.2 };

// ── Reception / community desk, in front of the original seating niche ──────
// The niche back panel and paint tiles stay; the desk reads as its counter.
const DESK_X = -9.2;
const DESK_Z0 = -0.3;
const DESK_Z1 = 3.5;
const DESK_MID = (DESK_Z0 + DESK_Z1) / 2;
const DESK_LENGTH = DESK_Z1 - DESK_Z0;

export const RECEPTION_COUNTER: LobbyBoxSpec[] = [
  { position: [DESK_X, 0.55, DESK_MID], size: [1, 0.9, DESK_LENGTH] },
  { position: [DESK_X, 0.05, DESK_MID], size: [0.9, 0.1, DESK_LENGTH] },
  { position: [DESK_X + 0.05, 1.06, DESK_MID], size: [1.2, 0.06, DESK_LENGTH] },
];
/** Half-round desk ends, [x, z, startAngle] — rounded silhouette without a GLB. */
export const RECEPTION_CAPS: Array<{ position: [number, number, number]; radius: number; height: number; thetaStart: number }> = [
  { position: [DESK_X, 0.55, DESK_Z0], radius: 0.5, height: 0.9, thetaStart: Math.PI / 2 },
  { position: [DESK_X, 0.55, DESK_Z1], radius: 0.5, height: 0.9, thetaStart: -Math.PI / 2 },
  { position: [DESK_X + 0.05, 1.06, DESK_Z0], radius: 0.6, height: 0.06, thetaStart: Math.PI / 2 },
  { position: [DESK_X + 0.05, 1.06, DESK_Z1], radius: 0.6, height: 0.06, thetaStart: -Math.PI / 2 },
];
export const RECEPTION_WOOD: LobbyBoxSpec[] = [
  { position: [-8.66, 0.58, DESK_MID], size: [0.08, 0.86, DESK_LENGTH - 0.1] },
];
export const RECEPTION_BRASS: LobbyBoxSpec[] = [
  { position: [-8.55, 1.025, DESK_MID], size: [0.02, 0.025, DESK_LENGTH] },
];
export const RECEPTION_LED: LobbyBoxSpec[] = [
  { position: [-8.69, 0.07, DESK_MID], size: [0.02, 0.02, DESK_LENGTH - 0.2] },
];

// ── Lounge in the back-right corner, between the slat wall and the mural ─────
const FABRIC_Y = 0.27;
export const LOUNGE_FABRIC: LobbyBoxSpec[] = [
  // Main run along the slat wall.
  { position: [7.1, FABRIC_Y, -9.16], size: [5, 0.38, 0.92] },
  { position: [7.1, 0.66, -9.52], size: [5, 0.42, 0.22] },
  { position: [4.7, 0.5, -9.16], size: [0.2, 0.5, 0.92] },
  // Return along the right wall, below the mural.
  { position: [9.14, FABRIC_Y, -7.74], size: [0.92, 0.38, 2] },
  { position: [9.5, 0.66, -7.74], size: [0.22, 0.42, 2] },
  { position: [9.14, 0.5, -6.84], size: [0.92, 0.5, 0.2] },
];
export const LOUNGE_PLINTH: LobbyBoxSpec[] = [
  { position: [7.1, 0.04, -9.16], size: [4.9, 0.08, 0.86] },
  { position: [9.14, 0.04, -7.79], size: [0.86, 0.08, 1.9] },
];
export const LOUNGE_PILLOWS: LobbyBoxSpec[] = [
  { position: [5.5, 0.62, -9.3], size: [0.46, 0.4, 0.14], rotation: [-0.2, 0.15, 0] },
  { position: [8.85, 0.62, -9.3], size: [0.46, 0.4, 0.14], rotation: [-0.2, -0.5, 0] },
];
export const LOUNGE_TABLE = { position: [6.7, 0, -7.6] as [number, number, number], radius: 0.6 };
export const LOUNGE_RUG = { position: [6.9, 0.01, -7.7] as [number, number, number], radius: 2 };
export const LOUNGE_LAMP = { position: [4.15, 0, -9.35] as [number, number, number] };
export const LOUNGE_LED: LobbyBoxSpec[] = [
  // Candle on the coffee table.
  { position: [6.7, 0.47, -7.6], size: [0.09, 0.12, 0.09] },
];

/** Contact shadows ground the new furniture without shadow maps. */
export const FURNITURE_SHADOWS: LobbyPlaneSpec[] = [
  { position: [DESK_X, 0.008, DESK_MID], size: [1.5, DESK_LENGTH + 1.2], rotation: [-Math.PI / 2, 0, 0] },
  { position: [7.1, 0.024, -9.1], size: [5.4, 1.3], rotation: [-Math.PI / 2, 0, 0] },
  { position: [9.1, 0.024, -7.7], size: [1.3, 2.4], rotation: [-Math.PI / 2, 0, 0] },
  { position: [6.7, 0.025, -7.6], size: [1.6, 1.6], rotation: [-Math.PI / 2, 0, 0] },
];

/**
 * Solid footprints for hub movement. Planters are deliberately absent: their
 * count changes with the quality tier and an invisible blocker would be worse.
 */
export const LOBBY_OBSTACLES: LobbyFloorRect[] = [
  { minX: -9.82, maxX: -8.48, minZ: DESK_Z0 - 0.55, maxZ: DESK_Z1 + 0.55 },
  { minX: 4.55, maxX: 9.82, minZ: -9.82, maxZ: -8.68 },
  { minX: 8.65, maxX: 9.82, minZ: -8.75, maxZ: -6.7 },
  { minX: 6.1, maxX: 7.3, minZ: -8.2, maxZ: -7 },
  { minX: 3.95, maxX: 4.35, minZ: -9.55, maxZ: -9.15 },
];

// ── Light accents ────────────────────────────────────────────────────────────
// Ceiling baffles sit at x = -13.6 + 0.8·i; downlights use the gaps between them.
const DOWNLIGHT_SPOTS: Array<[number, number]> = [
  [-8.4, 0.2], [-8.4, 1.6], [-8.4, 3],
  [5.2, -7.6], [6.8, -7.6], [8.4, -7.6],
  [-2, -8.4], [2, -8.4],
  [-6, -1.5], [-2, -1.5], [2, -1.5], [6, -1.5],
  [-6, 3.5], [-2, 3.5], [2, 3.5], [6, 3.5],
  [-8.4, -2.4], [8.4, -2], [8.4, 2],
];
export const LOBBY_DOWNLIGHT_X_GRID = { origin: -13.2, step: 0.8 };
export const LOBBY_DOWNLIGHTS: LobbyBoxSpec[] = DOWNLIGHT_SPOTS.map(([x, z]) => ({
  position: [x, 4.72, z], size: [0.2, 0.012, 0.2],
}));

/** Always-on LED trims that join the existing merged LED batch. */
export const LOBBY_ACCENT_LED: LobbyBoxSpec[] = [
  ...RECEPTION_LED,
  ...LOUNGE_LED,
  // Under the welcome screen and along the foot of the slat wall.
  { position: [0, 0.9, -9.42], size: [6.4, 0.03, 0.04] },
  { position: [0, 0.035, -9.66], size: [19.2, 0.03, 0.04] },
  // Directory edge light.
  { position: [-9.74, 0.78, -2.4], size: [0.03, 0.03, 1.2] },
];

/** Soft glow planes; skipped on the lowest tier to save mobile fill rate. */
export const LOBBY_ACCENT_GLOW: LobbyPlaneSpec[] = [
  { position: [-8.6, 0.32, DESK_MID], size: [DESK_LENGTH, 0.64], rotation: [0, Math.PI / 2, 0] },
  { position: [0, 0.62, -9.45], size: [6.6, 0.6] },
  { position: [0, 0.42, -9.69], size: [19.2, 0.84] },
];

/** Floor light pools in priority order; each tier takes the first `poolCount`. */
export const LOBBY_LIGHT_POOLS: LobbyPlaneSpec[] = [
  { position: [-8.2, 0.03, DESK_MID], size: [2.8, 5.6], rotation: [-Math.PI / 2, 0, 0] },
  { position: [6.8, 0.035, -7.6], size: [4.6, 4], rotation: [-Math.PI / 2, 0, 0] },
  { position: [-8.9, 0.03, -2.4], size: [2.2, 2.6], rotation: [-Math.PI / 2, 0, 0] },
  { position: [0, 0.03, -8.7], size: [7.6, 2.2], rotation: [-Math.PI / 2, 0, 0] },
  { position: [8.7, 0.03, 0], size: [2, 6], rotation: [-Math.PI / 2, 0, 0] },
];

/** Planter spots in priority order (reception, lounge, then decoration). */
export const LOBBY_PLANTER_POSITIONS: Array<[number, number, number]> = [
  [-9, 0, 4.95],
  [8.7, 0, -4.3],
  [-7.2, 0, -8.8],
  [8.7, 0, 5.4],
];

/** Wall-mounted wayfinding next to the corridor mouth and the backlit desk logo. */
export const LOBBY_DIRECTORY = { position: [-9.76, 1.85, -2.4] as [number, number, number], size: [1.15, 2.1] as [number, number] };
export const LOBBY_DESK_LOGO = { position: [-9.79, 4.18, DESK_MID] as [number, number, number], size: [3, 0.75] as [number, number] };
