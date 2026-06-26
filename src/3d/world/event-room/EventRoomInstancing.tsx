"use client";

import { useMemo } from 'react';
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
  const geometry = useMemo(() => new THREE.BoxGeometry(size[0], size[1], size[2]), [size]);

  return (
    <instancedMesh
      args={[geometry, material, transforms.length]}
      onUpdate={(mesh) => {
        const object = new THREE.Object3D();
        transforms.forEach((transform, index) => {
          object.position.set(...transform.position);
          object.rotation.set(...(transform.rotation ?? [0, 0, 0]));
          object.scale.set(...(transform.scale ?? [1, 1, 1]));
          object.updateMatrix();
          mesh.setMatrixAt(index, object.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }}
    />
  );
}
