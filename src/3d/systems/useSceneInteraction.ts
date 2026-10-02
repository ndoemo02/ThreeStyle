"use client";

import { useId, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHudStore } from '../../stores/useHudStore';
import { isInteractionKey, performInteraction, resolveInteraction, type InteractionCandidate } from './sceneInteractionPolicy';

type Target = {
  object?: RefObject<THREE.Object3D | null>;
  maxDistance: number;
  canInteract: () => boolean;
  activate: () => boolean;
  releasePointer?: boolean;
  triggerZone?: () => boolean;
};
type RegisteredTarget = { id: string; read: () => Target };
type Candidate = InteractionCandidate & { activate: () => boolean; releasePointer: boolean };

function isWithin(object: THREE.Object3D, ancestor: THREE.Object3D) {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    if (current === ancestor) return true;
  }
  return false;
}

function isVisible(object: THREE.Object3D) {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    if (!current.visible) return false;
  }
  return true;
}

class SceneInteractions {
  targets = new Map<string, RegisteredTarget>();
  listeners = new Set<() => void>();
  focused: string | null = null;
  pointer = new THREE.Vector2();
  pointerInside = false;
  raycaster = new THREE.Raycaster();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  snapshot = () => this.focused;
  setFocus(id: string | null) {
    if (this.focused === id) return;
    this.focused = id;
    this.listeners.forEach(listener => listener());
  }
  updatePointer(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    this.pointerInside = clientX >= rect.left && clientX <= rect.right
      && clientY >= rect.top && clientY <= rect.bottom;
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1);
  }
  register(target: RegisteredTarget) {
    this.targets.set(target.id, target);
    return () => {
      if (this.targets.get(target.id) !== target) return;
      this.targets.delete(target.id);
      if (this.focused === target.id) this.setFocus(null);
    };
  }
  pick(camera: THREE.Camera, scene: THREE.Scene, canvas: HTMLCanvasElement): Candidate | null {
    if (useHudStore.getState().isOpen) return null;
    const locked = document.pointerLockElement === canvas;
    camera.updateWorldMatrix(true, false);
    this.raycaster.setFromCamera(locked ? new THREE.Vector2(0, 0) : this.pointer, camera);
    const candidates: Candidate[] = [];
    for (const { id, read } of this.targets.values()) {
      const target = read();
      if (!target.canInteract()) continue;
      const inZone = target.triggerZone?.() === true;
      if (!inZone && !locked && !this.pointerInside) continue;
      const object = target.object?.current;
      if (!inZone && (!object || !isVisible(object))) continue;
      object?.updateWorldMatrix(true, true);
      const hit = object ? this.raycaster.intersectObject(object, true).find(h => isVisible(h.object)) : undefined;
      if (!inZone && !hit) continue;
      candidates.push({ id, enabled: true, distance: inZone ? 0 : hit!.distance,
        maxDistance: target.maxDistance, priority: inZone ? 10 : 0,
        activate: target.activate, releasePointer: target.releasePointer === true });
    }
    const candidate = resolveInteraction({ repeat: false, editing: false, hudOpen: false }, candidates);
    if (!candidate || candidate.priority > 0) return candidate;
    // Only check scene occlusion when a registered, in-range surface was hit.
    const object = this.targets.get(candidate.id)?.read().object?.current;
    if (!object) return null;
    this.raycaster.far = candidate.distance;
    const obstruction = this.raycaster.intersectObjects(scene.children, true).some(hit => {
      if (hit.distance >= candidate.distance - 0.02 || isWithin(hit.object, object) || !isVisible(hit.object)) return false;
      const mesh = hit.object as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const material = materials[hit.face?.materialIndex ?? 0];
      return !!material && material.visible && material.opacity >= 0.95 && !material.transparent;
    });
    this.raycaster.far = Infinity;
    return obstruction ? null : candidate;
  }
}

const scenes = new WeakMap<THREE.Scene, SceneInteractions>();
function interactionsFor(scene: THREE.Scene) {
  let manager = scenes.get(scene);
  if (!manager) { manager = new SceneInteractions(); scenes.set(scene, manager); }
  return manager;
}

/** Targets register with the scene; only BaseNavigationControls owns keyboard input. */
export function useSceneInteraction(options: Target) {
  const { scene, camera, gl } = useThree();
  const manager = interactionsFor(scene);
  const id = useId();
  const latest = useRef(options);
  useLayoutEffect(() => { latest.current = options; });
  useLayoutEffect(() => manager.register({ id, read: () => latest.current }), [manager, id]);
  const focused = useSyncExternalStore(manager.subscribe, manager.snapshot, () => null);
  return {
    isTargeted: focused === id,
    activate: (clientX: number, clientY: number) => {
      // A tap need not be preceded by pointermove. Resolve its own coordinates.
      manager.updatePointer(clientX, clientY, gl.domElement);
      const picked = manager.pick(camera, scene, gl.domElement);
      return picked?.id === id && performInteraction(picked, () => {
        if (document.pointerLockElement) document.exitPointerLock();
      });
    },
  };
}

export function useSceneInteractionController() {
  const { scene, camera, gl } = useThree();
  const manager = interactionsFor(scene);
  useLayoutEffect(() => {
    let held = false;
    const canvas = gl.domElement;
    const move = (event: PointerEvent) => {
      manager.updatePointer(event.clientX, event.clientY, canvas);
    };
    const leave = () => { manager.pointerInside = false; manager.setFocus(null); };
    const keyDown = (event: KeyboardEvent) => {
      if (!isInteractionKey(event)) return;
      const editing = event.composedPath().some(node => node instanceof HTMLElement
        && (node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)));
      const blocked = held || event.repeat || event.defaultPrevented || editing || useHudStore.getState().isOpen;
      held = true;
      if (blocked) return;
      const picked = manager.pick(camera, scene, canvas);
      if (performInteraction(picked, () => {
        if (document.pointerLockElement) document.exitPointerLock();
      })) event.preventDefault();
    };
    const keyUp = (event: KeyboardEvent) => { if (isInteractionKey(event)) held = false; };
    const blur = () => { held = false; leave(); };
    document.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      manager.pointerInside = false;
      manager.setFocus(null);
    };
  }, [manager, scene, camera, gl]);
  useFrame(() => { manager.setFocus(manager.pick(camera, scene, gl.domElement)?.id ?? null); });
}
