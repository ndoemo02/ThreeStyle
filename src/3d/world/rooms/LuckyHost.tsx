'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib';
import * as THREE from 'three';
import { useAudioStore } from '@/stores/useAudioStore';
import { useHudStore } from '@/stores/useHudStore';
import { useCreatorFaceStore } from '@/stores/useCreatorFaceStore';
import { FACE_MORPHS, createFaceDirector, directFace, faceExpressionPose, neutralFacePose, smoothFacePose } from '@/lib/creatorFace';
import { createMusicFrame, readSharedMusic } from '@/lib/creatorMusic';
import { LUCKY_BOOTH_POSITION, LUCKY_BOOTH_ROTATION_Y, LUCKY_GREETING_DISTANCE, LUCKY_SCALE, LUCKY_GREETING_SECONDS, luckyBodyPose, luckyModelUrl } from '@/lib/lucky';
import { useCreatorRoomMobile } from './CreatorRoomProfile';
import { useCreatorLightingFrame } from './CreatorLighting';

type BoneDriver = { bone: THREE.Bone; rest: THREE.Quaternion; x: THREE.Vector3; y: THREE.Vector3; z: THREE.Vector3 };
const turn = new THREE.Quaternion();

/** Rotations are given about the model's world axes (X pitch, Y yaw, Z roll) at rest. */
function boneDriver(bone: THREE.Bone): BoneDriver {
  const inverse = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
  return { bone, rest: bone.quaternion.clone(), x: new THREE.Vector3(1, 0, 0).applyQuaternion(inverse), y: new THREE.Vector3(0, 1, 0).applyQuaternion(inverse), z: new THREE.Vector3(0, 0, 1).applyQuaternion(inverse) };
}

function drive(driver: BoneDriver | null, pitch: number, yaw = 0, roll = 0) {
  if (!driver) return;
  const q = driver.bone.quaternion.copy(driver.rest);
  if (pitch) q.multiply(turn.setFromAxisAngle(driver.x, pitch));
  if (yaw) q.multiply(turn.setFromAxisAngle(driver.y, yaw));
  if (roll) q.multiply(turn.setFromAxisAngle(driver.z, roll));
}

function disposeModel(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  root.traverse(node => {
    if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
  });
  textures.forEach(texture => texture.dispose());
}

function prepareLucky(scene: THREE.Group) {
  scene.updateMatrixWorld(true);
  // The head has two materials (satin skin, dark mouth), so glTF splits it into two meshes
  // that each carry the expression channels; both must be driven together.
  const faces: { mesh: THREE.Mesh; indices: number[] }[] = [];
  const bones = new Map<string, THREE.Bone>();
  scene.traverse(node => {
    if (node instanceof THREE.Bone) bones.set(node.name, node);
    if (!(node instanceof THREE.Mesh)) return;
    node.castShadow = node.receiveShadow = false;
    node.frustumCulled = false; // skinned bounds are rest-pose; the root group is culled instead
    const dictionary = node.morphTargetDictionary;
    if (!dictionary || !('jawOpen' in dictionary)) return;
    const indices = FACE_MORPHS.map(name => dictionary[name]);
    if (indices.some(index => index === undefined)) throw new Error('Lucky face channels are missing');
    faces.push({ mesh: node, indices });
  });
  if (!faces.length) throw new Error('Lucky face is missing');
  const driver = (name: string) => { const bone = bones.get(name); return bone ? boneDriver(bone) : null; };
  return { scene, faces, headBone: driver('head'), neck: driver('neck'), spine: driver('spine'), chest: driver('chest') };
}

/** Lucky behind the booth glass: greets once, makes faces and grooves to the HUD player's music. */
export default function LuckyHost({ revision, onUnavailable }: { revision: number; onUnavailable: () => void }) {
  const mobile = useCreatorRoomMobile();
  const root = useRef<THREE.Group>(null);
  const scene = useThree(s => s.scene);
  const lighting = useCreatorLightingFrame();
  const unavailable = useRef(onUnavailable);
  useEffect(() => { unavailable.current = onUnavailable; }, [onUnavailable]);
  const runtime = useRef({
    model: null as ReturnType<typeof prepareLucky> | null, elapsed: 0, time: 0, music: createMusicFrame(), cursor: { beats: 0 },
    pose: neutralFacePose(), director: createFaceDirector(), greetingStart: -1, reduced: false,
    frustum: new THREE.Frustum(), matrix: new THREE.Matrix4(), sphere: new THREE.Sphere(new THREE.Vector3(), 1.3), head: new THREE.Vector3(),
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); if (!cancelled) useCreatorFaceStore.getState().setStatus('error', revision); }, 20000);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => { runtime.current.reduced = media.matches; };
    updateMotion(); media.addEventListener('change', updateMotion);
    useCreatorFaceStore.getState().setStatus('loading', revision);
    let loaded: THREE.Group | null = null;
    async function load() {
      try {
        const response = await fetch(luckyModelUrl(mobile), { signal: controller.signal });
        // The model ships only where its licences are cleared; elsewhere the booth falls back to the face.
        if (response.status === 404) { clearTimeout(timer); if (!cancelled) unavailable.current(); return; }
        if (!response.ok) throw new Error('Lucky asset unavailable');
        const bytes = await response.arrayBuffer();
        if (cancelled || controller.signal.aborted) return;
        // A host that answers a missing file with an HTML page (status 200) also means "not deployed".
        if (bytes.byteLength < 4 || new TextDecoder().decode(new Uint8Array(bytes, 0, 4)) !== 'glTF') { unavailable.current(); return; }
        const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder;
        const gltf = await new GLTFLoader().setMeshoptDecoder(decoder).parseAsync(bytes, '/models/lucky/');
        loaded = gltf.scene;
        if (cancelled || controller.signal.aborted) { disposeModel(loaded); loaded = null; return; }
        runtime.current.model = prepareLucky(loaded);
        root.current?.add(loaded);
        useCreatorFaceStore.getState().setStatus('ready', revision);
      } catch (error) {
        if (loaded) { disposeModel(loaded); loaded = null; }
        if (!cancelled) useCreatorFaceStore.getState().setStatus('error', revision);
        if (!cancelled && process.env.NODE_ENV !== 'production') console.warn('[Lucky]', error);
      } finally { clearTimeout(timer); }
    }
    void load();
    const state = runtime.current;
    return () => {
      cancelled = true; controller.abort(); clearTimeout(timer); media.removeEventListener('change', updateMotion);
      if (loaded) { loaded.removeFromParent(); disposeModel(loaded); }
      if (process.env.NODE_ENV !== 'production' && loaded) scene.userData.creatorLuckyDisposed = revision;
      state.model = null;
    };
  }, [mobile, revision, scene]);

  useFrame(({ camera }, delta) => {
    const state = runtime.current, group = root.current, model = state.model;
    if (!group || !model) return;
    group.localToWorld(state.head.set(0, 1.55, 0));
    state.sphere.center.copy(state.head);
    state.frustum.setFromProjectionMatrix(state.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const distanceSq = state.head.distanceToSquared(camera.position);
    group.visible = !document.hidden && distanceSq < 196 && state.frustum.intersectsSphere(state.sphere);
    if (!group.visible) return;
    const step = Math.min(delta, 0.1);
    state.time += step;
    // Greet only once the deck is closed, so the nod is actually seen.
    if (state.greetingStart < 0 && distanceSq < LUCKY_GREETING_DISTANCE ** 2 && !useHudStore.getState().isOpen) state.greetingStart = state.time;
    const greeting = state.greetingStart < 0 ? -1 : state.time - state.greetingStart;
    const playing = useHudStore.getState().playbackStatus === 'playing' && useAudioStore.getState().isActive;

    const body = luckyBodyPose(state.time, greeting, state.director.nod, playing, state.reduced);
    drive(model.headBone, body.headPitch, body.headYaw);
    drive(model.neck, body.neckPitch);
    drive(model.spine, body.spinePitch, 0, body.spineRoll);
    drive(model.chest, body.chestPitch);

    state.elapsed += step;
    if (state.elapsed < 1 / (state.reduced ? 15 : 30)) return;
    const faceStep = state.elapsed; state.elapsed = 0;
    const music = readSharedMusic(lighting.current.music, state.cursor, state.music);
    const target = greeting >= 0 && greeting < LUCKY_GREETING_SECONDS
      ? faceExpressionPose('smile', state.reduced ? 0.5 : 0.9)
      : directFace(state.director, music, faceStep, state.reduced);
    smoothFacePose(state.pose, target, faceStep);
    for (const face of model.faces) {
      const influences = face.mesh.morphTargetInfluences!;
      face.indices.forEach((index, i) => { influences[index] = state.pose[i]; });
    }
  });

  return <group ref={root} name="creator-lucky" position={LUCKY_BOOTH_POSITION} rotation={[0, LUCKY_BOOTH_ROTATION_Y, 0]} scale={LUCKY_SCALE} dispose={null} />;
}
