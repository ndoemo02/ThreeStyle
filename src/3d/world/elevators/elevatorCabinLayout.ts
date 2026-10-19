/**
 * Elevator cabin layout in cabin-local metres (doors at +z, the call panel wall at -z).
 * The same cabin stands in the corridor (front wall face at local z 2.68) and behind the
 * Creator Room's brick opening (wall face at local z 2.90), so anything on the front has
 * to read in both. The door leaves run behind the brick and inside the corridor pockets.
 */

/** `tone` bakes a fixed brightness into the vertex colour (e.g. the dark seam between the doors). */
export type CabinBox = { position: [number, number, number]; size: [number, number, number]; tone?: number };

// ── Interior shell (unlit, baked shading) ──────────────────────────────────
/** Side, back and front walls; the free volume inside (|x| < 1.75, z -2.25…2.35) stays empty. */
export const CABIN_WALLS: CabinBox[] = [
  { position: [-2.1, 1.75, 0], size: [0.35, 3.5, 5] },
  { position: [2.1, 1.75, 0], size: [0.35, 3.5, 5] },
  { position: [0, 1.75, -2.4], size: [3.8, 3.5, 0.35] },
  { position: [-1.75, 1.75, 2.73], size: [0.9, 3.5, 0.18] },
  { position: [1.75, 1.75, 2.73], size: [0.9, 3.5, 0.18] },
];
export const CABIN_FLOOR: CabinBox[] = [
  { position: [0, 0.05, 0], size: [4.4, 0.1, 5] },
];
export const CABIN_CEILING: CabinBox[] = [
  { position: [0, 3.45, 0], size: [4.4, 0.15, 5] },
];
/** Brass: door sill, handrails on three walls, a frame behind the destination panel. */
export const CABIN_BRASS: CabinBox[] = [
  { position: [0, 0.04, 2.65], size: [2.6, 0.08, 0.7] },
  { position: [-1.87, 0.95, 0.15], size: [0.05, 0.05, 4.1] },
  { position: [1.87, 0.95, 0.15], size: [0.05, 0.05, 4.1] },
  { position: [0, 0.95, -2.17], size: [3.3, 0.05, 0.05] },
  { position: [0, 1.85, -2.215], size: [1.92, 0.91, 0.02] },
];

// ── Front: frame, cladding, call panel (lit by the zone's own lights) ───────
/**
 * Door frame posts and lintel. Outer edge stays at half-width 1.56, top 3.55, front z 2.975 —
 * the Creator Room halo is laid out around it (creatorAccentLayout ELEVATOR_FRAME).
 */
export const FRAME_BOXES: CabinBox[] = [
  { position: [-1.47, 1.75, 2.8], size: [0.18, 3.6, 0.35] },
  { position: [1.47, 1.75, 2.8], size: [0.18, 3.6, 0.35] },
  { position: [0, 3.45, 2.8], size: [3.12, 0.2, 0.35] },
  { position: [0, 0.12, 2.8], size: [2.95, 0.06, 0.2] },
];
/** Door leaves: centre z and the open/closed x of each leaf's centre (see ElevatorA door travel). */
export const DOOR = { z: 2.84, closedX: 0.65, openX: 1.95, width: 1.3, height: 3.4, depth: 0.1 };
/**
 * Corridor-side pockets the open leaves slide into, from the plaster face (2.68) to just in front
 * of the leaves; the frame posts stand 3.5 cm proud of them. Hub only: in the room the brick does this.
 */
export const HUB_POCKETS: CabinBox[] = [
  { position: [-2.13, 1.775, 2.81], size: [1.14, 3.55, 0.26] },
  { position: [2.13, 1.775, 2.81], size: [1.14, 3.55, 0.26] },
];
/** Fills the corridor opening above the cabin (3.5…4.8 m) behind the destination sign; hub only. */
export const HUB_HEADER: CabinBox = { position: [0, 4.15, 2.7], size: [4.4, 1.3, 0.04] };
/**
 * Call panel right of the door as seen from outside (local +x), in front of the leaves' travel:
 * 2 cm proud of the corridor pocket, 6 cm proud of the room's brick.
 */
export const CALL_PANEL: CabinBox = { position: [1.85, 1.35, 2.93], size: [0.16, 0.36, 0.06] };

// ── Light (emissive, one material) ──────────────────────────────────────────
const FRAME_FRONT_Z = 2.977;
export const CABIN_LED: CabinBox[] = [
  // Cove along the top of both side walls and the back wall.
  { position: [-1.9, 3.33, 0.2], size: [0.03, 0.03, 4.8] },
  { position: [1.9, 3.33, 0.2], size: [0.03, 0.03, 4.8] },
  { position: [0, 3.33, -2.2], size: [3.8, 0.03, 0.03] },
  // Skirting light on the side walls.
  { position: [-1.9, 0.16, 0], size: [0.035, 0.03, 4.6] },
  { position: [1.9, 0.16, 0], size: [0.035, 0.03, 4.6] },
  // Downlights in the ceiling.
  ...[-0.9, 0.9].flatMap(x => [-1.4, 0, 1.4].map(z => ({ position: [x, 3.37, z] as [number, number, number], size: [0.18, 0.01, 0.18] as [number, number, number] }))),
  // Warm line on the inner edge of the frame front (Room.B).
  { position: [-1.395, 1.75, FRAME_FRONT_Z], size: [0.03, 3.2, 0.004] },
  { position: [1.395, 1.75, FRAME_FRONT_Z], size: [0.03, 3.2, 0.004] },
  { position: [0, 3.335, FRAME_FRONT_Z], size: [2.82, 0.03, 0.004] },
  // Call button ring and arrow on the panel face.
  { position: [1.85, 1.29, 2.962], size: [0.07, 0.07, 0.004] },
  { position: [1.85, 1.43, 2.962], size: [0.03, 0.05, 0.004] },
];

/**
 * Outer face of one door leaf, in the leaf's own space; `side` is -1 for the left leaf, +1 for the right.
 * A dark strip on the meeting edge draws the seam between the closed doors.
 */
export function doorFaceBoxes(side: -1 | 1): CabinBox[] {
  const edge = -side * DOOR.width / 2, face = DOOR.depth / 2 + 0.001;
  return [
    { position: [side * 0.01, 0, face], size: [DOOR.width - 0.02, DOOR.height, 0.002], tone: 1 },
    { position: [edge + side * 0.01, 0, face + 0.001], size: [0.02, DOOR.height, 0.002], tone: 0.25 },
  ];
}

/** UV scale of each BoxGeometry face (px, nx, py, ny, pz, nz) so one texture repeat is one metre. */
export function faceUvScale(face: number, size: readonly [number, number, number]): [number, number] {
  const [width, height, depth] = size;
  if (face < 2) return [depth, height];
  if (face < 4) return [width, depth];
  return [width, height];
}

/**
 * Baked light for the unlit interior: darker by the floor, brightest under the cove.
 * Height in cabin metres; returns a brightness multiplier.
 */
export function cabinShade(y: number) {
  const t = Math.max(0, Math.min(1, (y - 0.1) / 3.2));
  return 0.5 + 0.5 * t * t * (3 - 2 * t);
}
