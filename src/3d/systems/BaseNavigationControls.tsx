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
  const joystickVector = useRef(new THREE.Vector2());
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
    const speed = 6.0 * delta; // standard walk speed

    if (isMobile) {
      if (controlsRef.current && (joystickVector.current.x !== 0 || joystickVector.current.y !== 0)) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(state.camera.quaternion);
        right.y = 0;
        right.normalize();
        
        const moveX = joystickVector.current.x * speed;
        const moveZ = joystickVector.current.y * speed; 

        state.camera.position.addScaledVector(right, moveX);
        state.camera.position.addScaledVector(forward, moveZ); 
        
        controlsRef.current.target.addScaledVector(right, moveX);
        controlsRef.current.target.addScaledVector(forward, moveZ);
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
    return (
      <>
        <OrbitControls 
          ref={controlsRef}
          enableZoom={false}
          enablePan={false}
          enableDamping={true}
          dampingFactor={0.05}
          target={[camera.position.x, camera.position.y, camera.position.z - 0.1]}
        />
        <MobileJoystick onMove={(x, y) => joystickVector.current.set(x, y)} />
      </>
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

function MobileJoystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setActive(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!active || !baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    let dx = e.clientX - rect.left - centerX;
    let dy = e.clientY - rect.top - centerY;
    
    const radius = 30; // max distance thumb can move
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > radius) {
      dx = (dx / distance) * radius;
      dy = (dy / distance) * radius;
    }
    
    setPosition({ x: dx, y: dy });
    onMove(dx / radius, -dy / radius); // make positive y = forward
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <Html fullscreen zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
      <div 
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '40px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          touchAction: 'none',
          pointerEvents: 'auto',
        }}
      >
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(4px)',
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          transition: active ? 'none' : 'transform 0.05s ease-out',
          pointerEvents: 'none',
        }} />
      </div>
    </Html>
  );
}
