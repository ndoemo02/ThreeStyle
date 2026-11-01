/**
 * Creator Room light accents in the Room.B reference: LED under the sofa and the TV cabinet,
 * a glowing frame around the elevator opening and a grazing wash down the brick wall.
 * None of them is a real light: the strips are emissive bars, and the light they throw is added
 * in the floor and brick shaders (scaled by the surface albedo), so it keeps the texture and
 * costs no transparent overdraw.
 * Room-local coordinates (the room is mounted at the origin). Footprints measured in the browser
 * from the loaded sofa and cabinet (2026-10-17).
 */
export type Vec3 = [number, number, number];

/** A floor LED edge: light falls on the floor in front of it, along `outward` (unit, xz). */
export interface FloorEdge {
  from: [number, number];
  to: [number, number];
  outward: [number, number];
}

/** Hidden LED bar: centre and size. */
export interface LedBar {
  position: Vec3;
  size: Vec3;
}

/** Inner face of the brick front wall (wall centre z = 7, 0.5 m thick). */
export const FRONT_WALL_FACE_Z = 6.74;
/** Brick wash: brightest under the ceiling cove, gone this far below it. */
export const BRICK_WASH = { top: 4.95, depth: 1.7 };
/** Light reach of the floor LEDs and the elevator halo (metres). */
export const FLOOR_GLOW_REACH = 0.85;
export const FRAME_HALO_REACH = 0.5;

/** Outer edge of the elevator's brass trim as seen from the room (ElevatorA TRIM_BOXES at ELEVATOR_ROOM_POSITION). */
export const ELEVATOR_FRAME = { halfWidth: 1.57, height: 3.56, frontZ: 6.665 };

/** Sofa: an L along the right wall and the front wall; LED along its three room-facing edges. */
const SOFA_EDGES: FloorEdge[] = [
  { from: [4.58, -0.38], to: [4.58, 4.52], outward: [-1, 0] },
  { from: [1.72, 4.52], to: [4.58, 4.52], outward: [0, -1] },
  { from: [1.72, 4.52], to: [1.72, 6.72], outward: [-1, 0] },
];
/** TV cabinet along the left wall, front face towards +x. */
const CABINET_EDGES: FloorEdge[] = [
  { from: [-5.33, 0.17], to: [-5.33, 6.23], outward: [1, 0] },
];

export const FLOOR_LED_EDGES: FloorEdge[] = [...SOFA_EDGES, ...CABINET_EDGES];

const BAR = 0.045;
export const ACCENT_LED_BARS: LedBar[] = [
  ...FLOOR_LED_EDGES.map(({ from, to, outward }) => ({
    position: [(from[0] + to[0]) / 2 - outward[0] * 0.08, 0.05, (from[1] + to[1]) / 2 - outward[1] * 0.08] as Vec3,
    size: [Math.abs(to[0] - from[0]) || BAR, BAR, Math.abs(to[1] - from[1]) || BAR] as Vec3,
  })),
  // Elevator frame: a lit reveal hugging the trim.
  { position: [-ELEVATOR_FRAME.halfWidth - 0.02, ELEVATOR_FRAME.height / 2, ELEVATOR_FRAME.frontZ], size: [0.04, ELEVATOR_FRAME.height, 0.04] },
  { position: [ELEVATOR_FRAME.halfWidth + 0.02, ELEVATOR_FRAME.height / 2, ELEVATOR_FRAME.frontZ], size: [0.04, ELEVATOR_FRAME.height, 0.04] },
  { position: [0, ELEVATOR_FRAME.height + 0.02, ELEVATOR_FRAME.frontZ], size: [ELEVATOR_FRAME.halfWidth * 2 + 0.08, 0.04, 0.04] },
];

/** Ceiling downlights (x, z): emissive discs; their light pools are drawn by the floor shader. */
export const DOWNLIGHTS: [number, number][] = [
  [-4, -2.6], [0, -2.6], [4, -2.6],
  [-4, 2.4], [0, 2.4], [4, 2.4],
];
export const DOWNLIGHT_POOL_RADIUS = 1.35;
/** Burgundy rug in front of the sofa, clear of the sofa, the cabinet and the elevator landing. */
export const RUG = { minX: -3.9, maxX: 1.45, minZ: 0.35, maxZ: 5.25 };
/**
 * Slatted ceiling field, framed and inset ~0.5 m from the perimeter LED cove so the frame never hides
 * the strip from anywhere in the room (sight lines checked from z = -5.5 to the wall).
 */
export const CEILING = { y: 5.0, minX: -6.2, maxX: 6.2, minZ: -5.2, maxZ: 6.2, slatSpacing: 0.24 };
