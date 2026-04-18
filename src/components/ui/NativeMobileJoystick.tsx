"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useHudStore } from '../../stores/useHudStore';

export function NativeMobileJoystick() {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const { isOpen } = useHudStore();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const emitVector = (x: number, y: number) => {
    (window as any).joystickVector = { x, y };
  };

  const computeAndEmit = useCallback((clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    const radius = 30;
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
    e.stopPropagation();
    activeRef.current = true;
    setActive(true);
    computeAndEmit(e.clientX, e.clientY);
  }, [isOpen, computeAndEmit]);

  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!activeRef.current || isOpen) return;
      computeAndEmit(e.clientX, e.clientY);
    };

    const handleWindowPointerUp = () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      setActive(false);
      setPosition({ x: 0, y: 0 });
      emitVector(0, 0);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [isOpen, computeAndEmit]);

  if (!isMobile) return null;

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      className={`fixed z-[100] shadow-2xl transition-opacity duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{
        bottom: '40px',
        left: '70px',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '2px solid rgba(255, 255, 255, 0.15)',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
    >
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(8px)',
        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        transition: active ? 'none' : 'transform 0.05s ease-out',
        pointerEvents: 'none',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
      }} />
    </div>
  );
}
