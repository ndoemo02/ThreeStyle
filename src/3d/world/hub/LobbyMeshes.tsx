"use client";

import { useLayoutEffect, useMemo, useRef } from 'react';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { createLobbyBoxGeometry, type LobbySurface } from './lobbyGeometry';

export type LobbyBoxSpec = {
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
};

export type LobbyInstanceTransform = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

export function MergedLobbyBoxes({
  boxes,
  surface,
  material,
}: {
  boxes: LobbyBoxSpec[];
  surface: LobbySurface;
  material: THREE.Material;
}) {
  const geometry = useMemo(() => {
    const parts = boxes.map(box => {
      const part = createLobbyBoxGeometry(box.size, surface);
      const rotation = box.rotation ?? [0, 0, 0];
      part.rotateX(rotation[0]);
      part.rotateY(rotation[1]);
      part.rotateZ(rotation[2]);
      part.translate(...box.position);
      return part;
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    return merged;
  }, [boxes, surface]);

  return <mesh geometry={geometry} material={material} frustumCulled />;
}

export function InstancedLobbyBoxes({
  size,
  surface,
  material,
  transforms,
}: {
  size: [number, number, number];
  surface: LobbySurface;
  material: THREE.Material;
  transforms: LobbyInstanceTransform[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const [width, height, depth] = size;
  const geometry = useMemo(
    () => createLobbyBoxGeometry([width, height, depth], surface),
    [depth, height, surface, width],
  );

  useLayoutEffect(() => {
    if (!ref.current) return;
    const helper = new THREE.Object3D();
    transforms.forEach((transform, index) => {
      helper.position.set(...transform.position);
      helper.rotation.set(...(transform.rotation ?? [0, 0, 0]));
      helper.scale.set(...(transform.scale ?? [1, 1, 1]));
      helper.updateMatrix();
      ref.current?.setMatrixAt(index, helper.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingBox();
    ref.current.computeBoundingSphere();
  }, [geometry, material, transforms]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, transforms.length]}
      material={material}
      frustumCulled
    />
  );
}
