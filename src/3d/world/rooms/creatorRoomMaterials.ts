import * as THREE from 'three';

/** Room-local clones keep cached source assets safe for other scenes. */
export function prepareCreatorRoomMaterial(source: THREE.Material) {
  const material = source.clone();
  if (material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0) {
    material.transmission = 0;
    material.thickness = 0;
    material.transparent = true;
    material.opacity = 0.24;
    material.depthWrite = false;
    material.roughness = Math.max(0.25, material.roughness);
  } else if (!material.transparent || material.opacity >= 0.999) {
    material.transparent = false;
    material.opacity = 1;
  }
  material.side = THREE.FrontSide;
  material.visible = true;
  material.needsUpdate = true;
  return material;
}

export function disposeCreatorRoomMaterials(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse(node => {
    if (node instanceof THREE.Mesh) for (const material of [node.material].flat()) materials.add(material);
  });
  // Cached GLTF geometry/textures are shared and remain owned by the loader.
  for (const material of materials) material.dispose();
}
