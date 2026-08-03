"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EventRoomInstancedBoxes, EventRoomInstancedCylinders, type EventRoomInstanceTransform } from './EventRoomInstancing';
import type { EventRoomMaterials } from './EventRoomMaterials';
import type { EventRoomQualityTier } from './EventRoomTypes';
import { ARENA_CEILING_Y, arenaCurve, arenaPoint } from '../../navigation/eventRoomGeometrySpec';

// ── Ceiling (Stage 4 — sufit radialny + pierścień-bohater) ────────────────────
// Factors/Y below are presentation-only (no footprint or collision impact), so
// they stay local to this renderer rather than in `eventRoomGeometrySpec.ts` —
// same pattern as `EventRoomShell.tsx`'s `ARENA_WALL_*` constants.

const CEILING_PLATE_OUTER_FACTOR = 0.98;
const CEILING_PLATE_THICKNESS = 0.14;

const RADIAL_FIN_FACTOR_INNER = 0.42;
const RADIAL_FIN_FACTOR_OUTER = 0.94;
const RADIAL_FIN_Y_INNER = 6.55;
const RADIAL_FIN_Y_OUTER = 7.02;
const RADIAL_FIN_WIDTH = 0.1;
const RADIAL_FIN_HEIGHT = 0.06;

const HERO_RING_FACTOR = 0.62;
const HERO_RING_Y = 6.35;
/** Tube radius: not numerically specified by the plan (only "stały przekrój"); chosen for a readable neon profile. */
const HERO_RING_RADIUS = 0.055;

const COVE_FACTOR_INNER = 0.55;
const COVE_FACTOR_OUTER = 0.68;
const COVE_Y = 6.75;

const ACCENT_RING_FACTOR = 0.4;
const ACCENT_RING_Y = 6.6;
const ACCENT_RING_RADIUS = 0.035;
const ACCENT_RING_TUBULAR_SEGMENTS = 96;
const ACCENT_RING_RADIAL_SEGMENTS = 6;

const DOWNLIGHT_FACTOR = 0.8;
const DOWNLIGHT_Y = 6.92;
const DOWNLIGHT_COUNT = 24;
const DOWNLIGHT_RADIUS = 0.09;
const DOWNLIGHT_HEIGHT = 0.03;
const DOWNLIGHT_RADIAL_SEGMENTS = 10;

/** Shape-space point: local Y is `-z`, so `rotateX(-Math.PI / 2)` maps it back to world +Z without mirroring. */
function ellipseShapePoint(factor: number, theta: number): [number, number] {
  const [x, z] = arenaPoint(factor, theta);
  return [x, -z];
}

function ellipseLoop(factor: number, segments: number): [number, number][] {
  const points: [number, number][] = [];
  for (let index = 0; index < segments; index += 1) {
    points.push(ellipseShapePoint(factor, (index / segments) * Math.PI * 2));
  }
  return points;
}

function loopToPath(path: THREE.Path | THREE.Shape, points: readonly [number, number][]) {
  points.forEach(([x, y], index) => {
    if (index === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
}

function buildCeilingPlateGeometry(segments: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  loopToPath(shape, ellipseLoop(CEILING_PLATE_OUTER_FACTOR, segments));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: CEILING_PLATE_THICKNESS,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, ARENA_CEILING_Y, 0);
  return geometry;
}

function buildCoveGeometry(segments: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  loopToPath(shape, ellipseLoop(COVE_FACTOR_OUTER, segments));
  const hole = new THREE.Path();
  loopToPath(hole, ellipseLoop(COVE_FACTOR_INNER, segments));
  shape.holes.push(hole);
  const geometry = new THREE.ShapeGeometry(shape, segments);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, COVE_Y, 0);
  return geometry;
}

function buildHeroRingGeometry(tubularSegments: number, radialSegments: number): THREE.BufferGeometry {
  const curve = arenaCurve(HERO_RING_FACTOR, 0, Math.PI * 2, HERO_RING_Y);
  return new THREE.TubeGeometry(curve, tubularSegments, HERO_RING_RADIUS, radialSegments, true);
}

function buildAccentRingGeometry(): THREE.BufferGeometry {
  const curve = arenaCurve(ACCENT_RING_FACTOR, 0, Math.PI * 2, ACCENT_RING_Y);
  return new THREE.TubeGeometry(
    curve,
    ACCENT_RING_TUBULAR_SEGMENTS,
    ACCENT_RING_RADIUS,
    ACCENT_RING_RADIAL_SEGMENTS,
    true,
  );
}

/** Each fin is a unit-length box, pitched and scaled to bridge inner→outer at its azimuth — length and tilt come straight from the ellipse. */
function radialFinTransforms(count: number): EventRoomInstanceTransform[] {
  const transforms: EventRoomInstanceTransform[] = [];
  for (let index = 0; index < count; index += 1) {
    const theta = (index / count) * Math.PI * 2;
    const [innerX, innerZ] = arenaPoint(RADIAL_FIN_FACTOR_INNER, theta);
    const [outerX, outerZ] = arenaPoint(RADIAL_FIN_FACTOR_OUTER, theta);
    const dx = outerX - innerX;
    const dz = outerZ - innerZ;
    const dy = RADIAL_FIN_Y_OUTER - RADIAL_FIN_Y_INNER;
    const horizontal = Math.hypot(dx, dz);
    const length = Math.hypot(horizontal, dy);
    transforms.push({
      position: [(innerX + outerX) / 2, (RADIAL_FIN_Y_INNER + RADIAL_FIN_Y_OUTER) / 2, (innerZ + outerZ) / 2],
      rotation: [Math.atan2(-dy, horizontal), Math.atan2(dx, dz), 0],
      scale: [1, 1, length],
    });
  }
  return transforms;
}

function downlightTransforms(): EventRoomInstanceTransform[] {
  const transforms: EventRoomInstanceTransform[] = [];
  for (let index = 0; index < DOWNLIGHT_COUNT; index += 1) {
    const theta = (index / DOWNLIGHT_COUNT) * Math.PI * 2;
    const [x, z] = arenaPoint(DOWNLIGHT_FACTOR, theta);
    transforms.push({ position: [x, DOWNLIGHT_Y, z] });
  }
  return transforms;
}

export function EventRoomCeiling({
  materials,
  qualityTier,
}: {
  materials: EventRoomMaterials;
  qualityTier: EventRoomQualityTier;
}) {
  const isDesktop = qualityTier === 'desktop';
  const ellipseSegments = isDesktop ? 128 : 72;
  const radialFinCount = isDesktop ? 96 : 48;
  const heroRingRadialSegments = isDesktop ? 8 : 6;

  const plateGeometry = useMemo(() => buildCeilingPlateGeometry(ellipseSegments), [ellipseSegments]);

  // Hero ring + cove share the `ceilingRing` channel material (`ringNeon`), so they
  // merge into one draw call instead of two — the channel partitioning already
  // means one `emissiveIntensity` handle drives both.
  const ringNeonGeometry = useMemo(() => {
    const heroRing = buildHeroRingGeometry(ellipseSegments, heroRingRadialSegments);
    const cove = buildCoveGeometry(ellipseSegments);
    const merged = mergeGeometries([heroRing, cove]);
    heroRing.dispose();
    cove.dispose();
    return merged;
  }, [ellipseSegments, heroRingRadialSegments]);

  const accentRingGeometry = useMemo(() => (isDesktop ? buildAccentRingGeometry() : null), [isDesktop]);

  const radialFins = useMemo(() => radialFinTransforms(radialFinCount), [radialFinCount]);
  const downlights = useMemo(() => (isDesktop ? downlightTransforms() : []), [isDesktop]);

  useEffect(() => () => plateGeometry.dispose(), [plateGeometry]);
  useEffect(() => () => ringNeonGeometry?.dispose(), [ringNeonGeometry]);
  useEffect(() => () => accentRingGeometry?.dispose(), [accentRingGeometry]);

  return (
    <group>
      <mesh geometry={plateGeometry} material={materials.metal} />
      <EventRoomInstancedBoxes
        size={[RADIAL_FIN_WIDTH, RADIAL_FIN_HEIGHT, 1]}
        material={materials.woodDark}
        transforms={radialFins}
      />
      {ringNeonGeometry ? <mesh geometry={ringNeonGeometry} material={materials.ringNeon} /> : null}
      {isDesktop && accentRingGeometry ? (
        <mesh geometry={accentRingGeometry} material={materials.ringAccent} />
      ) : null}
      {isDesktop ? (
        <EventRoomInstancedCylinders
          radius={DOWNLIGHT_RADIUS}
          height={DOWNLIGHT_HEIGHT}
          radialSegments={DOWNLIGHT_RADIAL_SEGMENTS}
          material={materials.ringAccent}
          transforms={downlights}
        />
      ) : null}
    </group>
  );
}
