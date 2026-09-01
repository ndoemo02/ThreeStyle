"use client";

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';
import { useHudStore } from '../../stores/useHudStore';
import { useTransitionStore } from '../../store/useTransitionStore';
import { EVENT_ROOM_ZONE, ROOM_ZONE } from '../navigation/navigationConfig';
import { constrainEventRoomMovement, EVENT_ROOM_EYE_HEIGHT } from '../navigation/eventRoomLayout';

type JoystickVector = {
  x: number;
  y: number;
};

declare global {
  interface Window {
    joystickVector?: JoystickVector;
  }
}

function isPointerLockError(reason: unknown): boolean {
  const errorLike = reason as { name?: unknown; message?: unknown } | null;
  const name = typeof errorLike?.name === 'string' ? errorLike.name : '';
  const message = typeof errorLike?.message === 'string' ? errorLike.message : String(reason ?? '');
  const normalized = message.toLowerCase();

  return (
    name === 'NotAllowedError' ||
    name === 'SecurityError' ||
    name === 'WrongDocumentError' ||
    (name === 'UnknownError' && normalized.includes('report this bug to chromium')) ||
    normalized.includes('pointer lock') ||
    normalized.includes('user gesture is required') ||
    // Ignore harmless HMR/Fast Refresh artifact where GLTF blob textures are revoked before loading finishes
    (normalized.includes("couldn't load texture") && normalized.includes('blob:http'))
  );
}

function clampCameraToCreatorRoom(camera: THREE.Camera) {
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -6.65, 6.65);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -5.45, 7.55);
}

function getZoneEyeHeight(zone: string) {
  return zone === EVENT_ROOM_ZONE ? EVENT_ROOM_EYE_HEIGHT : 2.05;
}

function constrainCameraToZone(
  camera: THREE.Camera,
  zone: string,
  previousX: number,
  previousZ: number,
) {
  camera.position.y = getZoneEyeHeight(zone);
  if (zone === ROOM_ZONE) clampCameraToCreatorRoom(camera);
  if (zone === EVENT_ROOM_ZONE) {
    const [x, z] = constrainEventRoomMovement(previousX, previousZ, camera.position.x, camera.position.z);
    camera.position.x = x;
    camera.position.z = z;
  }
}

export function BaseNavigationControls() {
  const controlsRef = useRef<PointerLockControlsImpl | null>(null);
  const direction = useRef(new THREE.Vector3());
  const moveState = useRef({ forward: false, backward: false, left: false, right: false });
  const jumpVelocity = useRef(0);
  const isJumping = useRef(false);
  const pointerLockCooldownUntil = useRef(0);
  const [isMobile, setIsMobile] = useState(false);
  const { camera } = useThree();
  const isHudOpen = useHudStore(s => s.isOpen);
  const elevatorState = useTransitionStore(s => s.elevatorState);
  const activeZone = useTransitionStore(s => s.activeZone);

  const startPointerLockCooldown = () => {
    pointerLockCooldownUntil.current = Date.now() + 450;
  };

  // When HUD opens, exit pointer lock so user can interact with the overlay
  useEffect(() => {
    if (isHudOpen && document.pointerLockElement) {
      startPointerLockCooldown();
      document.exitPointerLock();
    }
  }, [isHudOpen]);

  useEffect(() => {
    // Browser/Next dev overlay can surface expected pointer-lock denials when no user gesture exists.
    const originalError = console.error;
    console.error = (...args) => {
      if (args.some(isPointerLockError)) return;
      originalError(...args);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isPointerLockError(event.reason)) {
        event.preventDefault();
      }
    };

    const onWindowError = (event: ErrorEvent) => {
      if (isPointerLockError(event.error) || isPointerLockError(event.message)) {
        event.preventDefault();
      }
    };

    const swallowImmediateRelock = (event: MouseEvent) => {
      if (Date.now() >= pointerLockCooldownUntil.current) return;
      event.stopImmediatePropagation();
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onWindowError);
    document.addEventListener('click', swallowImmediateRelock, true);

    // Suppress InvalidStateError caused by Leva/use-gesture on mobile touch devices
    const originalSetPointerCapture = Element.prototype.setPointerCapture;
    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    Element.prototype.setPointerCapture = function(pointerId) {
      try {
        originalSetPointerCapture.call(this, pointerId);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'InvalidStateError') return;
        throw error;
      }
    };
    Element.prototype.releasePointerCapture = function(pointerId) {
      try {
        originalReleasePointerCapture.call(this, pointerId);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'InvalidStateError') return;
        // Don't throw if it fails to release, this is also a known noise source
      }
    };

    const checkMobile = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      console.error = originalError;
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onWindowError);
      document.removeEventListener('click', swallowImmediateRelock, true);
      window.removeEventListener('resize', checkMobile);
      Element.prototype.setPointerCapture = originalSetPointerCapture;
      Element.prototype.releasePointerCapture = originalReleasePointerCapture;
    };
  }, []);

  const { gl } = useThree();

  // Mobile First-Person Touch Controls — multitouch: joystick + obrót równocześnie
  useEffect(() => {
    if (!isMobile) return;
    let rotateTouchId: number | null = null;
    let previousTouch: { x: number, y: number } | null = null;
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');

    const isInJoystickZone = (clientX: number, clientY: number) => {
      // Joystick area: bottom-left, ~130px wide, ~170px tall from bottom
      return clientX < 200 && clientY > window.innerHeight - 200;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (rotateTouchId !== null) return; // already tracking a rotation finger

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (!isInJoystickZone(touch.clientX, touch.clientY)) {
          e.preventDefault(); // block browser scroll/zoom during rotation
          rotateTouchId = touch.identifier;
          previousTouch = { x: touch.clientX, y: touch.clientY };
          return;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (rotateTouchId === null || !previousTouch) return;

      let activeTouch: Touch | null = null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === rotateTouchId) {
          activeTouch = e.changedTouches[i];
          break;
        }
      }

      if (!activeTouch) return;

      e.preventDefault();

      const movementX = activeTouch.clientX - previousTouch.x;
      const movementY = activeTouch.clientY - previousTouch.y;
      previousTouch = { x: activeTouch.clientX, y: activeTouch.clientY };

      euler.setFromQuaternion(camera.quaternion);
      euler.y -= movementX * 0.005;
      euler.x -= movementY * 0.005;
      euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
      camera.quaternion.setFromEuler(euler);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (rotateTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === rotateTouchId) {
          // Check if there's another non-joystick touch we can switch to
          rotateTouchId = null;
          previousTouch = null;
          // Scan remaining active touches for a new rotation candidate
          for (let j = 0; j < e.touches.length; j++) {
            const t = e.touches[j];
            if (!isInJoystickZone(t.clientX, t.clientY)) {
              rotateTouchId = t.identifier;
              previousTouch = { x: t.clientX, y: t.clientY };
              break;
            }
          }
          break;
        }
      }
    };

    const dom = gl.domElement;
    dom.addEventListener('touchstart', onTouchStart, { passive: false });
    dom.addEventListener('touchmove', onTouchMove, { passive: false });
    dom.addEventListener('touchend', onTouchEnd);
    dom.addEventListener('touchcancel', onTouchEnd);

    return () => {
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
      dom.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isMobile, camera, gl]);

  useEffect(() => {
    if (isMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // INTERACTION MODE: exit pointer lock to interact with UI when pressing 'E'
      if (document.pointerLockElement && (e.code === 'KeyE' || e.key === 'e')) {
        startPointerLockCooldown();
        document.exitPointerLock();
      }

      switch(e.code) {
        case 'KeyW': moveState.current.forward = true; break;
        case 'KeyA': moveState.current.left = true; break;
        case 'KeyS': moveState.current.backward = true; break;
        case 'KeyD': moveState.current.right = true; break;
        case 'Space':
          if (!isJumping.current) {
            isJumping.current = true;
            jumpVelocity.current = 5.0; // initial upward velocity (m/s)
          }
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch(e.code) {
        case 'KeyW': moveState.current.forward = false; break;
        case 'KeyA': moveState.current.left = false; break;
        case 'KeyS': moveState.current.backward = false; break;
        case 'KeyD': moveState.current.right = false; break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isMobile]);

  useFrame((state, delta) => {
    if (elevatorState !== 'idle') {
      // W trakcie jazdy windą blokujemy ruch kamery
      return;
    }

    let moved = false;
    const speed = 6.0 * delta; // standard walk speed
    const previousX = state.camera.position.x;
    const previousZ = state.camera.position.z;
    const eyeHeight = getZoneEyeHeight(activeZone);

    // ── Jump physics (gravity = 12 m/s²) ──────────────────────────────────
    if (isJumping.current) {
      const gravity = 12.0;
      jumpVelocity.current -= gravity * delta;
      state.camera.position.y += jumpVelocity.current * delta;

      if (state.camera.position.y <= eyeHeight) {
        state.camera.position.y = eyeHeight;
        jumpVelocity.current = 0;
        isJumping.current = false;
      }
      moved = true;
    }

    if (isMobile) {
      const joystick = window.joystickVector;
      if (joystick && (joystick.x !== 0 || joystick.y !== 0)) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(state.camera.quaternion);
        right.y = 0;
        right.normalize();

        const moveX = joystick.x * speed;
        const moveZ = joystick.y * speed;

        state.camera.position.addScaledVector(right, moveX);
        state.camera.position.addScaledVector(forward, moveZ);
        moved = true;
      }

      // Save jump Y before constrainCameraToZone locks it
      const savedY = state.camera.position.y;
      constrainCameraToZone(state.camera, activeZone, previousX, previousZ);
      if (isJumping.current) state.camera.position.y = savedY;
      if (moved) state.invalidate();
      return;
    }

    if (controlsRef.current && controlsRef.current.isLocked) {

      direction.current.z = Number(moveState.current.forward) - Number(moveState.current.backward);
      direction.current.x = Number(moveState.current.right) - Number(moveState.current.left);
      direction.current.normalize();

      if (moveState.current.forward || moveState.current.backward) {
        controlsRef.current.moveForward(direction.current.z * speed);
        moved = true;
      }
      if (moveState.current.left || moveState.current.right) {
        controlsRef.current.moveRight(direction.current.x * speed);
        moved = true;
      }

      // Save jump Y before constrainCameraToZone locks it
      const savedY = state.camera.position.y;
      constrainCameraToZone(state.camera, activeZone, previousX, previousZ);
      if (isJumping.current) state.camera.position.y = savedY;
    }

    // PointerLockControls rotates camera via its own internal RAF — always invalidate when locked
    if (controlsRef.current?.isLocked || moved) {
      state.invalidate();
    }
  });

  if (isMobile || isHudOpen) {
    return null; // Custom touch controls are active, or HUD is open (don't lock)
  }

  return (
    <PointerLockControls
      ref={controlsRef}
      selector=".b3p-canvas-wrap" // Restrict lock trigger to the canvas area
    />
  );
}
