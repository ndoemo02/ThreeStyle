import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib';
import { FACE_EXPRESSIONS, FACE_MORPHS, faceExpressionPose, neutralFacePose, type FaceExpression } from '../src/lib/creatorFace.ts';
import { cloneCreatorFaceGeometry } from '../src/lib/creatorFaceGeometry.ts';

test('cloning interleaved views retains their distinct offsets into a shared buffer', () => {
  const values = new Int16Array([10,20,30,0, 0,-2,3,0]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(values.subarray(0,4),4),3,0));
  geometry.morphAttributes.position = [new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(values.subarray(4),4),3,0)];
  const copy = cloneCreatorFaceGeometry(geometry,[0]);
  const delta = copy.morphAttributes.position![0];
  assert.deepEqual([delta.getX(0),delta.getY(0),delta.getZ(0)],[0,-2,3]);
  delta.setX(0,99);
  assert.equal(geometry.morphAttributes.position[0].getX(0),0,'source remains untouched');
});

test('real face keeps the original deformation at every vertex after reducing 52 morphs to the expression set', async () => {
  const bytes = await readFile(new URL('../public/models/optimized/facecap.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.subarray(20,20+jsonLength).toString());
  // The regression concerns geometry. Omit the unchanged KTX2 material in this
  // in-memory fixture so the real Meshopt buffers can load without a browser GPU.
  delete document.textures; delete document.images; document.materials = [{}];
  const text = JSON.stringify(document), json = Buffer.from(text.padEnd(Math.ceil(Buffer.byteLength(text)/4)*4));
  const binary = bytes.subarray(20+jsonLength), glb = Buffer.alloc(20+json.length+binary.length);
  glb.writeUInt32LE(0x46546c67,0); glb.writeUInt32LE(2,4); glb.writeUInt32LE(glb.length,8);
  glb.writeUInt32LE(json.length,12); glb.writeUInt32LE(0x4e4f534a,16); json.copy(glb,20); binary.copy(glb,20+json.length);
  const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder;
  const {scene} = await new GLTFLoader().setMeshoptDecoder(decoder).parseAsync(glb.buffer,'');
  const meshes: THREE.Mesh[] = [];
  scene.traverse(node => { if (node instanceof THREE.Mesh) meshes.push(node); });
  for (const mesh of meshes) {
    const indices = mesh.morphTargetDictionary ? FACE_MORPHS.map(name => mesh.morphTargetDictionary![name]) : undefined;
    const copy = cloneCreatorFaceGeometry(mesh.geometry,indices);
    for (const [name,attribute] of Object.entries(mesh.geometry.attributes)) {
      const cloned = copy.getAttribute(name);
      for (let i=0;i<attribute.count;i++) for (let c=0;c<attribute.itemSize;c++) assert.equal(cloned.getComponent(i,c),attribute.getComponent(i,c),`base ${name} ${i}:${c}`);
    }
    if (!indices) { copy.dispose(); continue; }
    const reduced = new THREE.Mesh(copy);
    assert.equal(reduced.morphTargetInfluences!.length,FACE_MORPHS.length);
    assert.equal(mesh.morphTargetInfluences!.length,52);
    for (const key of Object.keys(mesh.geometry.morphAttributes)) {
      const originals=mesh.geometry.morphAttributes[key as keyof typeof mesh.geometry.morphAttributes]!;
      const copies=copy.morphAttributes[key as keyof typeof copy.morphAttributes]!;
      indices.forEach((original,k) => {
        for (let i=0;i<originals[original].count;i++) for (let c=0;c<originals[original].itemSize;c++) assert.equal(copies[k].getComponent(i,c),originals[original].getComponent(i,c),`morph ${key} ${k} ${i}:${c}`);
      });
    }
    const extreme = FACE_MORPHS.map(() => 1);
    for (const pose of [neutralFacePose(), extreme, ...(Object.keys(FACE_EXPRESSIONS) as FaceExpression[]).map(name => faceExpressionPose(name))]) {
      mesh.morphTargetInfluences!.fill(0);
      indices.forEach((original,i) => {mesh.morphTargetInfluences![original]=pose[i];reduced.morphTargetInfluences![i]=pose[i];});
      for (let i=0;i<mesh.geometry.attributes.position.count;i++) {
        const expected=mesh.getVertexPosition(i,new THREE.Vector3()),actual=reduced.getVertexPosition(i,new THREE.Vector3());
        assert(actual.distanceTo(expected)<1e-8,`pose ${pose} detached vertex ${i}: ${actual.toArray()} vs ${expected.toArray()}`);
      }
    }
    copy.dispose();
  }
  meshes.forEach(mesh => mesh.geometry.dispose());
});
