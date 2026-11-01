import * as THREE from 'three';

/** Isolate the rendered buffers and retain only the requested expression channels. */
export function cloneCreatorFaceGeometry(source: THREE.BufferGeometry, morphIndices?: readonly number[]) {
  // Meshopt exposes separate typed-array views of one backing ArrayBuffer.
  // BufferGeometry.clone shares its copy cache by backing buffer, conflating
  // these views: morph deltas then become base positions. Give each attribute
  // its own copy context, preserving its view, stride and normalization.
  const cloneAttribute = (attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) =>
    attribute instanceof THREE.InterleavedBufferAttribute ? attribute.clone({}) : attribute.clone();
  const geometry = new THREE.BufferGeometry();
  geometry.name = source.name;
  geometry.setIndex(source.index?.clone() ?? null);
  for (const [name,attribute] of Object.entries(source.attributes)) geometry.setAttribute(name,cloneAttribute(attribute));
  for (const key of Object.keys(source.morphAttributes)) {
    const attributes = source.morphAttributes[key as keyof typeof source.morphAttributes]!;
    Reflect.set(geometry.morphAttributes, key, (morphIndices ? morphIndices.map(index => attributes[index]) : attributes).map(cloneAttribute));
  }
  geometry.morphTargetsRelative = source.morphTargetsRelative;
  source.groups.forEach(group => geometry.addGroup(group.start,group.count,group.materialIndex));
  geometry.setDrawRange(source.drawRange.start,source.drawRange.count);
  geometry.boundingBox = source.boundingBox?.clone() ?? null;
  geometry.boundingSphere = source.boundingSphere?.clone() ?? null;
  geometry.userData = {...source.userData};
  return geometry;
}
