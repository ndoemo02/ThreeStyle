/**
 * Event Room — legacy compatibility layer over `eventRoomGeometrySpec.ts`.
 *
 * Two things live here and nothing else:
 *
 * 1. The full arena spec, re-exported unchanged. New code should import
 *    `./eventRoomGeometrySpec` directly; this re-export exists so the current
 *    navigation and renderer imports keep working while the arena is built.
 * 2. The legacy, render-facing constants of the *current* rectangular room —
 *    straight lounge banks at Y = 0.18 / 0.42, their Z tables, the hand-written
 *    nav-surface table and the rectangular movement clamp. `EventRoomLoungeBanks`
 *    and `EventRoomPodium` still read these, so their values are frozen
 *    bit-for-bit until the stage that rebuilds each renderer.
 *
 * Do not mix the two. The arena values (lounge tops 0.24 / 0.58, elliptical runs,
 * `getEventRoomSurfaces()`) are not wired into rendering, collision or camera
 * clamping yet — see the stage boundary note in `eventRoomGeometrySpec.ts`.
 *
 * `EVENT_ROOM_EYE_HEIGHT` and `constrainEventRoomMovement` are consumed by
 * `BaseNavigationControls`, which drives Hub and Creator Room too: their
 * signatures and behaviour must stay identical.
 */
import {
  EVENT_ROOM_FLOOR_Y,
  isEventRoomPositionBlocked,
  mirrorPolygonAcrossX,
  type EventRoomLoungeTier,
  type EventRoomNavSurface,
  type EventRoomPoint2D,
  type EventRoomSide,
} from './eventRoomGeometrySpec';

export * from './eventRoomGeometrySpec';

export const EVENT_ROOM_EYE_HEIGHT = 1.68;

// ── Legacy render-facing constants (current room, frozen values) ─────────────

export const EVENT_ROOM_STAGE_SURFACE_Y = 0.46;
export const EVENT_ROOM_RUNWAY_SURFACE_Y = 0.3;
export const EVENT_ROOM_END_PAD_SURFACE_Y = 0.28;
export const EVENT_ROOM_INNER_LOUNGE_SURFACE_Y = 0.18;
export const EVENT_ROOM_OUTER_LOUNGE_SURFACE_Y = 0.42;

export const EVENT_ROOM_DESKTOP_LOUNGE_Z = [-1.6, 0, 1.6, 3.2, 4.8, 6.4] as const;
export const EVENT_ROOM_MOBILE_LOUNGE_Z = [-1.2, 1.2, 3.6, 6.0] as const;
export const EVENT_ROOM_DESKTOP_LOUNGE_SEGMENT_LENGTH = 1.72;
export const EVENT_ROOM_MOBILE_LOUNGE_SEGMENT_LENGTH = 2.55;

export function getEventRoomLoungeAbsX(tier: EventRoomLoungeTier, z: number) {
  const normalized = (z - 2.4) / 4.8;
  return tier === 'inner'
    ? 4.55 + 0.65 * normalized * normalized
    : 7.65 + 0.55 * normalized * normalized;
}

export function getEventRoomLoungeYaw(tier: EventRoomLoungeTier, z: number, side: EventRoomSide) {
  const coefficient = tier === 'inner' ? 0.65 : 0.55;
  const derivative = (2 * coefficient * (z - 2.4)) / (4.8 * 4.8);
  return side * Math.atan(derivative);
}

const RIGHT_INNER_LOUNGE: readonly EventRoomPoint2D[] = [
  [3.45, -3.05],
  [6.35, -3.05],
  [5.95, 7.25],
  [3.45, 7.25],
  [3.05, 4.8],
  [3.05, -0.2],
];

const RIGHT_OUTER_LOUNGE: readonly EventRoomPoint2D[] = [
  [6.15, -3.05],
  [9.75, -3.05],
  [9.75, 7.55],
  [6.25, 7.55],
  [5.95, 4.8],
  [5.95, -0.2],
];

/**
 * Legacy nav-surface table of the current rectangular room. Superseded by
 * `getEventRoomSurfaces()`, which returns the arena contract (7 active surfaces
 * out of 14 stable ids); consumers switch over in the footprint stage.
 */
export const EVENT_ROOM_NAV_SURFACES: readonly EventRoomNavSurface[] = [
  {
    id: 'floor',
    footprint: { kind: 'aabb', minX: -10.85, maxX: 10.85, minZ: -7.1, maxZ: 11.95 },
    surfaceTopY: EVENT_ROOM_FLOOR_Y,
    access: 'walkable',
  },
  {
    id: 'runway',
    footprint: { kind: 'aabb', minX: -1.47, maxX: 1.47, minZ: -4.75, maxZ: 7.2 },
    surfaceTopY: EVENT_ROOM_RUNWAY_SURFACE_Y,
    access: 'blocked',
  },
  {
    id: 'stage',
    footprint: { kind: 'ellipse', center: [0, -7], radiusX: 5.85, radiusZ: 2.7 },
    surfaceTopY: EVENT_ROOM_STAGE_SURFACE_Y,
    access: 'blocked',
  },
  {
    id: 'lounge-inner-right',
    footprint: { kind: 'polygon', points: RIGHT_INNER_LOUNGE },
    surfaceTopY: EVENT_ROOM_INNER_LOUNGE_SURFACE_Y,
    access: 'blocked',
  },
  {
    id: 'lounge-inner-left',
    footprint: { kind: 'polygon', points: mirrorPolygonAcrossX(RIGHT_INNER_LOUNGE) },
    surfaceTopY: EVENT_ROOM_INNER_LOUNGE_SURFACE_Y,
    access: 'blocked',
  },
  {
    id: 'lounge-outer-right',
    footprint: { kind: 'polygon', points: RIGHT_OUTER_LOUNGE },
    surfaceTopY: EVENT_ROOM_OUTER_LOUNGE_SURFACE_Y,
    access: 'blocked',
  },
  {
    id: 'lounge-outer-left',
    footprint: { kind: 'polygon', points: mirrorPolygonAcrossX(RIGHT_OUTER_LOUNGE) },
    surfaceTopY: EVENT_ROOM_OUTER_LOUNGE_SURFACE_Y,
    access: 'blocked',
  },
];

// ── Movement (unchanged) ─────────────────────────────────────────────────────
// Rectangular clamp of the current room. The elliptical boundary arrives with the
// footprint stage; until then this stays exactly as shipped.

function clampToEventRoomBounds(x: number, z: number): EventRoomPoint2D {
  return [
    Math.min(10.85, Math.max(-10.85, x)),
    Math.min(11.95, Math.max(-7.1, z)),
  ];
}

export function constrainEventRoomMovement(
  previousX: number,
  previousZ: number,
  nextX: number,
  nextZ: number,
): EventRoomPoint2D {
  const [candidateX, candidateZ] = clampToEventRoomBounds(nextX, nextZ);
  if (!isEventRoomPositionBlocked(candidateX, candidateZ)) return [candidateX, candidateZ];

  const [xOnlyX, xOnlyZ] = clampToEventRoomBounds(candidateX, previousZ);
  if (!isEventRoomPositionBlocked(xOnlyX, xOnlyZ)) return [xOnlyX, xOnlyZ];

  const [zOnlyX, zOnlyZ] = clampToEventRoomBounds(previousX, candidateZ);
  if (!isEventRoomPositionBlocked(zOnlyX, zOnlyZ)) return [zOnlyX, zOnlyZ];

  return clampToEventRoomBounds(previousX, previousZ);
}
