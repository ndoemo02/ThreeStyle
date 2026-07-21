export const EVENT_ROOM_FLOOR_Y = 0;
export const EVENT_ROOM_EYE_HEIGHT = 1.68;
export const EVENT_ROOM_CAMERA_RADIUS = 0.35;

export const EVENT_ROOM_STAGE_SURFACE_Y = 0.46;
export const EVENT_ROOM_RUNWAY_SURFACE_Y = 0.3;
export const EVENT_ROOM_END_PAD_SURFACE_Y = 0.28;
export const EVENT_ROOM_INNER_LOUNGE_SURFACE_Y = 0.18;
export const EVENT_ROOM_OUTER_LOUNGE_SURFACE_Y = 0.42;

export const EVENT_ROOM_DESKTOP_LOUNGE_Z = [-1.6, 0, 1.6, 3.2, 4.8, 6.4] as const;
export const EVENT_ROOM_MOBILE_LOUNGE_Z = [-1.2, 1.2, 3.6, 6.0] as const;
export const EVENT_ROOM_DESKTOP_LOUNGE_SEGMENT_LENGTH = 1.72;
export const EVENT_ROOM_MOBILE_LOUNGE_SEGMENT_LENGTH = 2.55;

export type EventRoomLoungeTier = 'inner' | 'outer';
export type EventRoomSide = -1 | 1;
export type EventRoomSurfaceId =
  | 'floor'
  | 'runway'
  | 'stage'
  | 'lounge-inner-left'
  | 'lounge-inner-right'
  | 'lounge-outer-left'
  | 'lounge-outer-right';

export type EventRoomPoint2D = readonly [x: number, z: number];

export type EventRoomFootprint =
  | { kind: 'aabb'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'ellipse'; center: EventRoomPoint2D; radiusX: number; radiusZ: number }
  | { kind: 'polygon'; points: readonly EventRoomPoint2D[] };

export type EventRoomNavSurface = {
  id: EventRoomSurfaceId;
  footprint: EventRoomFootprint;
  surfaceTopY: number;
  access: 'walkable' | 'blocked';
};

export function centerYFromBottom(bottomY: number, height: number) {
  return bottomY + height / 2;
}

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

function mirrorPolygon(points: readonly EventRoomPoint2D[]): EventRoomPoint2D[] {
  return points.map(([x, z]) => [-x, z]);
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

const RIGHT_LOUNGE_COLLIDER: readonly EventRoomPoint2D[] = [
  [3.45, -3.4],
  [10.35, -3.4],
  [10.35, 7.9],
  [3.65, 7.9],
  [2.7, 4.9],
  [2.7, -0.25],
];

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
    footprint: { kind: 'polygon', points: mirrorPolygon(RIGHT_INNER_LOUNGE) },
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
    footprint: { kind: 'polygon', points: mirrorPolygon(RIGHT_OUTER_LOUNGE) },
    surfaceTopY: EVENT_ROOM_OUTER_LOUNGE_SURFACE_Y,
    access: 'blocked',
  },
];

const BLOCKED_FOOTPRINTS: readonly EventRoomFootprint[] = [
  { kind: 'polygon', points: RIGHT_LOUNGE_COLLIDER },
  { kind: 'polygon', points: mirrorPolygon(RIGHT_LOUNGE_COLLIDER) },
  { kind: 'aabb', minX: -1.47, maxX: 1.47, minZ: -4.75, maxZ: 7.2 },
  { kind: 'ellipse', center: [0, 6.15], radiusX: 1.95, radiusZ: 1.6 },
  { kind: 'ellipse', center: [0, -7], radiusX: 5.85, radiusZ: 2.7 },
];

function isPointInPolygon(x: number, z: number, points: readonly EventRoomPoint2D[]) {
  let inside = false;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current, current += 1) {
    const [currentX, currentZ] = points[current];
    const [previousX, previousZ] = points[previous];
    const crosses = (currentZ > z) !== (previousZ > z)
      && x < ((previousX - currentX) * (z - currentZ)) / (previousZ - currentZ) + currentX;
    if (crosses) inside = !inside;
  }
  return inside;
}

function footprintContains(footprint: EventRoomFootprint, x: number, z: number) {
  if (footprint.kind === 'aabb') {
    return x >= footprint.minX && x <= footprint.maxX && z >= footprint.minZ && z <= footprint.maxZ;
  }
  if (footprint.kind === 'ellipse') {
    const normalizedX = (x - footprint.center[0]) / footprint.radiusX;
    const normalizedZ = (z - footprint.center[1]) / footprint.radiusZ;
    return normalizedX * normalizedX + normalizedZ * normalizedZ <= 1;
  }
  return isPointInPolygon(x, z, footprint.points);
}

export function isEventRoomPositionBlocked(x: number, z: number) {
  return BLOCKED_FOOTPRINTS.some(footprint => footprintContains(footprint, x, z));
}

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
