"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useHudStore } from '../../stores/useHudStore';
import { shouldUseMobileRoomProfileInBrowser } from '../../lib/deviceProfile';

export function NativeMobileJoystick() {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const capturedPointerId = useRef<number | null>(null);
  const { isOpen } = useHudStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(shouldUseMobileRoomProfileInBrowser());
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const emitVector = (x: number, y: number) => {
    (window as unknown as { joystickVector: { x: number; y: number } }).joystickVector = { x, y };
  };

  const computeAndEmit = useCallback((clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const radius = 35;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > radius) {
      dx = (dx / distance) * radius;
      dy = (dy / distance) * radius;
    }

    setPosition({ x: dx, y: dy });
    emitVector(dx / radius, -dy / radius);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isOpen) return;
    // Capture this specific finger so rotation finger events don't interfere
    (e.target as Element).setPointerCapture(e.pointerId);
    capturedPointerId.current = e.pointerId;
    setActive(true);
    computeAndEmit(e.clientX, e.clientY);
  }, [isOpen, computeAndEmit]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!capturedPointerId.current || isOpen) return;
    // Only process movement from our captured finger
    if (e.pointerId !== capturedPointerId.current) return;
    computeAndEmit(e.clientX, e.clientY);
  }, [isOpen, computeAndEmit]);

  const releaseJoystick = useCallback(() => {
    capturedPointerId.current = null;
    setActive(false);
    setPosition({ x: 0, y: 0 });
    emitVector(0, 0);
  }, [emitVector]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== capturedPointerId.current) return;
    releaseJoystick();
  }, [releaseJoystick]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== capturedPointerId.current) return;
    releaseJoystick();
  }, [releaseJoystick]);

  if (!isMobile) return null;

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        position: 'fixed',
        bottom: '40px',
        left: '50px',
        width: '130px',
        height: '130px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '2px solid rgba(255, 255, 255, 0.20)',
        touchAction: 'none',
        pointerEvents: isOpen ? 'none' : 'auto',
        opacity: isOpen ? 0 : 1,
        zIndex: 9999,
        transition: 'opacity 300ms ease',
        boxShadow: active
          ? '0 0 0 4px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.5)'
          : '0 4px 24px rgba(0,0,0,0.4)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Thumb */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: active ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.48)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          transition: active ? 'none' : 'transform 0.08s ease-out, background-color 0.15s',
          pointerEvents: 'none',
          boxShadow: '0 0 20px rgba(0,0,0,0.4)',
        }}
      />
      {/* Label */}
      <div
        style={{
          position: 'absolute',
          bottom: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '9px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          fontFamily: 'monospace',
        }}
      >
        MOVE
      </div>
    </div>
  );
}
