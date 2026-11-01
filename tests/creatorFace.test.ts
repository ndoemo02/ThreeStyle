import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FACE_EXPRESSIONS, FACE_MORPHS, createFaceDirector, directFace, faceExpressionPose, neutralFacePose, smoothFacePose } from '../src/lib/creatorFace.ts';
import { createBeatTracker, kickLevelFromDecibels, lowLevelFromDecibels, stepBeatTracker, voiceLevelFromDecibels, type BeatTracker, type MusicFrame } from '../src/lib/creatorMusic.ts';
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

function seeded(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

/** 120 BPM: a bass hit every 0.5 s on top of a steady vocal band. */
function songFrame(time: number, loud = 200) {
  const fft = new Uint8Array(256);
  fft.fill(110, 4, 18);
  fft.fill(time % 0.5 < 0.06 ? loud : 40, 1, 8);
  return fft;
}

/** What the lighting provider shares: byte-scale frames as analyser dB, through the one beat tracker. */
function listen(tracker: BeatTracker, decibels: ArrayLike<number>, delta: number): MusicFrame {
  const kick = kickLevelFromDecibels(decibels);
  return { kick, low: lowLevelFromDecibels(decibels), voice: voiceLevelFromDecibels(decibels), beat: stepBeatTracker(tracker, kick, delta) };
}
const decibels = (bytes: Uint8Array) => Float32Array.from(bytes, byte => byte / 255 * 70 - 100);

test('silence, pause and a short analyser buffer never produce invalid expression values', () => {
  const director = createFaceDirector(seeded(1)), tracker = createBeatTracker();
  assert.deepEqual(directFace(director, null, 1 / 30), neutralFacePose());
  for (const size of [0, 1, 2, 8, 256]) {
    const pose = directFace(director, listen(tracker, decibels(new Uint8Array(size).fill(255)), 1 / 30), 1 / 30, false, seeded(size));
    assert.equal(pose.length, FACE_MORPHS.length);
    assert(pose.every(n => Number.isFinite(n) && n >= 0 && n <= 1));
  }
  for (const name of Object.keys(FACE_EXPRESSIONS) as (keyof typeof FACE_EXPRESSIONS)[]) {
    assert(faceExpressionPose(name, 2).every(n => n >= 0 && n <= 1), `${name} stays within morph range`);
  }
});

test('music changes the expression on the beat, never faster than the hold time, and keeps variety', () => {
  const random = seeded(7), director = createFaceDirector(random), tracker = createBeatTracker();
  const seen = new Set<string>(), switches: number[] = [];
  let previous: string | null = null;
  for (let frame = 0; frame < 30 * 8; frame++) {
    const time = frame / 30;
    const pose = directFace(director, listen(tracker, decibels(songFrame(time)), 1 / 30), 1 / 30, false, random);
    assert(pose.every(n => n >= 0 && n <= 1));
    if (director.expression !== previous) { switches.push(time); previous = director.expression; }
    if (director.expression) seen.add(director.expression);
  }
  assert(seen.size >= 5, `only ${[...seen].join(', ')}`);
  for (let i = 2; i < switches.length; i++) assert(switches[i] - switches[i - 1] >= 0.45 - 1e-9, 'minimum hold between faces');
  assert(switches.length >= 8, `${switches.length} changes in 8 s of music`);
  const gaps = switches.slice(2).map((t, i) => t - switches[i + 1]);
  assert(Math.max(...gaps) <= 1.3 + 1 / 30 + 1e-9, 'a face never freezes for long while music plays');
});

test('quiet passages favour calm faces, loud ones big faces; the jaw follows the vocal band', () => {
  const hot = new Set(['laugh', 'angry', 'surprise', 'grimace']);
  const share = (frame: Uint8Array) => {
    let big = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const director = createFaceDirector(seeded(seed));
      directFace(director, listen(createBeatTracker(), decibels(frame), 1 / 30), 1 / 30, false, seeded(seed * 7));
      if (hot.has(director.expression!)) big++;
    }
    return big / 200;
  };
  const quiet = new Uint8Array(256); quiet.fill(30, 4, 18); quiet.fill(25, 1, 8);
  const loudFrame = songFrame(0, 255).fill(220, 4, 18);
  assert(share(quiet) < 0.3, `quiet big-face share ${share(quiet)}`);
  assert(share(loudFrame) > 0.6, `loud big-face share ${share(loudFrame)}`);
  const pose = directFace(createFaceDirector(seeded(4)), listen(createBeatTracker(), decibels(loudFrame), 1 / 30), 1 / 30, false, seeded(4));
  assert(pose[FACE_MORPHS.indexOf('jawOpen')] > 0.3);
});

test('reduced motion changes faces slowly and softly; pause settles everything back to neutral', () => {
  const random = seeded(11), director = createFaceDirector(random), tracker = createBeatTracker();
  const switches: number[] = [];
  let previous: string | null = null, peak = 0;
  const pose = neutralFacePose();
  for (let frame = 0; frame < 15 * 8; frame++) {
    const target = directFace(director, listen(tracker, decibels(songFrame(frame / 15)), 1 / 15), 1 / 15, true, random);
    smoothFacePose(pose, target, 1 / 15);
    if (director.expression !== previous) { switches.push(frame / 15); previous = director.expression; }
    peak = Math.max(peak, ...target.filter((_, i) => i !== 1 && i !== 2));
  }
  for (let i = 1; i < switches.length; i++) assert(switches[i] - switches[i - 1] >= 1.6 - 1e-9);
  assert.equal(director.nod, 0, 'no head nods with reduced motion');
  assert(peak <= 0.6, `reduced intensity peak ${peak}`);
  for (let i = 0; i < 120; i++) smoothFacePose(pose, directFace(director, null, 1 / 60), 1 / 60);
  assert(pose.every(n => n < 0.00001), 'pause settles all expressions back to neutral');
});

/**
 * Loud master at 120 BPM: the kick band peaks at -22 dB over a -29 dB floor, both above the byte
 * ceiling (-30 dB), so byte data reads a flat 255 and the old face detector saw no beats at all.
 * Analyser-like: smoothing 0.8 at 60 Hz, read at 30 Hz like the provider.
 */
function loudMasterFace(seconds: number) {
  const random = seeded(5), director = createFaceDirector(random), tracker = createBeatTracker();
  const db = new Float32Array(256).fill(-45);
  let magnitude = 0, read = 0, nods = 0, switches = 0, previous: string | null = null, saturatedBytes = true;
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    magnitude = 0.8 * magnitude + 0.2 * 10 ** ((t % 0.5 < 0.08 ? -22 : -29) / 20);
    read += dt;
    if (read < 1 / 30) continue;
    const bandDb = 20 * Math.log10(magnitude);
    if (t > 1) saturatedBytes &&= bandDb > -30;
    db.fill(bandDb, 1, 8);
    directFace(director, listen(tracker, db, read), read, false, random);
    read = 0;
    if (director.nod === 1) nods++;
    if (director.expression !== previous) { switches++; previous = director.expression; }
  }
  return { nods, switches, saturatedBytes };
}

test('a loud master whose bass sits above the byte ceiling still drives faces and nods on the beat', () => {
  const { nods, switches, saturatedBytes } = loudMasterFace(20);
  assert.ok(saturatedBytes, 'the test signal really clips byte data');
  // ~40 beats in 20 s; the 1.3 s fallback alone would give ~15 switches and no nods.
  assert.ok(nods >= 25, `${nods} beat nods in 20 s`);
  assert.ok(switches >= 25, `${switches} face changes in 20 s`);
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
