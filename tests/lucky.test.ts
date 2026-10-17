import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { FACE_MORPHS } from '../src/lib/creatorFace.ts';
import { LUCKY_GREETING_SECONDS, LUCKY_SCALE, luckyBodyPose, luckyGreetingWeight, luckyModelUrl } from '../src/lib/lucky.ts';

test('the greeting rises, holds a nod and returns exactly to rest', () => {
  assert.equal(luckyGreetingWeight(-1), 0);
  assert.equal(luckyGreetingWeight(0), 0);
  assert.equal(luckyGreetingWeight(LUCKY_GREETING_SECONDS), 0);
  assert.equal(luckyGreetingWeight(Number.NaN), 0);
  assert.equal(luckyGreetingWeight(LUCKY_GREETING_SECONDS * 0.5), 1);
  let previous = 0;
  for (let t = 0; t <= LUCKY_GREETING_SECONDS * 0.35; t += 0.05) { const w = luckyGreetingWeight(t); assert(w >= previous - 1e-9); previous = w; }
  const nod = luckyBodyPose(0, LUCKY_GREETING_SECONDS / 2, 0, false);
  assert(nod.headPitch > 0.25 && nod.spinePitch > 0, 'hat-tip nod and a slight bow');
});

test('music adds groove and beat nods; reduced motion keeps only a soft greeting and breathing', () => {
  const quiet = luckyBodyPose(1, -1, 1, false), groove = luckyBodyPose(1, -1, 1, true);
  assert.equal(quiet.spineRoll, 0);
  assert.notEqual(groove.spineRoll, 0);
  assert(groove.headPitch > quiet.headPitch, 'beat nod while playing');
  const reduced = luckyBodyPose(1, LUCKY_GREETING_SECONDS / 2, 1, true, true);
  assert(Math.abs(reduced.headPitch - 0.15) < 1e-9, 'half greeting, no nod');
  assert.equal(reduced.spineRoll, 0);
  assert.equal(reduced.headYaw, 0);
  for (const pose of [quiet, groove, reduced, luckyBodyPose(Number.NaN, Number.NaN, Number.NaN, true)]) {
    assert(Object.values(pose).every(v => Number.isFinite(v) && Math.abs(v) < 0.5));
  }
});

test('his face sits near the room eye height so it reads through the booth window', () => {
  const faceHeight = 1.65 * LUCKY_SCALE; // model face centre at 1.65 m before scaling
  assert(Math.abs(faceHeight - 2.05) < 0.15, `face at ${faceHeight.toFixed(2)} m`);
  assert(2.0 * LUCKY_SCALE < 3.2 - 0.3, 'hat clears the 3.2 m booth ceiling');
});

// The model is local-only until its licences are cleared (docs/lucky-licensing-2026-10-17.md).
for (const mobile of [false, true]) {
  const file = new URL(`../public${luckyModelUrl(mobile)}`, import.meta.url);
  const present = await stat(file).then(() => true, () => false);
  test(`${mobile ? 'mobile' : 'desktop'} Lucky asset has the face channels, the driven bones and fits the budget`, { skip: !present && 'asset not deployed here' }, async () => {
    const bytes = await readFile(file);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const head = gltf.meshes.find((mesh: { extras?: { targetNames?: string[] } }) => mesh.extras?.targetNames);
    assert.deepEqual([...head.extras.targetNames].sort(), [...FACE_MORPHS].sort());
    const names = gltf.nodes.map((node: { name?: string }) => node.name);
    for (const bone of ['head', 'neck', 'spine', 'chest']) assert(names.includes(bone), `bone ${bone}`);
    let triangles = 0;
    for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) triangles += gltf.accessors[primitive.indices].count / 3;
    // Phones get a lighter coat (the face keeps every vertex) to protect 60 fps.
    assert(triangles <= (mobile ? 26000 : 45000), `${triangles} triangles`);
    assert(bytes.length < (mobile ? 800_000 : 1_400_000), `${bytes.length} bytes`);
    assert(gltf.extensionsUsed.includes('EXT_meshopt_compression'));
  });
}
