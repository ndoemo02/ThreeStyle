'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader, KTX2Loader, MeshoptDecoder } from 'three-stdlib';
import * as THREE from 'three';
import { useCreatorFaceStore } from '@/stores/useCreatorFaceStore';
import { CREATOR_FACE_MODEL, FACE_MORPHS, createFaceDirector, directFace, neutralFacePose, smoothFacePose } from '@/lib/creatorFace';
import { cloneCreatorFaceGeometry } from '@/lib/creatorFaceGeometry';
import { createMusicFrame, readSharedMusic } from '@/lib/creatorMusic';
import { useCreatorLightingFrame } from '@/3d/world/rooms/CreatorLighting';

function disposeSource(scene: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  scene.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
  return { geometries: geometries.size, materials: materials.size, textures: textures.size };
}

/** Own every rendered resource; never mutate a cached GLTF or allocate 52 GPU morph layers. */
function prepareFace(source: THREE.Group) {
  const scene = source.clone(true), textures = new Map<THREE.Texture, THREE.Texture>();
  let head: THREE.Mesh | null = null;
  try { scene.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const indices = node.morphTargetDictionary ? FACE_MORPHS.map(name => node.morphTargetDictionary![name]) : undefined;
    if (indices?.some(index => index === undefined)) throw new Error('Missing required facial expressions');
    node.geometry = cloneCreatorFaceGeometry(node.geometry, indices);
    node.castShadow = node.receiveShadow = false;
    const hadMaterialArray = Array.isArray(node.material);
    const materials = (Array.isArray(node.material) ? node.material : [node.material]).map(original => {
      const material = original.clone();
      for (const [key, value] of Object.entries(material)) {
        if (!(value instanceof THREE.Texture)) continue;
        if (!textures.has(value)) { const copy = value.clone(); copy.needsUpdate = true; textures.set(value, copy); }
        Reflect.set(material, key, textures.get(value));
      }
      return material;
    });
    node.material = hadMaterialArray ? materials : materials[0];
    if (!node.morphTargetDictionary) return;
    node.updateMorphTargets();
    node.morphTargetDictionary = Object.fromEntries(FACE_MORPHS.map((name, index) => [name, index]));
    node.morphTargetInfluences!.fill(0);
    node.name = 'creator-audio-face-head';
    head = node;
  }); } catch (error) { disposeSource(scene); throw error; }
  if (!head) { disposeSource(scene); throw new Error('Face mesh is missing'); }
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene), center = bounds.getCenter(new THREE.Vector3());
  const height = bounds.getSize(new THREE.Vector3()).y;
  if (!Number.isFinite(height) || height <= 0) { disposeSource(scene); throw new Error('Invalid face size'); }
  scene.position.sub(center);
  const group = new THREE.Group();
  group.name = 'creator-audio-face-model'; group.add(scene); group.scale.setScalar(1.05 / height);
  return { group, head: head as THREE.Mesh, dispose: () => disposeSource(scene) };
}

export default function AudioReactiveFace({ revision }: { revision: number }) {
  const root = useRef<THREE.Group>(null);
  const renderer = useThree(s => s.gl);
  const scene = useThree(s => s.scene);
  const lighting = useCreatorLightingFrame();
  const runtime = useRef({ model: null as ReturnType<typeof prepareFace> | null, elapsed: 0, music: createMusicFrame(), cursor: { beats: 0 }, pose: neutralFacePose(), director: createFaceDirector(), time: 0,
    frustum: new THREE.Frustum(), matrix: new THREE.Matrix4(), sphere: new THREE.Sphere(new THREE.Vector3(), 0.85), reduced: false });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      if (!cancelled) useCreatorFaceStore.getState().setStatus('error', revision);
    }, 20000);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => { runtime.current.reduced = media.matches; };
    updateMotion(); media.addEventListener('change', updateMotion);
    useCreatorFaceStore.getState().setStatus('loading', revision);
    async function load() {
      let ktx: KTX2Loader | null = null;
      let source: THREE.Group | null = null;
      try {
        const response = await fetch(CREATOR_FACE_MODEL, { signal: controller.signal });
        if (!response.ok) throw new Error('Face asset unavailable');
        const bytes = await response.arrayBuffer();
        if (cancelled || controller.signal.aborted) return;
        ktx = new KTX2Loader().setTranscoderPath('/decoders/basis/').setWorkerLimit(1).detectSupport(renderer);
        const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder;
        const loader = new GLTFLoader().setKTX2Loader(ktx).setMeshoptDecoder(decoder);
        const gltf = await loader.parseAsync(bytes, '/models/optimized/');
        source = gltf.scene;
        if (cancelled || controller.signal.aborted) return;
        const model = prepareFace(source);
        runtime.current.model = model;
        root.current?.add(model.group);
        useCreatorFaceStore.getState().setStatus('ready', revision);
      } catch (error) {
        if (!cancelled) useCreatorFaceStore.getState().setStatus('error', revision);
        if (!cancelled && process.env.NODE_ENV !== 'production') console.warn('[Creator face]', error);
      } finally {
        clearTimeout(timer); ktx?.dispose(); if (source) disposeSource(source);
      }
    }
    void load();
    const state = runtime.current;
    return () => {
      cancelled = true; controller.abort(); clearTimeout(timer); media.removeEventListener('change', updateMotion);
      state.model?.group.removeFromParent();
      const disposed = state.model?.dispose();
      if (disposed && process.env.NODE_ENV !== 'production') scene.userData.creatorFaceLastDisposal = { ...disposed, revision };
      state.model = null;
    };
  }, [renderer, revision, scene]);

  useFrame(({ camera }, delta) => {
    const state = runtime.current, group = root.current;
    if (!group || !state.model) return;
    group.getWorldPosition(state.sphere.center);
    state.frustum.setFromProjectionMatrix(state.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    group.visible = !document.hidden && state.sphere.center.distanceToSquared(camera.position) < 196 && state.frustum.intersectsSphere(state.sphere);
    if (!group.visible) return;
    state.elapsed += Math.min(delta, 0.1);
    if (state.elapsed < 1 / (state.reduced ? 15 : 30)) return;
    const music = readSharedMusic(lighting.current.music, state.cursor, state.music);
    const step = state.elapsed; state.elapsed = 0; state.time += step;
    smoothFacePose(state.pose, directFace(state.director, music, step, state.reduced), step);
    state.model.head.morphTargetInfluences!.splice(0, FACE_MORPHS.length, ...state.pose);
    // Small head motion while music plays: a nod on detected beats plus a slow sway; eases back on pause.
    const sway = music && !state.reduced ? 1 : 0, follow = 1 - Math.exp(-step * 6);
    group.rotation.x += (state.director.nod * 0.09 + sway * Math.sin(state.time * 1.3) * 0.025 - group.rotation.x) * follow;
    group.rotation.y += (sway * Math.sin(state.time * 0.7) * 0.06 - group.rotation.y) * follow;
  });
  return <group ref={root} name="creator-audio-face" position={[1.3, 2.15, -2.6]} dispose={null} />;
}
