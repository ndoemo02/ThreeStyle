'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCreatorLightingFrame } from './CreatorLighting';
import { CEILING, DOWNLIGHTS, RUG } from './creatorAccentLayout';
import { withRug, withStoneFloor } from './creatorAccentShader';

const FLOOR_SIZE: [number, number] = [14.2, 15.2];
const FLOOR_CENTER_Z = -0.5;
const SLAT = { width: 0.07, depth: 0.13 };

/** Procedural slate floor and burgundy rug: no textures, lit by LEDs and downlight pools in-shader. */
export function CreatorFloor() {
  const materials = useMemo(() => {
    const stone = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0 });
    const rug = new THREE.MeshStandardMaterial({ roughness: 0.96, metalness: 0 });
    withStoneFloor(stone); withRug(rug);
    return { stone, rug };
  }, []);
  useEffect(() => () => { materials.stone.dispose(); materials.rug.dispose(); }, [materials]);
  const rugWidth = RUG.maxX - RUG.minX, rugDepth = RUG.maxZ - RUG.minZ;
  return <group name="creator-floor">
    <mesh position={[0, 0, FLOOR_CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]} material={materials.stone}>
      <planeGeometry args={FLOOR_SIZE} />
    </mesh>
    <mesh name="creator-rug" position={[(RUG.minX + RUG.maxX) / 2, 0.008, (RUG.minZ + RUG.maxZ) / 2]} material={materials.rug}>
      <boxGeometry args={[rugWidth, 0.016, rugDepth]} />
    </mesh>
  </group>;
}

/** Dark ceiling: walnut slats and their frame merged into one mesh, instanced downlight discs. */
export function CreatorCeiling() {
  const frameRef = useCreatorLightingFrame();
  const lightsRef = useRef<THREE.InstancedMesh>(null);
  const resources = useMemo(() => ({
    base: new THREE.MeshStandardMaterial({ color: '#0b0907', roughness: 0.92, metalness: 0 }),
    slat: new THREE.MeshStandardMaterial({ color: '#2e1f15', roughness: 0.62, metalness: 0 }),
    lamp: new THREE.MeshBasicMaterial({ toneMapped: false }),
  }), []);
  const slats = useMemo(() => {
    const count = Math.floor((CEILING.maxX - CEILING.minX) / CEILING.slatSpacing) + 1;
    const length = CEILING.maxZ - CEILING.minZ, width = CEILING.maxX - CEILING.minX + 0.1;
    const cx = (CEILING.minX + CEILING.maxX) / 2, cz = (CEILING.minZ + CEILING.maxZ) / 2, y = CEILING.y - SLAT.depth / 2;
    const parts = Array.from({ length: count }, (_, i) => new THREE.BoxGeometry(SLAT.width, SLAT.depth, length).translate(CEILING.minX + i * CEILING.slatSpacing, y, cz));
    // A frame board round the slat field hides the slat ends against the LED cove.
    parts.push(
      new THREE.BoxGeometry(width, SLAT.depth, 0.05).translate(cx, y, CEILING.minZ),
      new THREE.BoxGeometry(width, SLAT.depth, 0.05).translate(cx, y, CEILING.maxZ),
      new THREE.BoxGeometry(0.05, SLAT.depth, length).translate(CEILING.minX - 0.05, y, cz),
      new THREE.BoxGeometry(0.05, SLAT.depth, length).translate(CEILING.maxX + 0.05, y, cz),
    );
    const merged = mergeGeometries(parts);
    parts.forEach(part => part.dispose());
    merged.computeBoundingSphere();
    return merged;
  }, []);
  useEffect(() => () => slats.dispose(), [slats]);
  useLayoutEffect(() => {
    const lights = lightsRef.current;
    if (!lights) return;
    // Discs sit just below the slat underside, facing down.
    const matrix = new THREE.Matrix4(), turn = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    DOWNLIGHTS.forEach(([x, z], i) => lights.setMatrixAt(i, matrix.makeTranslation(x, CEILING.y - SLAT.depth - 0.004, z).multiply(turn)));
    lights.instanceMatrix.needsUpdate = true; lights.computeBoundingSphere();
  }, []);
  useEffect(() => () => { resources.base.dispose(); resources.slat.dispose(); resources.lamp.dispose(); }, [resources]);
  useFrame(() => {
    const frame = frameRef.current;
    // Downlights follow the room channel: off in Night, warm in Warm.
    resources.lamp.color.copy(frame.roomColor).multiplyScalar(0.08 + frame.room * 1.6);
  }, -1);
  return <group name="creator-ceiling">
    <mesh position={[0, CEILING.y, FLOOR_CENTER_Z]} rotation={[Math.PI / 2, 0, 0]} material={resources.base}>
      <planeGeometry args={FLOOR_SIZE} />
    </mesh>
    <mesh geometry={slats} material={resources.slat} raycast={() => {}} />
    <instancedMesh ref={lightsRef} args={[undefined, resources.lamp, DOWNLIGHTS.length]} raycast={() => {}}>
      <circleGeometry args={[0.075, 20]} />
    </instancedMesh>
  </group>;
}
