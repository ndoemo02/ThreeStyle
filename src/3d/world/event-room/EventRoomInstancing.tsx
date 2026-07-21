"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';

export type EventRoomInstanceTransform = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

export function EventRoomInstancedBoxes({
  size,
  transforms,
  material,
  bevelRadius = 0,
  bevelSegments = 1,
}: {
  size: [number, number, number];
  transforms: EventRoomInstanceTransform[];
  material: THREE.Material;
  bevelRadius?: number;
  bevelSegments?: number;
}) {
  const [width, height, depth] = size;
  const geometry = useMemo(() => (
    bevelRadius > 0
      ? new RoundedBoxGeometry(width, height, depth, bevelSegments, bevelRadius)
      : new THREE.BoxGeometry(width, height, depth)
  ), [bevelRadius, bevelSegments, depth, height, width]);
  const matrices = useMemo(() => {
    const object = new THREE.Object3D();

    return transforms.map((transform) => {
      object.position.set(...transform.position);
      object.rotation.set(...(transform.rotation ?? [0, 0, 0]));
      object.scale.set(...(transform.scale ?? [1, 1, 1]));
      object.updateMatrix();
      return object.matrix.clone();
    });
  }, [transforms]);

  useEffect(() => () => {
    geometry.dispose();
  }, [geometry]);

  return (
    <instancedMesh
      args={[geometry, material, transforms.length]}
      onUpdate={(mesh) => {
        matrices.forEach((matrix, index) => {
          mesh.setMatrixAt(index, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }}
    />
  );
}

export function EventRoomInstancedCylinders({
  radius,
  height,
  radialSegments,
  transforms,
  material,
}: {
  radius: number;
  height: number;
  radialSegments: number;
  transforms: EventRoomInstanceTransform[];
  material: THREE.Material;
}) {
  const geometry = useMemo(
    () => new THREE.CylinderGeometry(radius, radius, height, radialSegments),
    [height, radialSegments, radius],
  );
  const matrices = useMemo(() => {
    const object = new THREE.Object3D();

    return transforms.map((transform) => {
      object.position.set(...transform.position);
      object.rotation.set(...(transform.rotation ?? [0, 0, 0]));
      object.scale.set(...(transform.scale ?? [1, 1, 1]));
      object.updateMatrix();
      return object.matrix.clone();
    });
  }, [transforms]);

  useEffect(() => () => {
    geometry.dispose();
  }, [geometry]);

  return (
    <instancedMesh
      args={[geometry, material, transforms.length]}
      onUpdate={(mesh) => {
        matrices.forEach((matrix, index) => {
          mesh.setMatrixAt(index, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }}
    />
  );
}
