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

// ── Round lounge islands (Lobby.B): curved modular sofa on a round rug with an LED edge ──
/**
 * Angles are world directions (cos a, sin a) in the x/z plane. The sofa runs from `arcStart`
 * over `arcLength`; the open side faces the room, so the seats read from the intro camera.
 */
export type LoungeIsland = {
  center: [number, number];
  /** Front edge of the seat; the back sits on the outer edge. */
  innerRadius: number;
  seatDepth: number;
  backDepth: number;
  arcStart: number;
  arcLength: number;
  segments: number;
  rugRadius: number;
  tableRadius: number;
};

const deg = (value: number) => value * Math.PI / 180;

export const LOUNGE_ISLANDS: LoungeIsland[] = [
  // Back right, in front of the slat wall: the hall's main accent, open towards the entry.
  {
    center: [7.1, -7.3], innerRadius: 1.2, seatDepth: 0.72, backDepth: 0.22,
    arcStart: deg(190), arcLength: deg(200), segments: 4, rugRadius: 2.35, tableRadius: 0.5,
  },
  // Front left, its back against the left wall between the desk and the entry wall;
  // the way into the hall stays on its right (Lobby.B foreground lounge).
  {
    center: [-7.4, 7], innerRadius: 1.2, seatDepth: 0.72, backDepth: 0.22,
    arcStart: deg(70), arcLength: deg(200), segments: 4, rugRadius: 2.35, tableRadius: 0.5,
  },
];

/** Gap between sofa modules, radians. */
export const LOUNGE_MODULE_GAP = 0.03;
/** Top of the recessed dark base the sofa modules sit on. */
export const LOUNGE_BASE_TOP = 0.1;
/** Sofa module GLB (scripts/build-lobby-sofa.mjs): centred on +x around the island centre. */
export const LOUNGE_SOFA_URL = '/models/lobby/sofa_module.glb';

/** Where each module goes: the island centre and the turn that brings its +x axis to the module middle. */
export function loungeModulePlacements(island: LoungeIsland): Array<{ x: number; z: number; rotationY: number }> {
  const step = island.arcLength / island.segments;
  // Turning by θ about +y maps the direction (cos a, sin a) in x/z to angle a − θ.
  return Array.from({ length: island.segments }, (_, index) => ({
    x: island.center[0], z: island.center[1], rotationY: -(island.arcStart + step * (index + 0.5)),
  }));
}

export function loungeIslandPoint(island: LoungeIsland, radius: number, angle: number): [number, number] {
  return [island.center[0] + radius * Math.cos(angle), island.center[1] + radius * Math.sin(angle)];
}

/** Centre of each sofa module's seat, for the collider check. */
export function loungeModuleCenters(island: LoungeIsland): Array<[number, number]> {
  const step = island.arcLength / island.segments;
  const radius = island.innerRadius + island.seatDepth / 2;
  return Array.from({ length: island.segments }, (_, index) =>
    loungeIslandPoint(island, radius, island.arcStart + step * (index + 0.5)));
}

/** One rect around the sofa arc and the table: the island is solid as a whole. */
function loungeIslandFootprint(island: LoungeIsland): LobbyFloorRect {
  const [cx, cz] = island.center;
  const outer = island.innerRadius + island.seatDepth + island.backDepth;
  const points: Array<[number, number]> = [
    [cx - island.tableRadius, cz - island.tableRadius], [cx + island.tableRadius, cz + island.tableRadius],
  ];
  for (let step = 0; step <= 48; step++) {
    const angle = island.arcStart + island.arcLength * step / 48;
    points.push(loungeIslandPoint(island, island.innerRadius, angle), loungeIslandPoint(island, outer, angle));
  }
  const xs = points.map(([x]) => x);
  const zs = points.map(([, z]) => z);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

/** Tall black planter (Lobby.B): pot radius at the rim and height. */
export const LOBBY_PLANTER_POT = { radius: 0.42, height: 0.9 };

/** Planter spots in priority order (beside the islands first: the phone tiers show only the first few). */
export const LOBBY_PLANTER_POSITIONS: Array<[number, number, number]> = [
  // Either side of the back-right island.
  [4.45, 0, -7.6],
  [8.7, 0, -4.3],
  // Beside the front-left island, then decoration.
  [-5.6, 0, 9.2],
  [-7.2, 0, -8.8],
  [8.7, 0, 5.4],
]

/**
 * Every quality tier shows at least this many planters, so the first ones can be solid without
 * an invisible blocker on a lower tier (the island trees stand in open floor).
 */
export const LOBBY_SOLID_PLANTERS = 2;

const planterFootprint = ([x, , z]: [number, number, number]): LobbyFloorRect => ({
  minX: x - LOBBY_PLANTER_POT.radius, maxX: x + LOBBY_PLANTER_POT.radius,
  minZ: z - LOBBY_PLANTER_POT.radius, maxZ: z + LOBBY_PLANTER_POT.radius,
});

/** Contact shadows ground the new furniture without shadow maps. */
export const FURNITURE_SHADOWS: LobbyPlaneSpec[] = [
  { position: [DESK_X, 0.008, DESK_MID], size: [1.5, DESK_LENGTH + 1.2], rotation: [-Math.PI / 2, 0, 0] },
  ...LOUNGE_ISLANDS.map(({ center: [x, z], tableRadius }): LobbyPlaneSpec => (
    { position: [x, 0.025, z], size: [tableRadius * 3, tableRadius * 3], rotation: [-Math.PI / 2, 0, 0] })),
];

/**
 * Solid footprints for hub movement. Only the planters every tier renders are solid:
 * the count changes with the quality tier and an invisible blocker would be worse.
 */
export const LOBBY_OBSTACLES: LobbyFloorRect[] = [
  { minX: -9.82, maxX: -8.48, minZ: DESK_Z0 - 0.55, maxZ: DESK_Z1 + 0.55 },
  ...LOUNGE_ISLANDS.map(loungeIslandFootprint),
  ...LOBBY_PLANTER_POSITIONS.slice(0, LOBBY_SOLID_PLANTERS).map(planterFootprint),
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
  // Over the front-left island.
  [-7.6, 7],
];
export const LOBBY_DOWNLIGHT_X_GRID = { origin: -13.2, step: 0.8 };
export const LOBBY_DOWNLIGHTS: LobbyBoxSpec[] = DOWNLIGHT_SPOTS.map(([x, z]) => ({
  position: [x, 4.72, z], size: [0.2, 0.012, 0.2],
}));

/** Always-on LED trims that join the existing merged LED batch. */
export const LOBBY_ACCENT_LED: LobbyBoxSpec[] = [
  ...RECEPTION_LED,
  ...LOUNGE_ISLANDS.map(({ center: [x, z] }): LobbyBoxSpec => ({ position: [x, 0.47, z], size: [0.09, 0.12, 0.09] })),
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


/** Wall-mounted wayfinding next to the corridor mouth and the backlit desk logo. */
export const LOBBY_DIRECTORY = { position: [-9.76, 1.85, -2.4] as [number, number, number], size: [1.15, 2.1] as [number, number] };
export const LOBBY_DESK_LOGO = { position: [-9.79, 4.18, DESK_MID] as [number, number, number], size: [3, 0.75] as [number, number] };
