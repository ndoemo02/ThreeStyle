'use client';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useTransitionStore } from '../../store/useTransitionStore';
import { useElevatorUiStore } from '../../stores/useElevatorUiStore';
import { useEntryStore } from '../../stores/useEntryStore';
import * as THREE from 'three';
import { ENTRY } from '../../lib/entryTransition';
import { useCreatorFaceStore } from '../../stores/useCreatorFaceStore';

export function SceneDiagnostics({ ready }: { ready: boolean }) {
  const get = useThree(s => s.get);
  const fixtureApplied = useRef(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    // Development-only fixture: actual ride input still goes through the visible UI.
    const fixture = ready && !fixtureApplied.current && ['elevator', 'elevator-approach', 'signage', 'corridor', 'bench', 'mural', 'face', 'face-close', 'face-side', 'lucky', 'lucky-close'].includes(query.get('qa') ?? '') ? window.setTimeout(() => {
      fixtureApplied.current = true;
      const state = get();
      if (query.get('qa') === 'face-close' || query.get('qa') === 'face-side') {
        state.camera.position.set(query.get('qa') === 'face-side' ? -9.3 : -8.2, 2.15, query.get('qa') === 'face-side' ? -5.2 : -3.8);
        state.camera.lookAt(-9.66, 2.15, -3.8);
      } else if (query.get('qa') === 'lucky-close') {
        state.camera.position.set(-7.6, 2.08, -4.1); state.camera.lookAt(-8.46, 2.02, -4.25);
      } else if (query.get('qa') === 'lucky') {
        state.camera.position.set(-6.4, 2.05, -3.4); state.camera.lookAt(-8.46, 1.85, -4.25);
      } else if (query.get('qa') === 'face') {
        state.camera.position.set(-4.8, 2.2, -2.5); state.camera.lookAt(-9.66, 2.15, -3.8);
      } else if (query.get('qa') === 'signage') {
        state.camera.position.set(4, 2.05, 6); state.camera.lookAt(-2, 2.55, -9.5);
      } else if (query.get('qa') === 'bench') {
        state.camera.position.set(-4, 2.05, 6); state.camera.lookAt(-10.3, 1.6, 1);
      } else if (query.get('qa') === 'mural') {
        state.camera.position.set(1, 2.05, -3); state.camera.lookAt(9.8, 2.3, 0);
      } else if (query.get('qa') === 'corridor') {
        state.camera.position.set(-13, 2.05, -4.3); state.camera.lookAt(-39, 2.35, -5);
      } else if (useTransitionStore.getState().activeZone === 'hub') {
        state.camera.position.set(-24, 2.05, 0);
        state.camera.lookAt(-24, 1.85, 4);
      } else {
        state.camera.position.set(0, 2.05, query.get('qa') === 'elevator-approach' ? 4.4 : 7.45);
        state.camera.lookAt(0, 1.85, 12);
      }
      state.camera.updateMatrixWorld();
    }, 500) : null;
    const target = window as Window & { render_game_to_text?: () => string };
    const read = () => {
      const scene = get();
      const navigation = useTransitionStore.getState();
      const cabin = scene.scene.getObjectByName('creator-elevator-cabin');
      const face = scene.scene.getObjectByName('creator-audio-face');
      const faceHead = scene.scene.getObjectByName('creator-audio-face-head') as THREE.Mesh | undefined;
      const lucky = scene.scene.getObjectByName('creator-lucky');
      const luckyFaces: THREE.Mesh[] = [];
      lucky?.traverse(node => { if (node instanceof THREE.Mesh && node.morphTargetDictionary?.jawOpen !== undefined) luckyFaces.push(node); });
      const luckyHead = luckyFaces[0];
      const faceParts: unknown[] = [];
      if (query.get('qa')?.startsWith('face')) face?.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        const box = new THREE.Box3(), vertex = new THREE.Vector3();
        for (let i = 0; i < node.geometry.attributes.position.count; i++) box.expandByPoint(node.getVertexPosition(i, vertex).applyMatrix4(node.matrixWorld));
        faceParts.push({ name: node.name, center: box.getCenter(vertex).toArray(), size: box.getSize(new THREE.Vector3()).toArray(), screen: box.getCenter(vertex).project(scene.camera).toArray() });
      });
      const seam = new THREE.Vector3(ENTRY.x, 2.325, ENTRY.z + 0.087).project(scene.camera);
      return JSON.stringify({
        coordinateSystem: 'Y up; camera forward follows view, metres',
        zone: navigation.activeZone, origin: navigation.originZone, target: navigation.targetZone,
        elevator: navigation.elevatorState, rideStatus: useElevatorUiStore.getState().rideStatus,
        canRide: useElevatorUiStore.getState().available,
        camera: scene.camera.position.toArray(), dpr: scene.gl.getPixelRatio(),
        exposure: scene.gl.toneMappingExposure,
        ready,
        render: { calls: scene.gl.info.render.calls, triangles: scene.gl.info.render.triangles, textures: scene.gl.info.memory.textures, geometries: scene.gl.info.memory.geometries },
        face: { enabled: useCreatorFaceStore.getState().enabled, status: useCreatorFaceStore.getState().status, revision: useCreatorFaceStore.getState().revision,
          disposed: scene.scene.userData.creatorFaceLastDisposal ?? null,
          visible: face?.visible ?? false, mounted: Boolean(face), morphCount: faceHead?.geometry.morphAttributes.position?.length ?? 0,
          pose: faceHead?.morphTargetInfluences ?? [], parts: faceParts },
        lucky: { mounted: Boolean(lucky?.children.length), visible: lucky?.visible ?? false, disposed: scene.scene.userData.creatorLuckyDisposed ?? null,
          morphs: luckyHead ? Object.fromEntries(Object.entries(luckyHead.morphTargetDictionary!).map(([name, index]) => [name, +(luckyHead!.morphTargetInfluences![index]).toFixed(3)])) : null,
          faceMeshes: luckyFaces.length,
          facesInSync: luckyFaces.every(mesh => mesh.morphTargetInfluences!.every((value, i) => Math.abs(value - luckyHead!.morphTargetInfluences![i]) < 1e-6)),
          headPitch: lucky?.getObjectByName('head')?.rotation.x ?? null },
        entry: { phase: useEntryStore.getState().phase,
          seam: [(seam.x + 1) * scene.size.width / 2, (1 - seam.y) * scene.size.height / 2],
          doors: ['landing-door-left', 'landing-door-right'].map(name => scene.scene.getObjectByName(name)?.position.x) },
        canvas: [scene.gl.domElement.width, scene.gl.domElement.height],
        cabin: cabin ? { visible: cabin.visible, doors: cabin.children.filter(o => o.type === 'Group').map(o => o.position.x),
          shaftVisible: scene.scene.getObjectByName('creator-elevator-shaft')?.visible } : null,
      });
    };
    target.render_game_to_text = read;
    return () => {
      if (fixture !== null) window.clearTimeout(fixture);
      if (target.render_game_to_text === read) delete target.render_game_to_text;
    };
  }, [get, ready]);
  return null;
}
