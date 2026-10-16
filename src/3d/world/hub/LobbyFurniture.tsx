"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { LobbyMaterials } from './LobbyMaterials';
import { MergedLobbyGlow, type LobbyBoxSpec } from './LobbyMeshes';
import {
  FURNITURE_SHADOWS, LOUNGE_FABRIC, LOUNGE_LAMP, LOUNGE_PILLOWS, LOUNGE_PLINTH, LOUNGE_RUG, LOUNGE_TABLE,
  RECEPTION_BRASS, RECEPTION_CAPS, RECEPTION_COUNTER,
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
  const [tableX, , tableZ] = LOUNGE_TABLE.position;
  const [lampX, , lampZ] = LOUNGE_LAMP.position;
  const counter = merge([
    ...RECEPTION_COUNTER.map(spec => box(spec)),
    ...RECEPTION_CAPS.map(cap => cylinder(cap.position, cap.radius, cap.height, 16, cap.thetaStart, Math.PI)),
    ...LOUNGE_PLINTH.map(spec => box(spec)),
    cylinder([tableX, 0.4, tableZ], LOUNGE_TABLE.radius, 0.05),
    cylinder([tableX, 0.19, tableZ], 0.3, 0.34, 20),
  ]);
  const brass = merge([
    ...RECEPTION_BRASS.map(spec => box(spec)),
    cylinder([tableX, 0.37, tableZ], LOUNGE_TABLE.radius + 0.015, 0.03),
    cylinder([lampX, 0.015, lampZ], 0.18, 0.03, 20),
    cylinder([lampX, 0.76, lampZ], 0.018, 1.46, 8),
  ]);
  const fabric = merge(LOUNGE_FABRIC.map(spec => box(spec, 0.08)));
  const rug = merge([
    cylinder(LOUNGE_RUG.position, LOUNGE_RUG.radius, 0.02, 48),
    ...LOUNGE_PILLOWS.map(spec => box(spec, 0.06)),
  ]);
  const shade = merge([cylinder([lampX, 1.62, lampZ], 0.2, 0.3, 20)]);
  return { counter, brass, fabric, rug, shade };
}

/** Reception desk and the single lounge island. Decorative: never a ray target. */
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
