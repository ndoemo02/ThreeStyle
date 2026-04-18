"use client";

import { useState, useRef, useEffect } from 'react';
import { useHudStore } from '../../stores/useHudStore';

export function NativeMobileJoystick() {
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const { isOpen } = useHudStore();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) return null;

  const emitVector = (x: number, y: number) => {
    // Write directly to window for ultra-fast unblocking 3D loop access
    (window as any).joystickVector = { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isOpen) return;
    try {
      e.stopPropagation();
      setActive(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handlePointerMove(e);
    } catch (err) {
      console.warn('Pointer capture failed:', err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!active || !baseRef.current || isOpen) return;
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
    emitVector(dx / radius, -dy / radius); // positive y = forward
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      e.stopPropagation();
      setActive(false);
      setPosition({ x: 0, y: 0 });
      emitVector(0, 0);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignored
    }
  };

  return (
    <div 
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`fixed z-[100] shadow-2xl transition-opacity duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{
        bottom: '40px', // Lowered closer to bottom edge
        left: '70px',   // Moved slightly to the right, but kept on left side for thumb
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
