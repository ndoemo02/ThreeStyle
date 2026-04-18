"use client";

import { PointerLockControls, OrbitControls } from '@react-three/drei';
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
    if (controlsRef.current && controlsRef.current.isLocked) {
      const speed = 6.0 * delta; // standard walk speed
      
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
    return (
      <OrbitControls 
        enableZoom={false}
        enablePan={false}
        enableDamping={true}
        dampingFactor={0.05}
        target={[camera.position.x, camera.position.y, camera.position.z - 0.1]}
      />
    );
  }

  return (
    <PointerLockControls 
      ref={controlsRef} 
      onLock={() => setIsLocked(true)}
      onUnlock={() => setIsLocked(false)}
    />
  );
}
