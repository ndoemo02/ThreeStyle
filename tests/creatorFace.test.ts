import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FACE_MORPHS, faceAudioTargets, smoothFacePose, type FacePose } from '../src/lib/creatorFace.ts';
import { useCreatorFaceStore } from '../src/stores/useCreatorFaceStore.ts';

test('real face asset supports all chosen expressions within the geometry budget', async () => {
  const bytes = await readFile(new URL('../public/models/optimized/facecap.glb', import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const mesh = gltf.meshes.find((item: { extras?: { targetNames?: string[] } }) => item.extras?.targetNames);
  for (const name of FACE_MORPHS) assert(mesh.extras.targetNames.includes(name));
  let triangles = 0;
  for (const item of gltf.meshes) for (const primitive of item.primitives) triangles += gltf.accessors[primitive.indices].count / 3;
  assert(triangles < 10000); assert(bytes.length < 400000);
});

test('silence, pause and a short analyser buffer never produce invalid expression values', () => {
  assert.deepEqual(faceAudioTargets(null), [0,0,0,0,0]);
  assert.deepEqual(faceAudioTargets(new Uint8Array(256)), [0,0,0,0,0]);
  for (const size of [0,1,2,8,256]) assert(faceAudioTargets(new Uint8Array(size).fill(255)).every(n => Number.isFinite(n) && n >= 0 && n <= 1));
});

test('vocal energy opens the mouth; reduced motion removes eyelid/brow pulses', () => {
  const fft = new Uint8Array(256); fft.fill(170, 1, 40);
  const normal = faceAudioTargets(fft), reduced = faceAudioTargets(fft, true);
  assert(normal[0] > 0.3); assert(normal[1] > 0); assert(normal[3] > 0);
  assert(reduced[0] > 0 && reduced[0] < normal[0]);
  assert.deepEqual(reduced.slice(1), [0,0,0,0]);
  const pose: FacePose = [0,0,0,0,0];
  for (let i = 0; i < 60; i++) smoothFacePose(pose, normal, 1/60);
  assert(pose[0] > 0.3 && pose[0] <= normal[0]);
  for (let i = 0; i < 120; i++) smoothFacePose(pose, faceAudioTargets(null), 1/60);
  assert(pose.every(n => n < 0.00001), 'pause settles all expressions back to neutral');
});

test('turning off or retrying rejects completion from an obsolete model request', () => {
  const initial = useCreatorFaceStore.getInitialState();
  try {
    useCreatorFaceStore.setState(initial, true);
    assert.equal(useCreatorFaceStore.getState().enabled, false);
    useCreatorFaceStore.getState().setEnabled(true);
    const first = useCreatorFaceStore.getState().revision;
    useCreatorFaceStore.getState().setEnabled(false);
    useCreatorFaceStore.getState().setStatus('ready', first);
    assert.equal(useCreatorFaceStore.getState().status, 'off');
    useCreatorFaceStore.getState().setEnabled(true);
    useCreatorFaceStore.getState().retry();
    useCreatorFaceStore.getState().setStatus('error', first);
    assert.equal(useCreatorFaceStore.getState().status, 'loading');
    useCreatorFaceStore.getState().setStatus('ready', useCreatorFaceStore.getState().revision);
    assert.equal(useCreatorFaceStore.getState().status, 'ready');
  } finally { useCreatorFaceStore.setState(initial, true); }
});
