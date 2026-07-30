/**
 * Event Room — arena geometry and navigation spec.
 *
 * Single source of truth for the oval arena described in
 * `docs/architecture/adr-004-event-room-arena.md` (variant B). Pure maths: no
 * React, no WebGL context, testable without a renderer.
 *
 * Stage 1 boundary — read before editing:
 * - Nothing in this module is wired into rendering yet. The renderers still read
 *   the legacy constants re-exported by `eventRoomLayout.ts` (lounge tops 0.18 /
 *   0.42, straight banks). The arena values here (lounge tops 0.24 / 0.58,
 *   elliptical runs) are consumed from stage 3 onwards.
 * - `isEventRoomPositionBlocked` intentionally still evaluates the *legacy*
 *   collider set, byte-for-byte as before, so movement is unchanged. Stage 7
 *   replaces it with footprints derived from `getEventRoomSurfaces()` plus
 *   `EVENT_ROOM_CAMERA_RADIUS`.
 * - `surfaceTopY` values below come from the approved plan tables (§4/§5).
 *   Stage 7 recomputes them from the final geometry instead.
 *
 * Dependency direction is fixed: `eventRoomLayout.ts` imports this module, never
 * the other way round.
 */
import * as THREE from 'three';

// ── Conventions ──────────────────────────────────────────────────────────────
// Y = 0 is the top of the floor slab, −Z is the stage, +Z is the exit, right-handed.
// Azimuth θ is measured from −Z and grows towards +X, so θ > 0 is the right-hand
// side of the room and mirroring across X is simply θ → −θ.
// Every θ in the runtime API is in RADIANS; the approved plan values are declared
// once in degrees and converted here.

export const EVENT_ROOM_FLOOR_Y = 0;

/** Player collision radius, also the margin between geometry and its collider. */
export const EVENT_ROOM_CAMERA_RADIUS = 0.35;

export function centerYFromBottom(bottomY: number, height: number) {
  return bottomY + height / 2;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type EventRoomPoint2D = readonly [x: number, z: number];
export type EventRoomLoungeTier = 'inner' | 'outer';
/** `1` = +X half of the room (right), `-1` = mirrored (left). */
export type EventRoomSide = -1 | 1;

/**
 * Surfaces that exist today: geometry, footprint and a `getEventRoomSurfaces()` entry.
 */
const ACTIVE_SURFACE_IDS = [
  'floor',
  'runway',
  'stage',
  'lounge-inner-left',
  'lounge-inner-right',
  'lounge-outer-left',
  'lounge-outer-right',
] as const;

/**
 * Stable ids reserved for the future "Walkable Lounge" stage. They exist in the
 * type only — no geometry, no footprint, and deliberately no entry in
 * `getEventRoomSurfaces()` until their geometry exists.
 */
const RESERVED_SURFACE_IDS = [
  'end-pad',
  'lounge-entry-left',
  'lounge-entry-right',
  'stair-inner-left',
  'stair-inner-right',
  'stair-outer-left',
  'stair-outer-right',
] as const;

export type EventRoomActiveSurfaceId = (typeof ACTIVE_SURFACE_IDS)[number];
export type EventRoomReservedSurfaceId = (typeof RESERVED_SURFACE_IDS)[number];
export type EventRoomSurfaceId = EventRoomActiveSurfaceId | EventRoomReservedSurfaceId;

export const EVENT_ROOM_ACTIVE_SURFACE_IDS: readonly EventRoomActiveSurfaceId[] = ACTIVE_SURFACE_IDS;
export const EVENT_ROOM_RESERVED_SURFACE_IDS: readonly EventRoomReservedSurfaceId[] = RESERVED_SURFACE_IDS;
export const EVENT_ROOM_SURFACE_IDS: readonly EventRoomSurfaceId[] = [
  ...ACTIVE_SURFACE_IDS,
  ...RESERVED_SURFACE_IDS,
];

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

export type EventRoomActiveNavSurface = EventRoomNavSurface & { id: EventRoomActiveSurfaceId };

// ── Arena shell ──────────────────────────────────────────────────────────────

/** Ellipse centre in XZ; also the centre of the runway. */
export const ARENA_CENTER: EventRoomPoint2D = [0, 1.1];
export const ARENA_RX = 12.6;
export const ARENA_RZ = 11.3;
/** Half-angle of the opening towards the stage, in degrees (shell spans 294°). */
export const ARENA_OPEN_HALF_DEG = 33;
export const ARENA_CEILING_Y = 7;

export const ARENA_SHELL_THETA_FROM = THREE.MathUtils.degToRad(ARENA_OPEN_HALF_DEG);
export const ARENA_SHELL_THETA_TO = THREE.MathUtils.degToRad(360 - ARENA_OPEN_HALF_DEG);

const [ARENA_CENTER_X, ARENA_CENTER_Z] = ARENA_CENTER;

/**
 * Point on the concentric ellipse scaled by `factor` (0 = centre, 1 = shell).
 * x = f·RX·sin θ, z = centreZ − f·RZ·cos θ.
 */
export function arenaPoint(factor: number, theta: number): EventRoomPoint2D {
  return [
    ARENA_CENTER_X + factor * ARENA_RX * Math.sin(theta),
    ARENA_CENTER_Z - factor * ARENA_RZ * Math.cos(theta),
  ];
}

/**
 * Y rotation that aligns a mesh's local +Z with the arena tangent at `theta`,
 * matching the legacy `getEventRoomLoungeYaw` convention. `side` flips the
 * traversal direction so a mirrored run keeps its profile facing outwards.
 * Independent of `factor` for `factor > 0`; degenerate (0) at the centre.
 */
export function arenaTangentYaw(factor: number, theta: number, side: EventRoomSide): number {
  return Math.atan2(
    side * factor * ARENA_RX * Math.cos(theta),
    side * factor * ARENA_RZ * Math.sin(theta),
  );
}

/**
 * Arc length in metres along the `factor` ellipse between two azimuths.
 * Composite Simpson over sqrt((f·RX·cos θ)² + (f·RZ·sin θ)²); `steps` is rounded
 * up to an even count. Elliptic arc length has no closed form, so this is the
 * authority for every seat-width and run-length claim in the plan.
 */
export function arenaArcLength(factor: number, thetaFrom: number, thetaTo: number, steps = 64): number {
  const span = thetaTo - thetaFrom;
  if (span === 0 || factor === 0) return 0;

  const intervals = Math.max(2, Math.ceil(Math.abs(steps) / 2) * 2);
  const stride = span / intervals;
  const speed = (theta: number) => Math.hypot(
    factor * ARENA_RX * Math.cos(theta),
    factor * ARENA_RZ * Math.sin(theta),
  );

  let total = speed(thetaFrom) + speed(thetaTo);
  for (let index = 1; index < intervals; index += 1) {
    total += speed(thetaFrom + index * stride) * (index % 2 === 0 ? 2 : 4);
  }
  return Math.abs((stride / 3) * total);
}

/**
 * Analytic curve along a concentric arena ellipse at a fixed height.
 *
 * One mechanism for every arena arc: hero/accent rings, LED fascia, lounge
 * sweeps and footprint outlines. `getPoint` and `getTangent` are closed-form, so
 * `TubeGeometry` keeps a constant tube cross-section — unlike a non-uniformly
 * scaled `TorusGeometry`, which is banned for arena rings.
 */
export class ArenaEllipseCurve extends THREE.Curve<THREE.Vector3> {
  override readonly type = 'ArenaEllipseCurve';

  readonly factor: number;
  readonly thetaFrom: number;
  readonly thetaTo: number;
  readonly y: number;

  constructor(factor: number, thetaFrom: number, thetaTo: number, y: number) {
    super();
    this.factor = factor;
    this.thetaFrom = thetaFrom;
    this.thetaTo = thetaTo;
    this.y = y;
  }

  override getPoint(t: number, optionalTarget: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const [x, z] = arenaPoint(this.factor, this.thetaFrom + (this.thetaTo - this.thetaFrom) * t);
    return optionalTarget.set(x, this.y, z);
  }

  override getTangent(t: number, optionalTarget: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const span = this.thetaTo - this.thetaFrom;
    const theta = this.thetaFrom + span * t;
    return optionalTarget
      .set(span * this.factor * ARENA_RX * Math.cos(theta), 0, span * this.factor * ARENA_RZ * Math.sin(theta))
      .normalize();
  }
}

export function arenaCurve(factor: number, thetaFrom: number, thetaTo: number, y: number): ArenaEllipseCurve {
  return new ArenaEllipseCurve(factor, thetaFrom, thetaTo, y);
}

/**
 * Closed ring for an annular arena sector: the `factorOuter` arc forwards, then
 * the `factorInner` arc backwards. Used for platform footprints and outlines.
 */
export function arenaSectorPolygon(
  factorInner: number,
  factorOuter: number,
  thetaFrom: number,
  thetaTo: number,
  steps = 16,
): EventRoomPoint2D[] {
  const segments = Math.max(1, Math.floor(steps));
  const span = thetaTo - thetaFrom;
  const points: EventRoomPoint2D[] = [];

  for (let index = 0; index <= segments; index += 1) {
    points.push(arenaPoint(factorOuter, thetaFrom + (span * index) / segments));
  }
  for (let index = segments; index >= 0; index -= 1) {
    points.push(arenaPoint(factorInner, thetaFrom + (span * index) / segments));
  }
  return points;
}

export function mirrorPolygonAcrossX(points: readonly EventRoomPoint2D[]): EventRoomPoint2D[] {
  return points.map(([x, z]) => [-x, z] as EventRoomPoint2D);
}

// ── Lounge terraces (arena spec — not yet rendered) ───────────────────────────

type LoungeTierSpec = {
  /** Centre-line factor of the platform. */
  factor: number;
  /** Platform width in metres, exact at θ = 90° (the widest point of each run). */
  platformWidth: number;
  surfaceTopY: number;
  platformThetaFromDeg: number;
  platformThetaToDeg: number;
  /** Usable sofa run, inset from the platform so the ends read as arm caps. */
  sofaThetaFromDeg: number;
  sofaThetaToDeg: number;
};

const LOUNGE_TIERS: Record<EventRoomLoungeTier, LoungeTierSpec> = {
  inner: {
    factor: 0.42,
    platformWidth: 2.25,
    surfaceTopY: 0.24,
    platformThetaFromDeg: 43,
    platformThetaToDeg: 137,
    sofaThetaFromDeg: 45.5,
    sofaThetaToDeg: 134.5,
  },
  outer: {
    factor: 0.67,
    platformWidth: 2.55,
    surfaceTopY: 0.58,
    platformThetaFromDeg: 62,
    platformThetaToDeg: 118,
    sofaThetaFromDeg: 65,
    sofaThetaToDeg: 115,
  },
};

export const LOUNGE_TIER_FACTOR: Record<EventRoomLoungeTier, number> = {
  inner: LOUNGE_TIERS.inner.factor,
  outer: LOUNGE_TIERS.outer.factor,
};

export const LOUNGE_SURFACE_TOP_Y: Record<EventRoomLoungeTier, number> = {
  inner: LOUNGE_TIERS.inner.surfaceTopY,
  outer: LOUNGE_TIERS.outer.surfaceTopY,
};

export const EVENT_ROOM_MIN_SEAT_WIDTH = 0.8;

/**
 * Approved capacity metadata — 2 × (9 + 7) = 32 seated positions. Capacity is a
 * decision, never a function of how many geometry segments a sweep ends up with.
 */
export const LOUNGE_CAPACITY = {
  inner: { seats: 9, seatWidth: 0.837, minSeatWidth: EVENT_ROOM_MIN_SEAT_WIDTH },
  outer: { seats: 7, seatWidth: 0.95, minSeatWidth: EVENT_ROOM_MIN_SEAT_WIDTH },
} as const;

export function loungeCapacity(tier: EventRoomLoungeTier) {
  return LOUNGE_CAPACITY[tier];
}

export type EventRoomLoungeRun = {
  /** Usable sofa run. */
  thetaFrom: number;
  thetaTo: number;
  /** Platform run — slightly wider than the sofa at both ends. */
  platformThetaFrom: number;
  platformThetaTo: number;
};

/**
 * Azimuth ranges of one lounge run, already signed for `side`, so
 * `arenaPoint`/`arenaCurve`/`arenaSectorPolygon` need no further mirroring.
 * Ranges stay ascending.
 */
export function loungeRun(tier: EventRoomLoungeTier, side: EventRoomSide): EventRoomLoungeRun {
  const spec = LOUNGE_TIERS[tier];
  const sofaFrom = THREE.MathUtils.degToRad(spec.sofaThetaFromDeg);
  const sofaTo = THREE.MathUtils.degToRad(spec.sofaThetaToDeg);
  const platformFrom = THREE.MathUtils.degToRad(spec.platformThetaFromDeg);
  const platformTo = THREE.MathUtils.degToRad(spec.platformThetaToDeg);

  if (side === 1) {
    return { thetaFrom: sofaFrom, thetaTo: sofaTo, platformThetaFrom: platformFrom, platformThetaTo: platformTo };
  }
  return {
    thetaFrom: -sofaTo,
    thetaTo: -sofaFrom,
    platformThetaFrom: -platformTo,
    platformThetaTo: -platformFrom,
  };
}

/**
 * Radial band of a lounge platform in factor space. The band is constant in
 * `factor`, so its width in metres is exact at θ = 90° (mid-run, where the
 * radial direction is ±X) and tapers slightly towards the run ends — an ellipse
 * has no constant-width elliptical offset. Stage 5/7 measure the swept geometry.
 */
export function loungePlatformBand(tier: EventRoomLoungeTier) {
  const spec = LOUNGE_TIERS[tier];
  const halfFactor = spec.platformWidth / 2 / ARENA_RX;
  return { factorInner: spec.factor - halfFactor, factorOuter: spec.factor + halfFactor };
}

const LOUNGE_FOOTPRINT_STEPS = 24;

// ── Stage, runway (arena spec — not yet rendered) ─────────────────────────────

export const STAGE_CENTER: EventRoomPoint2D = [0, -7];
export const STAGE_RADIUS_X = 5.46;
export const STAGE_RADIUS_Z = 2.34;
export const STAGE_SURFACE_TOP_Y = 0.46;

export const RUNWAY_HALF_WIDTH = 1.12;
export const RUNWAY_Z_FROM = -5.2;
export const RUNWAY_Z_TO = 5.8;
/** Rounded nose on the +Z end only; there is no separate end-pad solid. */
export const RUNWAY_NOSE_RADIUS = 1.12;
export const RUNWAY_SURFACE_TOP_Y = 0.3;

const RUNWAY_NOSE_STEPS = 12;

/** Racetrack outline: square tail at −Z, semicircular nose at +Z. */
function runwayPolygon(): EventRoomPoint2D[] {
  const noseCenterZ = RUNWAY_Z_TO - RUNWAY_NOSE_RADIUS;
  const points: EventRoomPoint2D[] = [[-RUNWAY_HALF_WIDTH, RUNWAY_Z_FROM], [-RUNWAY_HALF_WIDTH, noseCenterZ]];

  for (let index = 0; index <= RUNWAY_NOSE_STEPS; index += 1) {
    const angle = Math.PI - (Math.PI * index) / RUNWAY_NOSE_STEPS;
    points.push([
      RUNWAY_NOSE_RADIUS * Math.cos(angle),
      noseCenterZ + RUNWAY_NOSE_RADIUS * Math.sin(angle),
    ]);
  }

  points.push([RUNWAY_HALF_WIDTH, RUNWAY_Z_FROM]);
  return points;
}

// ── Active surfaces ──────────────────────────────────────────────────────────

const LOUNGE_SURFACE_ID: Record<EventRoomLoungeTier, Record<'left' | 'right', EventRoomActiveSurfaceId>> = {
  inner: { left: 'lounge-inner-left', right: 'lounge-inner-right' },
  outer: { left: 'lounge-outer-left', right: 'lounge-outer-right' },
};

function loungeSurface(tier: EventRoomLoungeTier, side: EventRoomSide): EventRoomActiveNavSurface {
  const run = loungeRun(tier, side);
  const band = loungePlatformBand(tier);
  return {
    id: LOUNGE_SURFACE_ID[tier][side === 1 ? 'right' : 'left'],
    footprint: {
      kind: 'polygon',
      points: arenaSectorPolygon(
        band.factorInner,
        band.factorOuter,
        run.platformThetaFrom,
        run.platformThetaTo,
        LOUNGE_FOOTPRINT_STEPS,
      ),
    },
    surfaceTopY: LOUNGE_TIERS[tier].surfaceTopY,
    access: 'blocked',
  };
}

/**
 * Keyed by active id, so the compiler rejects both a missing active surface and
 * an entry for a reserved id: exactly 7 surfaces out of 14 stable ids.
 */
const ARENA_SURFACE_BY_ID: Record<EventRoomActiveSurfaceId, EventRoomActiveNavSurface> = {
  floor: {
    id: 'floor',
    footprint: { kind: 'ellipse', center: ARENA_CENTER, radiusX: ARENA_RX, radiusZ: ARENA_RZ },
    surfaceTopY: EVENT_ROOM_FLOOR_Y,
    access: 'walkable',
  },
  runway: {
    id: 'runway',
    footprint: { kind: 'polygon', points: runwayPolygon() },
    surfaceTopY: RUNWAY_SURFACE_TOP_Y,
    access: 'blocked',
  },
  stage: {
    id: 'stage',
    footprint: { kind: 'ellipse', center: STAGE_CENTER, radiusX: STAGE_RADIUS_X, radiusZ: STAGE_RADIUS_Z },
    surfaceTopY: STAGE_SURFACE_TOP_Y,
    access: 'blocked',
  },
  'lounge-inner-left': loungeSurface('inner', -1),
  'lounge-inner-right': loungeSurface('inner', 1),
  'lounge-outer-left': loungeSurface('outer', -1),
  'lounge-outer-right': loungeSurface('outer', 1),
};

const EVENT_ROOM_ARENA_SURFACES: readonly EventRoomActiveNavSurface[] = ACTIVE_SURFACE_IDS.map(
  id => ARENA_SURFACE_BY_ID[id],
);

export function getEventRoomSurfaces(): readonly EventRoomActiveNavSurface[] {
  return EVENT_ROOM_ARENA_SURFACES;
}

// ── Footprint containment ────────────────────────────────────────────────────

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

export function footprintContains(footprint: EventRoomFootprint, x: number, z: number) {
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

/**
 * Height of the walkable ground under a point.
 *
 * Today every walkable surface is the floor at Y = 0 and both lounge terraces are
 * `blocked`, so this returns 0 everywhere by construction. It becomes meaningful
 * only when the Walkable Lounge stage promotes a raised surface to `walkable`.
 */
export function getGroundHeight(x: number, z: number): number {
  let height = EVENT_ROOM_FLOOR_Y;
  for (const surface of EVENT_ROOM_ARENA_SURFACES) {
    if (surface.access !== 'walkable') continue;
    if (!footprintContains(surface.footprint, x, z)) continue;
    if (surface.surfaceTopY > height) height = surface.surfaceTopY;
  }
  return height;
}

// ── Collision: legacy set, preserved byte-for-byte ───────────────────────────
// These are the colliders of the *current* rectangular room, moved here verbatim
// from `eventRoomLayout.ts` so movement behaviour is bit-identical in this stage.
// They do not describe the arena and must not be used as arena geometry. Stage 7
// derives colliders from `getEventRoomSurfaces()` + `EVENT_ROOM_CAMERA_RADIUS`.

const LEGACY_RIGHT_LOUNGE_COLLIDER: readonly EventRoomPoint2D[] = [
  [3.45, -3.4],
  [10.35, -3.4],
  [10.35, 7.9],
  [3.65, 7.9],
  [2.7, 4.9],
  [2.7, -0.25],
];

type EventRoomBlockedVolume = {
  footprint: EventRoomFootprint;
  /**
   * Lounge tiers this collider covers. The legacy collider is one polygon per
   * side spanning both terraces, so it can only be released when *every* tier it
   * covers is walkable; per-tier release arrives with the per-tier footprints of
   * stage 7.
   */
  coversTiers?: readonly EventRoomLoungeTier[];
};

const LEGACY_BLOCKED_VOLUMES: readonly EventRoomBlockedVolume[] = [
  { footprint: { kind: 'polygon', points: LEGACY_RIGHT_LOUNGE_COLLIDER }, coversTiers: ['inner', 'outer'] },
  {
    footprint: { kind: 'polygon', points: mirrorPolygonAcrossX(LEGACY_RIGHT_LOUNGE_COLLIDER) },
    coversTiers: ['inner', 'outer'],
  },
  { footprint: { kind: 'aabb', minX: -1.47, maxX: 1.47, minZ: -4.75, maxZ: 7.2 } },
  { footprint: { kind: 'ellipse', center: [0, 6.15], radiusX: 1.95, radiusZ: 1.6 } },
  { footprint: { kind: 'ellipse', center: [0, -7], radiusX: 5.85, radiusZ: 2.7 } },
];

export type EventRoomBlockedOptions = {
  /** Tiers the player may stand on. Empty or omitted keeps the current behaviour. */
  walkableTiers?: readonly EventRoomLoungeTier[];
};

export function isEventRoomPositionBlocked(x: number, z: number, options?: EventRoomBlockedOptions) {
  const walkableTiers = options?.walkableTiers;
  return LEGACY_BLOCKED_VOLUMES.some((volume) => {
    if (
      volume.coversTiers
      && walkableTiers
      && volume.coversTiers.every(tier => walkableTiers.includes(tier))
    ) {
      return false;
    }
    return footprintContains(volume.footprint, x, z);
  });
}
