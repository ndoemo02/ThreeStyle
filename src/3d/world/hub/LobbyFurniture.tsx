"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { LobbyMaterials } from './LobbyMaterials';
import { MergedLobbyGlow, type LobbyBoxSpec } from './LobbyMeshes';
import {
  FURNITURE_SHADOWS, LOUNGE_ISLANDS, LOUNGE_MODULE_GAP, RECEPTION_BRASS, RECEPTION_CAPS, RECEPTION_COUNTER,
  loungeIslandPoint, type LoungeIsland,
} from './lobbyFurnitureLayout';

type Vec3 = [number, number, number];

function place(part: THREE.BufferGeometry, position: Vec3, rotation: Vec3 = [0, 0, 0]) {
  part.rotateX(rotation[0]); part.rotateY(rotation[1]); part.rotateZ(rotation[2]);
  part.translate(...position);
  return part;
}

function box(spec: LobbyBoxSpec, radius = 0) {
  const [width, height, depth] = spec.size;
  const geometry = radius > 0
    ? new RoundedBoxGeometry(width, height, depth, 2, Math.min(radius, Math.min(width, height, depth) / 2 - 0.001))
    : new THREE.BoxGeometry(width, height, depth);
  return place(geometry, spec.position, spec.rotation);
}

function cylinder(position: Vec3, radius: number, height: number, segments = 24, thetaStart = 0, thetaLength = Math.PI * 2) {
  return place(new THREE.CylinderGeometry(radius, radius, height, segments, 1, false, thetaStart, thetaLength), position);
}

/**
 * Open band on a circle, for LED edges; `angle` follows the island convention (cos a, sin a).
 * `inward` turns the faces to the centre: the sofa's front line is seen from inside its arc.
 */
function band(center: [number, number], y: number, radius: number, height: number, angle = 0, length = Math.PI * 2, inward = false) {
  // CylinderGeometry puts theta at (sin t, cos t); island angles are (cos a, sin a).
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true, Math.PI / 2 - angle - length, length);
  const index = geometry.index;
  if (inward && index) {
    for (let i = 0; i < index.count; i += 3) {
      const second = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, second);
    }
    const normal = geometry.getAttribute('normal');
    for (let i = 0; i < normal.count; i++) normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
  }
  return place(geometry, [center[0], y, center[1]]);
}

/**
 * Flat annular sector extruded upwards, with a soft bevel: one sofa module, back or plinth.
 * The shape is drawn with z mirrored into -y, so after rotateX(-π/2) angle a points at (cos a, sin a).
 */
function sector(center: [number, number], inner: number, outer: number, angle: number, length: number, y0: number, height: number, bevel = 0) {
  const r0 = inner + bevel;
  const r1 = outer - bevel;
  const shape = new THREE.Shape();
  shape.moveTo(r0 * Math.cos(angle), -r0 * Math.sin(angle));
  shape.absarc(0, 0, r1, -angle, -(angle + length), true);
  shape.absarc(0, 0, r0, -(angle + length), -angle, false);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, height - bevel * 2),
    curveSegments: 24,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(center[0], y0 + bevel, center[1]);
  return geometry;
}

/** Curved modular sofa, plinth, rug, table and LED edges of one Lobby.B island, by material. */
function buildIsland(island: LoungeIsland) {
  const { center, innerRadius, seatDepth, backDepth, arcStart, arcLength, segments, rugRadius, tableRadius } = island;
  const seatOuter = innerRadius + seatDepth;
  const outer = seatOuter + backDepth;
  const step = arcLength / segments;
  const fabric: THREE.BufferGeometry[] = [];
  const rug: THREE.BufferGeometry[] = [];
  for (let index = 0; index < segments; index++) {
    const angle = arcStart + step * index + LOUNGE_MODULE_GAP / 2;
    const length = step - LOUNGE_MODULE_GAP;
    fabric.push(sector(center, innerRadius, seatOuter + 0.02, angle, length, 0.1, 0.36, 0.06));
    fabric.push(sector(center, seatOuter, outer, angle, length, 0.1, 0.76, 0.06));
    // One cushion against the back of each module, turned to face the table.
    const middle = angle + length / 2;
    const [px, pz] = loungeIslandPoint(island, seatOuter - 0.14, middle);
    rug.push(box({ position: [px, 0.62, pz], size: [0.46, 0.4, 0.14], rotation: [0, Math.PI / 2 - middle, 0] }, 0.06));
  }
  const counter = [
    // Recessed dark base, so the sofa floats on its LED line.
    sector(center, innerRadius + 0.08, outer - 0.04, arcStart, arcLength, 0, 0.1),
    cylinder([center[0], 0.4, center[1]], tableRadius, 0.05, 32),
    cylinder([center[0], 0.19, center[1]], tableRadius * 0.5, 0.34, 20),
  ];
  const brass = [cylinder([center[0], 0.37, center[1]], tableRadius + 0.015, 0.03, 32)];
  rug.push(cylinder([center[0], 0.01, center[1]], rugRadius, 0.02, 64));
  const led = [
    band(center, 0.03, innerRadius + 0.075, 0.03, arcStart, arcLength, true),
    band(center, 0.015, rugRadius + 0.004, 0.022),
  ];
  return { fabric, rug, counter, brass, led };
}

/** One draw call per material: every part is flattened to non-indexed and merged. */
function merge(parts: THREE.BufferGeometry[]) {
  const flat = parts.map(part => {
    if (!part.index) return part;
    const nonIndexed = part.toNonIndexed();
    part.dispose();
    return nonIndexed;
  });
  const merged = mergeGeometries(flat, false);
  flat.forEach(part => part.dispose());
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function buildFurniture() {
  const islands = LOUNGE_ISLANDS.map(buildIsland);
  const counter = merge([
    ...islands.flatMap(island => island.counter),
    ...RECEPTION_COUNTER.map(spec => box(spec)),
    ...RECEPTION_CAPS.map(cap => cylinder(cap.position, cap.radius, cap.height, 16, cap.thetaStart, Math.PI)),
  ]);
  const brass = merge([
    ...islands.flatMap(island => island.brass),
    ...RECEPTION_BRASS.map(spec => box(spec)),
  ]);
  const fabric = merge(islands.flatMap(island => island.fabric));
  const rug = merge(islands.flatMap(island => island.rug));
  // The island LED lines share the unlit LED material.
  const shade = merge(islands.flatMap(island => island.led));
  return { counter, brass, fabric, rug, shade };
}

/** Reception desk and the round lounge islands. Decorative: never a ray target. */
export function LobbyFurniture({ materials }: { materials: LobbyMaterials }) {
  const geometry = useMemo(() => buildFurniture(), []);
  useEffect(() => () => Object.values(geometry).forEach(part => part.dispose()), [geometry]);
  const noRaycast = () => {};
  return (
    <group name="lobby-furniture">
      <MergedLobbyGlow planes={FURNITURE_SHADOWS} material={materials.softShadow} />
      <mesh name="lobby-reception" geometry={geometry.counter} material={materials.counter} raycast={noRaycast} />
      <mesh geometry={geometry.brass} material={materials.brass} raycast={noRaycast} />
      <mesh name="lobby-lounge" geometry={geometry.fabric} material={materials.fabric} raycast={noRaycast} />
      <mesh geometry={geometry.rug} material={materials.rug} raycast={noRaycast} />
      <mesh geometry={geometry.shade} material={materials.led} raycast={noRaycast} />
    </group>
  );
}
