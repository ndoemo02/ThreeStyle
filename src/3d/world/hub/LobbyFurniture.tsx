"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { LobbyMaterials } from './LobbyMaterials';
import { MergedLobbyGlow, type LobbyBoxSpec } from './LobbyMeshes';
import {
  FURNITURE_SHADOWS, LOUNGE_BASE_TOP, LOUNGE_ISLANDS, LOUNGE_SOFA_URL, RECEPTION_BRASS, RECEPTION_CAPS, RECEPTION_COUNTER,
  loungeModulePlacements, type LoungeIsland,
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

/** Base, rug, table and LED edges of one Lobby.B island, by material; the sofa itself is a GLB. */
function buildIsland(island: LoungeIsland) {
  const { center, innerRadius, seatDepth, backDepth, arcStart, arcLength, rugRadius, tableRadius } = island;
  const outer = innerRadius + seatDepth + backDepth;
  const counter = [
    // Recessed dark base: the Blender sofa modules (LoungeSofas) float on it over the LED line.
    sector(center, innerRadius + 0.08, outer - 0.04, arcStart, arcLength, 0, LOUNGE_BASE_TOP),
    cylinder([center[0], 0.4, center[1]], tableRadius, 0.05, 32),
    cylinder([center[0], 0.19, center[1]], tableRadius * 0.5, 0.34, 20),
  ];
  const brass = [cylinder([center[0], 0.37, center[1]], tableRadius + 0.015, 0.03, 32)];
  const rug = [cylinder([center[0], 0.01, center[1]], rugRadius, 0.02, 64)];
  const led = [
    band(center, 0.03, innerRadius + 0.075, 0.03, arcStart, arcLength, true),
    band(center, 0.015, rugRadius + 0.004, 0.022),
  ];
  return { rug, counter, brass, led };
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
  const rug = merge(islands.flatMap(island => island.rug));
  // The island LED lines share the unlit LED material.
  const shade = merge(islands.flatMap(island => island.led));
  return { counter, brass, rug, shade };
}

/**
 * Curved sofa modules built in Blender (scripts/build-lobby-sofa.mjs): one GLB, instanced once per
 * module of every island. The node matrix (meshopt dequantisation) rides along, as for the trees.
 */
function LoungeSofas() {
  const { scene } = useGLTF(LOUNGE_SOFA_URL);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const found: Array<{ geometry: THREE.BufferGeometry; material: THREE.Material; matrix: THREE.Matrix4 }> = [];
    scene.traverse(object => {
      // GLTFLoader gives one single-material mesh per primitive (fabric, pillow).
      if (object instanceof THREE.Mesh) found.push({ geometry: object.geometry, material: object.material as THREE.Material, matrix: object.matrixWorld.clone() });
    });
    return found;
  }, [scene]);
  const placements = useMemo(() => LOUNGE_ISLANDS.flatMap(loungeModulePlacements), []);
  const meshes = useRef<Array<THREE.InstancedMesh | null>>([]);

  useLayoutEffect(() => {
    const placement = new THREE.Matrix4();
    const matrix = new THREE.Matrix4();
    parts.forEach((part, partIndex) => {
      const mesh = meshes.current[partIndex];
      if (!mesh) return;
      placements.forEach(({ x, z, rotationY }, index) => {
        placement.makeRotationY(rotationY).setPosition(x, 0, z);
        mesh.setMatrixAt(index, matrix.multiplyMatrices(placement, part.matrix));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [parts, placements]);

  return (
    <>
      {parts.map((part, index) => (
        <instancedMesh
          key={index}
          name={index === 0 ? 'lobby-lounge' : undefined}
          ref={mesh => { meshes.current[index] = mesh; }}
          args={[part.geometry, part.material, placements.length]}
          frustumCulled
          raycast={() => {}}
        />
      ))}
    </>
  );
}
useGLTF.preload(LOUNGE_SOFA_URL);

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
      <Suspense fallback={null}>
        <LoungeSofas />
      </Suspense>
      <mesh geometry={geometry.rug} material={materials.rug} raycast={noRaycast} />
      <mesh geometry={geometry.shade} material={materials.led} raycast={noRaycast} />
    </group>
  );
}
