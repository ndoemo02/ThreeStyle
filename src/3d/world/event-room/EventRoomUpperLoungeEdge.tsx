"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  ARENA_RX, arenaCurve, arenaPoint, arenaSectorPolygon, loungePlatformBand, loungeRun,
  loungeSideOffsetX, LOUNGE_PLATFORM_BOTTOM_Y, LOUNGE_SURFACE_TOP_Y,
} from '../../navigation/eventRoomGeometrySpec';
import { EventRoomInstancedBoxes, type EventRoomInstanceTransform } from './EventRoomInstancing';
import type { EventRoomMaterials } from './EventRoomMaterials';
import type { EventRoomQualityTier } from './EventRoomTypes';

const EDGE_HEIGHT = 0.36;
const RAIL_RADIUS = 0.018;
const POST_WIDTH = 0.035;
const FRONT_TRIM_HALF_WIDTH = 0.015;
const EDGE_SETBACK = 0.055;
const POST_COUNT_PER_SIDE = 7;

/** Visual trim only: existing upper-deck dimensions and navigation stay authoritative. */
export function EventRoomUpperLoungeEdge({
  materials, qualityTier,
}: { materials: EventRoomMaterials; qualityTier: EventRoomQualityTier }) {
  const isDesktop = qualityTier === 'desktop';
  const arcSteps = isDesktop ? 24 : 14;
  const tubeSteps = isDesktop ? 96 : 56;
  const tubeRadialSegments = isDesktop ? 6 : 4;

  const finishes = useMemo(() => ({
    fascia: new THREE.MeshStandardMaterial({
      color: materials.woodDark.color.clone().lerp(materials.wood.color, 0.8),
      roughness: 0.74, metalness: 0.02,
    }),
    rail: new THREE.MeshStandardMaterial({
      color: materials.metal.color.clone().lerp(materials.wood.color, 0.2),
      roughness: 0.68, metalness: 0.18,
    }),
  }), [materials]);

  const trim = useMemo(() => {
    const band = loungePlatformBand('outer');
    const bottomY = LOUNGE_PLATFORM_BOTTOM_Y.outer;
    const topY = LOUNGE_SURFACE_TOP_Y.outer;
    const railFactor = band.factorInner + EDGE_SETBACK / ARENA_RX;
    const fronts: THREE.BufferGeometry[] = [];
    const rails: THREE.BufferGeometry[] = [];
    const posts: EventRoomInstanceTransform[] = [];
    for (const side of [-1, 1] as const) {
      const run = loungeRun('outer', side);
      const shape = new THREE.Shape();
      arenaSectorPolygon(
        band.factorInner - FRONT_TRIM_HALF_WIDTH / ARENA_RX,
        band.factorInner + FRONT_TRIM_HALF_WIDTH / ARENA_RX,
        run.platformThetaFrom, run.platformThetaTo, arcSteps,
      ).forEach(([x, z], index) => {
        const px = x + loungeSideOffsetX(side);
        if (index === 0) shape.moveTo(px, -z);
        else shape.lineTo(px, -z);
      });
      const front = new THREE.ExtrudeGeometry(shape, {
        depth: topY - bottomY, bevelEnabled: false, curveSegments: 1,
      });
      front.rotateX(-Math.PI / 2);
      front.translate(0, bottomY, 0);
      fronts.push(front);
      rails.push(new THREE.TubeGeometry(
        arenaCurve(railFactor, run.platformThetaFrom, run.platformThetaTo, topY + EDGE_HEIGHT),
        tubeSteps, RAIL_RADIUS, tubeRadialSegments, false,
      ).translate(loungeSideOffsetX(side), 0, 0));

      const postHeight = EDGE_HEIGHT - RAIL_RADIUS;
      for (let index = 0; index < POST_COUNT_PER_SIDE; index += 1) {
        const theta = run.platformThetaFrom
          + (run.platformThetaTo - run.platformThetaFrom) * index / (POST_COUNT_PER_SIDE - 1);
        const [x, z] = arenaPoint(railFactor, theta);
        posts.push({
          position: [x + loungeSideOffsetX(side), topY + postHeight / 2, z],
          scale: [POST_WIDTH, postHeight, POST_WIDTH],
        });
      }
    }
    const front = mergeGeometries(fronts);
    const rail = mergeGeometries(rails);
    fronts.forEach(g => g.dispose());
    rails.forEach(g => g.dispose());
    if (!front || !rail) throw new Error('Upper lounge trim: geometry merge failed.');
    return { front, rail, posts };
  }, [arcSteps, tubeSteps, tubeRadialSegments]);

  useEffect(() => () => {
    trim.front.dispose(); trim.rail.dispose();
  }, [trim]);
  useEffect(() => () => {
    finishes.fascia.dispose(); finishes.rail.dispose();
  }, [finishes]);

  return (
    <group name="upper-lounge-readability">
      <mesh name="upper-lounge-front" geometry={trim.front} material={finishes.fascia} />
      <mesh name="upper-lounge-low-rail" geometry={trim.rail} material={finishes.rail} />
      <EventRoomInstancedBoxes size={[1, 1, 1]} transforms={trim.posts} material={finishes.rail} />
    </group>
  );
}
