"use client";

import { PointerLockControls, OrbitControls, Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export function BaseNavigationControls() {
  const controlsRef = useRef<any>(null);
  const direction = useRef(new THREE.Vector3());
  const moveState = useRef({ forward: false, backward: false, left: false, right: false });
  const [isLocked, setIsLocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { camera } = useThree();

  useEffect(() => {
    // Suppress Next.js error overlay for expected Pointer Lock errors
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('THREE.PointerLockControls: Unable to use Pointer Lock API')) return;
      originalError(...args);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'SecurityError' && event.reason?.message?.includes('Pointer lock')) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    const checkMobile = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      console.error = originalError;
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const { gl } = useThree();

  // Mobile First-Person Touch Controls
  useEffect(() => {
    if (!isMobile) return;
    let activeTouchId: number | null = null;
    let previousTouch: { x: number, y: number } | null = null;
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');

    const onTouchStart = (e: TouchEvent) => {
      if (activeTouchId !== null) return;
      
      const touch = e.changedTouches[0];
      activeTouchId = touch.identifier;
      previousTouch = { x: touch.clientX, y: touch.clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (activeTouchId === null || !previousTouch) return;
      
      let activeTouch: Touch | null = null;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          activeTouch = e.changedTouches[i];
          break;
        }
      }
      
      if (!activeTouch) return;

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
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          activeTouchId = null;
          previousTouch = null;
          break;
        }
      }
    };

    const dom = gl.domElement;
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });
    dom.addEventListener('touchend', onTouchEnd, { passive: true });
    dom.addEventListener('touchcancel', onTouchEnd, { passive: true });

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
        document.exitPointerLock();
      }
      
      switch(e.code) {
        case 'KeyW': moveState.current.forward = true; break;
        case 'KeyA': moveState.current.left = true; break;
        case 'KeyS': moveState.current.backward = true; break;
        case 'KeyD': moveState.current.right = true; break;
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
    const speed = 6.0 * delta; // standard walk speed

    if (isMobile) {
      const joystick = (window as any).joystickVector;
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
      }
      
      // Keep grounded at natural human eye level
      state.camera.position.y = 2.05;
      return;
    }

    if (controlsRef.current && controlsRef.current.isLocked) {
      
      direction.current.z = Number(moveState.current.forward) - Number(moveState.current.backward);
      direction.current.x = Number(moveState.current.right) - Number(moveState.current.left);
      direction.current.normalize();

      if (moveState.current.forward || moveState.current.backward) controlsRef.current.moveForward(direction.current.z * speed);
      if (moveState.current.left || moveState.current.right) controlsRef.current.moveRight(direction.current.x * speed);
      
      // Keep grounded at natural human eye level
      state.camera.position.y = 2.05;
    }
  });

  if (isMobile) {
    return null; // Custom touch controls are active via effect above
  }

  return (
    <PointerLockControls 
      ref={controlsRef} 
      onLock={() => setIsLocked(true)}
      onUnlock={() => setIsLocked(false)}
    />
  );
}


