"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  ARENA_RX,
  arenaCurve,
  arenaPoint,
  arenaSectorPolygon,
  arenaTangentYaw,
  loungePlatformBand,
  loungePlatformPolygon,
  loungeUpperBasePolygon,
  loungeTablePlacements,
  LOUNGE_PLATFORM_WIDTH,
  LOUNGE_PLATFORM_BOTTOM_Y,
  loungeRun,
  loungeSideOffsetX,
  LOUNGE_SURFACE_TOP_Y,
  LOUNGE_TIER_FACTOR,
  type EventRoomLoungeTier,
  type EventRoomSide,
  type EventRoomPoint2D,
} from '../../navigation/eventRoomGeometrySpec';
import { EventRoomLoungeStairs } from './EventRoomLoungeStairs';
import { EventRoomUpperLoungeEdge } from './EventRoomUpperLoungeEdge';
import type { EventRoomMaterials } from './EventRoomMaterials';
import {
  EventRoomInstancedBoxes,
  EventRoomInstancedCylinders,
  type EventRoomInstanceTransform,
} from './EventRoomInstancing';
import type { EventRoomQualityTier } from './EventRoomTypes';

// ── Continuous lounge sweeps (Stage 5 — ciągłe sweepy kanap, pojemność 32) ────
//
// Four runs — inner-left, inner-right, outer-left, outer-right — each rendered
// as ONE swept solid per layer (platform / plinth / cushion / back / fascia),
// not 32 discrete seats. Every layer is an annular-sector prism: a 2D profile
// (built from `arenaPoint` samples, exactly like `EventRoomCeiling.tsx`'s
// `ellipseLoop`) extruded vertically, then rotated into place. That keeps each
// run a single continuous piece with exactly two end faces (its own extremes)
// — there is no internal subdivision, so there is nothing to seam or cap
// internally. The four per-side geometries of a layer are merged into one
// draw call, matching the plan's "platforms 1 · fasciaLed 1 · plinths 1 ·
// cushions 1 · backs 1 = 5" budget.
//
// Layout insets below (how far a layer sits from the platform centreline) are
// presentation-only — no footprint or collision impact — so they stay local to
// this renderer rather than in `eventRoomGeometrySpec.ts`, same convention as
// `EventRoomCeiling.tsx`'s `RADIAL_FIN_*` / `EventRoomShell.tsx`'s `ARENA_WALL_*`.

const SIDES: readonly EventRoomSide[] = [-1, 1];
const TIERS: readonly EventRoomLoungeTier[] = ['inner', 'outer'];

const PLINTH_WIDTH = 1.05;
const PLINTH_HEIGHT = 0.28;
const PLINTH_OUTWARD_INSET = 0.525;

const CUSHION_WIDTH = 0.88;
const CUSHION_HEIGHT = 0.18;
const CUSHION_BOTTOM_OFFSET = 0.22;
const CUSHION_OUTWARD_INSET = 0.48;

const BACK_WIDTH = 0.22;
const BACK_HEIGHT = 0.64;
const BACK_BOTTOM_OFFSET = 0.28;
const BACK_OUTWARD_INSET = 0.11;

/** Toe-kick LED on the platform's inner (walkway-facing) edge — the `loungeGlow` fascia. */
const FASCIA_RADIUS = 0.026;
const FASCIA_CLEARANCE = 0.012;
const FASCIA_HEIGHT_FACTOR = 0.58;
const UPPER_EDGE_LIGHT_RADIUS = 0.014;

const ARMREST_HEIGHT = 0.5;

/** Metres → arena-ellipse factor, same conversion `loungePlatformBand` uses. */
function factorOffset(meters: number) {
  return meters / ARENA_RX;
}

/**
 * Centreline factor of a layer inset `insetMeters` from the platform's own
 * outward (wall-facing) edge — the same "half-width minus inset" placement the
 * legacy per-segment code used, so backs sit flush against the outward edge and
 * plinths/cushions step in from there.
 */
function outwardOffsetFactor(tier: EventRoomLoungeTier, insetMeters: number) {
  return LOUNGE_TIER_FACTOR[tier] + factorOffset(LOUNGE_PLATFORM_WIDTH[tier] / 2 - insetMeters);
}

/** Shared XZ outline extruded vertically; upper deck remains a thin slab. */
function buildLoungePrismGeometry(
  points: readonly EventRoomPoint2D[],
  yBottom: number,
  height: number,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, yBottom, 0);
  return geometry;
}

/** Annular-sector prism for the unchanged furniture profiles. */
function buildLoungeBandGeometry(
  factorInner: number,
  factorOuter: number,
  thetaFrom: number,
  thetaTo: number,
  yBottom: number,
  height: number,
  steps: number,
  side: EventRoomSide,
): THREE.BufferGeometry {
  const points = arenaSectorPolygon(factorInner, factorOuter, thetaFrom, thetaTo, steps)
    .map(([x, z]): EventRoomPoint2D => [x + loungeSideOffsetX(side), z]);
  return buildLoungePrismGeometry(points, yBottom, height);
}

function mergeRuns(builders: Array<() => THREE.BufferGeometry>, splitMaterialAt?: number): THREE.BufferGeometry {
  const geometries = builders.map(build => build());
  const merged = mergeGeometries(geometries);
  if (merged && splitMaterialAt !== undefined) {
    const count = (geometry: THREE.BufferGeometry) => geometry.index?.count ?? geometry.getAttribute('position').count;
    const split = geometries.slice(0, splitMaterialAt).reduce((sum, geometry) => sum + count(geometry), 0);
    merged.clearGroups();
    merged.addGroup(0, split, 0);
    merged.addGroup(split, count(merged) - split, 1);
  }
  geometries.forEach(geometry => geometry.dispose());
  if (!merged) throw new Error('EventRoomLoungeBanks: mergeGeometries zwróciło null.');
  merged.computeVertexNormals();
  return merged;
}

type LoungeRunSpec = {
  tier: EventRoomLoungeTier;
  side: EventRoomSide;
  platformFactorInner: number;
  platformFactorOuter: number;
  platformThetaFrom: number;
  platformThetaTo: number;
  sofaThetaFrom: number;
  sofaThetaTo: number;
  surfaceTopY: number;
};

function loungeRunSpecs(): LoungeRunSpec[] {
  return TIERS.flatMap(tier => SIDES.map((side): LoungeRunSpec => {
    const run = loungeRun(tier, side);
    const band = loungePlatformBand(tier);
    return {
      tier,
      side,
      platformFactorInner: band.factorInner,
      platformFactorOuter: band.factorOuter,
      platformThetaFrom: run.platformThetaFrom,
      platformThetaTo: run.platformThetaTo,
      sofaThetaFrom: run.thetaFrom,
      sofaThetaTo: run.thetaTo,
      surfaceTopY: LOUNGE_SURFACE_TOP_Y[tier],
    };
  }));
}

/** 8 extreme ends (4 runs × 2) — decorative caps, oriented along the arena tangent. */
function armrestTransforms(runs: readonly LoungeRunSpec[]): EventRoomInstanceTransform[] {
  const transforms: EventRoomInstanceTransform[] = [];
  for (const run of runs) {
    const centerFactor = outwardOffsetFactor(run.tier, BACK_OUTWARD_INSET);
    for (const theta of [run.sofaThetaFrom, run.sofaThetaTo]) {
      const [x, z] = arenaPoint(centerFactor, theta);
      const yaw = arenaTangentYaw(centerFactor, theta, run.side);
      transforms.push({
        position: [x + loungeSideOffsetX(run.side), run.surfaceTopY + CUSHION_BOTTOM_OFFSET + ARMREST_HEIGHT / 2, z],
        rotation: [0, yaw, 0],
      });
    }
  }
  return transforms;
}

/** Inner tables stay on the floor; outer tables and lamps share the upper deck placement. */
function tableTransforms(runs: readonly LoungeRunSpec[]) {
  const bases: EventRoomInstanceTransform[] = [];
  const tops: EventRoomInstanceTransform[] = [];
  const lamps: EventRoomInstanceTransform[] = [];
  for (const run of runs) {
    for (const { point: [x, z], baseY } of loungeTablePlacements(run.tier, run.side)) {
      bases.push({ position: [x, baseY + 0.29, z] });
      // Upper contacts: base top 0.58; tabletop 0.09; lamp 0.25.
      // Keep the existing lower-tier transforms unchanged.
      const isUpper = run.tier === 'outer';
      tops.push({ position: [x, baseY + (isUpper ? 0.58 + 0.09 / 2 : 0.635), z] });
      lamps.push({ position: [x, baseY + (isUpper ? 0.58 + 0.09 + 0.25 / 2 : 0.8075), z] });
    }
  }
  return { bases, tops, lamps };
}

export function EventRoomLoungeBanks({
  materials,
  qualityTier,
}: {
  materials: EventRoomMaterials;
  qualityTier: EventRoomQualityTier;
}) {
  const isDesktop = qualityTier === 'desktop';
  const sweepSteps = isDesktop ? 24 : 14;
  const fasciaTubularSteps = isDesktop ? 96 : 56;
  const fasciaRadialSegments = isDesktop ? 6 : 4;
  const bevelSegments = isDesktop ? 2 : 1;
  const cylinderSegments = isDesktop ? 20 : 12;

  const runs = useMemo(() => loungeRunSpecs(), []);
  const upperDeckMaterial = useMemo(() => {
    const material = materials.woodDark.clone();
    material.color.lerp(materials.wood.color, 0.55);
    material.roughness = 0.72;
    return material;
  }, [materials]);
  useEffect(() => () => upperDeckMaterial.dispose(), [upperDeckMaterial]);

  const platformsGeometry = useMemo(() => mergeRuns(runs.map(run => () => buildLoungePrismGeometry(
    loungePlatformPolygon(run.tier, run.side, sweepSteps),
    LOUNGE_PLATFORM_BOTTOM_Y[run.tier],
    run.surfaceTopY - LOUNGE_PLATFORM_BOTTOM_Y[run.tier],
  )), 2), [runs, sweepSteps]);

  const upperBaseGeometry = useMemo(() => mergeRuns(([-1, 1] as const).map(side => () => buildLoungePrismGeometry(
    loungeUpperBasePolygon(side, sweepSteps),
    0,
    LOUNGE_PLATFORM_BOTTOM_Y.outer,
  ))), [sweepSteps]);

  const plinthsGeometry = useMemo(() => mergeRuns(runs.map((run) => {
    const centerFactor = outwardOffsetFactor(run.tier, PLINTH_OUTWARD_INSET);
    const half = factorOffset(PLINTH_WIDTH / 2);
    return () => buildLoungeBandGeometry(
      centerFactor - half,
      centerFactor + half,
      run.sofaThetaFrom,
      run.sofaThetaTo,
      run.surfaceTopY,
      PLINTH_HEIGHT,
      sweepSteps,
      run.side,
    );
  })), [runs, sweepSteps]);

  const cushionsGeometry = useMemo(() => mergeRuns(runs.map((run) => {
    const centerFactor = outwardOffsetFactor(run.tier, CUSHION_OUTWARD_INSET);
    const half = factorOffset(CUSHION_WIDTH / 2);
    return () => buildLoungeBandGeometry(
      centerFactor - half,
      centerFactor + half,
      run.sofaThetaFrom,
      run.sofaThetaTo,
      run.surfaceTopY + CUSHION_BOTTOM_OFFSET,
      CUSHION_HEIGHT,
      sweepSteps,
      run.side,
    );
  })), [runs, sweepSteps]);

  const backsGeometry = useMemo(() => mergeRuns(runs.map((run) => {
    const centerFactor = outwardOffsetFactor(run.tier, BACK_OUTWARD_INSET);
    const half = factorOffset(BACK_WIDTH / 2);
    return () => buildLoungeBandGeometry(
      centerFactor - half,
      centerFactor + half,
      run.sofaThetaFrom,
      run.sofaThetaTo,
      run.surfaceTopY + BACK_BOTTOM_OFFSET,
      BACK_HEIGHT,
      sweepSteps,
      run.side,
    );
  })), [runs, sweepSteps]);

  // Continuous toe-kick LED — one `TubeGeometry` per run along the platform's
  // inner face, merged 4-at-a-time. Sits proud of the face by `FASCIA_CLEARANCE`
  // so it never shares a plane with the platform surface (no coplanar overlap).
  const fasciaGeometry = useMemo(() => {
    const tubes = runs.map((run) => {
      const isUpper = run.tier === 'outer';
      const radius = isUpper ? UPPER_EDGE_LIGHT_RADIUS : FASCIA_RADIUS;
      const factor = run.platformFactorInner - factorOffset(radius + FASCIA_CLEARANCE);
      const bottomY = LOUNGE_PLATFORM_BOTTOM_Y[run.tier];
      const fasciaY = isUpper ? bottomY - radius : bottomY + (run.surfaceTopY - bottomY) * FASCIA_HEIGHT_FACTOR;
      const curve = arenaCurve(factor, run.platformThetaFrom, run.platformThetaTo, fasciaY);
      return new THREE.TubeGeometry(curve, fasciaTubularSteps, radius, fasciaRadialSegments, false)
        .translate(loungeSideOffsetX(run.side), 0, 0);
    });
    const merged = mergeGeometries(tubes);
    tubes.forEach(tube => tube.dispose());
    if (!merged) throw new Error('EventRoomLoungeBanks: fascia mergeGeometries zwróciło null.');
    return merged;
  }, [runs, fasciaTubularSteps, fasciaRadialSegments]);

  const armrests = useMemo(() => armrestTransforms(runs), [runs]);
  const tables = useMemo(() => tableTransforms(runs), [runs]);

  useEffect(() => () => platformsGeometry.dispose(), [platformsGeometry]);
  useEffect(() => () => upperBaseGeometry.dispose(), [upperBaseGeometry]);
  useEffect(() => () => plinthsGeometry.dispose(), [plinthsGeometry]);
  useEffect(() => () => cushionsGeometry.dispose(), [cushionsGeometry]);
  useEffect(() => () => backsGeometry.dispose(), [backsGeometry]);
  useEffect(() => () => fasciaGeometry.dispose(), [fasciaGeometry]);

  return (
    <group name="event-room-lounge-banks">
      <EventRoomLoungeStairs materials={materials} treadMaterial={upperDeckMaterial} />
      <EventRoomUpperLoungeEdge materials={materials} qualityTier={qualityTier} />
      <mesh name="upper-lounge-base" geometry={upperBaseGeometry} material={materials.woodDark} />
      <mesh name="lounge-platforms" geometry={platformsGeometry} material={[materials.woodDark, upperDeckMaterial]} />
      <mesh name="lounge-plinths" geometry={plinthsGeometry} material={materials.wood} />
      <mesh name="lounge-cushions" geometry={cushionsGeometry} material={materials.seat} />
      <mesh name="lounge-backs" geometry={backsGeometry} material={materials.seat} />
      <mesh name="lounge-fascia-led" geometry={fasciaGeometry} material={materials.loungeLed} />

      <EventRoomInstancedBoxes
        size={[BACK_WIDTH + 0.24, ARMREST_HEIGHT, 0.3]}
        material={materials.wood}
        transforms={armrests}
        bevelRadius={0.06}
        bevelSegments={bevelSegments}
      />

      <EventRoomInstancedCylinders
        radius={0.12}
        height={0.58}
        radialSegments={cylinderSegments}
        material={materials.metal}
        transforms={tables.bases}
      />
      <EventRoomInstancedCylinders
        radius={0.46}
        height={0.09}
        radialSegments={cylinderSegments}
        material={materials.stone}
        transforms={tables.tops}
      />
      <EventRoomInstancedBoxes
        size={[0.18, 0.25, 0.18]}
        material={materials.loungeLed}
        transforms={tables.lamps}
        bevelRadius={0.07}
        bevelSegments={bevelSegments}
      />
    </group>
  );
}
