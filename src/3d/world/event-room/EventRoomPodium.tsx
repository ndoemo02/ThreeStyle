"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { EventRoomMaterials } from './EventRoomMaterials';
import {
  centerYFromBottom,
  EVENT_ROOM_FLOOR_Y,
  STAGE_CENTER,
  STAGE_RADIUS_X,
  STAGE_RADIUS_Z,
  STAGE_SURFACE_TOP_Y,
  RUNWAY_HALF_WIDTH,
  RUNWAY_Z_FROM,
  RUNWAY_Z_TO,
  RUNWAY_NOSE_RADIUS,
  RUNWAY_SURFACE_TOP_Y,
} from '../../navigation/eventRoomGeometrySpec';

// ── Stage tier heights ───────────────────────────────────────────────────────
// ADR-004 §5: 3 concentric tiers. Heights from STAGE_SURFACE_TOP_Y (0.46)
// distributed as 0.16, 0.30, 0.46. Each tier insets ~15% from the previous.

const STAGE_TIERS = [
  { topY: 0.16, insetFactor: 1.0 },    // Tier 1 — base, full footprint
  { topY: 0.30, insetFactor: 0.85 },   // Tier 2 — mid, connects to runway height
  { topY: STAGE_SURFACE_TOP_Y, insetFactor: 0.70 }, // Tier 3 — top, performance surface
] as const;

/** LED nose strip height — thin emissive edge per tier. */
const TIER_LED_HEIGHT = 0.035;

// ── Runway racetrack shape ───────────────────────────────────────────────────

const RUNWAY_NOSE_STEPS = 16;

/**
 * Racetrack Shape: rectangle from RUNWAY_Z_FROM to the nose centre, then a
 * semicircular nose at +Z. Square tail at −Z (meets the stage).
 */
function createRunwayShape(): THREE.Shape {
  const hw = RUNWAY_HALF_WIDTH;
  const noseCenterZ = RUNWAY_Z_TO - RUNWAY_NOSE_RADIUS;
  const shape = new THREE.Shape();

  // Start at bottom-left (−Z, −X), go clockwise
  shape.moveTo(-hw, RUNWAY_Z_FROM);
  shape.lineTo(-hw, noseCenterZ);

  // Semicircular nose (left side → top → right side)
  for (let i = 0; i <= RUNWAY_NOSE_STEPS; i++) {
    const angle = Math.PI + (Math.PI * i) / RUNWAY_NOSE_STEPS;
    shape.lineTo(
      RUNWAY_NOSE_RADIUS * Math.cos(angle),
      noseCenterZ + RUNWAY_NOSE_RADIUS * Math.sin(angle),
    );
  }

  shape.lineTo(hw, RUNWAY_Z_FROM);
  shape.closePath();
  return shape;
}

/**
 * Extrude the racetrack shape vertically (Y-up). Three.js ExtrudeGeometry
 * extrudes along +Z by default, so we extrude with `depth` = desired height,
 * then rotate -90° around X to stand it upright.
 */
function createRunwayGeometry(height: number): THREE.ExtrudeGeometry {
  const shape = createRunwayShape();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    steps: 1,
  });
  // Rotate so the flat shape lies in XZ and extrusion goes up in Y
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/**
 * Runway LED perimeter strip: thin tube following the racetrack outline at
 * a given height. Uses a CatmullRomCurve3 through the racetrack vertices.
 */
function createRunwayLedGeometry(y: number): THREE.TubeGeometry {
  const hw = RUNWAY_HALF_WIDTH;
  const noseCenterZ = RUNWAY_Z_TO - RUNWAY_NOSE_RADIUS;
  const points: THREE.Vector3[] = [];

  // Right side down
  points.push(new THREE.Vector3(hw, y, RUNWAY_Z_FROM));
  points.push(new THREE.Vector3(hw, y, noseCenterZ));

  // Nose arc
  for (let i = 0; i <= RUNWAY_NOSE_STEPS; i++) {
    const angle = (Math.PI * i) / RUNWAY_NOSE_STEPS;
    points.push(new THREE.Vector3(
      RUNWAY_NOSE_RADIUS * Math.cos(angle),
      y,
      noseCenterZ + RUNWAY_NOSE_RADIUS * Math.sin(angle),
    ));
  }

  // Left side up
  points.push(new THREE.Vector3(-hw, y, noseCenterZ));
  points.push(new THREE.Vector3(-hw, y, RUNWAY_Z_FROM));

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.1);
  return new THREE.TubeGeometry(curve, 48, 0.022, 4, false);
}

// ── Component ────────────────────────────────────────────────────────────────

export function EventRoomPodium({ materials }: { materials: EventRoomMaterials }) {
  const [stageCX, stageCZ] = STAGE_CENTER;

  // ── Stage tier geometries (3 concentric elliptical cylinders) ──────────────
  const tierGeometries = useMemo(() => STAGE_TIERS.map((tier) => {
    const height = tier.topY;
    const rx = STAGE_RADIUS_X * tier.insetFactor;
    const rz = STAGE_RADIUS_Z * tier.insetFactor;
    // CylinderGeometry with radial segments, then scale X/Z for ellipse
    const geo = new THREE.CylinderGeometry(1, 1, height, 64);
    geo.scale(rx, 1, rz);
    return geo;
  }), []);

  // ── Stage tier LED nose strips (thin cylinders at each tier edge) ──────────
  const tierLedGeometries = useMemo(() => STAGE_TIERS.map((tier) => {
    const rx = STAGE_RADIUS_X * tier.insetFactor;
    const rz = STAGE_RADIUS_Z * tier.insetFactor;
    // Slightly larger than the tier to sit on the outside edge
    const ledRx = rx + 0.02;
    const ledRz = rz + 0.02;
    const geo = new THREE.CylinderGeometry(1, 1, TIER_LED_HEIGHT, 64, 1, true);
    geo.scale(ledRx, 1, ledRz);
    return geo;
  }), []);

  // ── Runway geometries ─────────────────────────────────────────────────────
  const runwayBodyGeometry = useMemo(
    () => createRunwayGeometry(RUNWAY_SURFACE_TOP_Y),
    [],
  );

  const runwayCapGeometry = useMemo(
    () => createRunwayGeometry(0.015),
    [],
  );

  const runwayLedGeometry = useMemo(
    () => createRunwayLedGeometry(RUNWAY_SURFACE_TOP_Y),
    [],
  );

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    tierGeometries.forEach(g => g.dispose());
    tierLedGeometries.forEach(g => g.dispose());
    runwayBodyGeometry.dispose();
    runwayCapGeometry.dispose();
    runwayLedGeometry.dispose();
  }, [tierGeometries, tierLedGeometries, runwayBodyGeometry, runwayCapGeometry, runwayLedGeometry]);

  return (
    <group>
      {/* ── 3-tier concentric stage ─────────────────────────────────────── */}
      {STAGE_TIERS.map((tier, index) => (
        <group key={`stage-tier-${tier.topY}`} position={[stageCX, 0, stageCZ]}>
          {/* Tier body */}
          <mesh
            geometry={tierGeometries[index]}
            material={index === STAGE_TIERS.length - 1 ? materials.metal : materials.stone}
            position={[0, centerYFromBottom(EVENT_ROOM_FLOOR_Y, tier.topY), 0]}
          />
          {/* LED nose strip at the top edge of each tier */}
          <mesh
            geometry={tierLedGeometries[index]}
            material={materials.runwayLed}
            position={[0, tier.topY - TIER_LED_HEIGHT / 2, 0]}
          />
        </group>
      ))}

      {/* ── Racetrack runway ────────────────────────────────────────────── */}
      {/* Stone body — extruded from floor to RUNWAY_SURFACE_TOP_Y */}
      <mesh
        geometry={runwayBodyGeometry}
        material={materials.stone}
        position={[0, EVENT_ROOM_FLOOR_Y, 0]}
      />
      {/* Metal cap — thin layer at runway surface for visual distinction */}
      <mesh
        geometry={runwayCapGeometry}
        material={materials.metal}
        position={[0, RUNWAY_SURFACE_TOP_Y - 0.015, 0]}
      />
      {/* LED perimeter strip — wired to runwayLed channel */}
      <mesh
        geometry={runwayLedGeometry}
        material={materials.runwayLed}
      />
    </group>
  );
}
