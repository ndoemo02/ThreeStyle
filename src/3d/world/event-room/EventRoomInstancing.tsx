"use client";

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export type EventRoomInstanceTransform = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

export function EventRoomInstancedBoxes({
  size,
  transforms,
  material,
}: {
  size: [number, number, number];
  transforms: EventRoomInstanceTransform[];
  material: THREE.Material;
}) {
  const [width, height, depth] = size;
  const geometry = useMemo(() => new THREE.BoxGeometry(width, height, depth), [width, height, depth]);
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
