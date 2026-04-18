"use client";
import { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';

interface RoomDoorProps {
  position: [number, number, number];
  rotation: [number, number, number];
  label: string;
  status: 'active' | 'locked' | 'offline';
  userCount?: number;
  onEnter: () => void;
}

export function RoomDoor({ position, rotation, label, status, userCount, onEnter }: RoomDoorProps) {
  const [hovered, setHovered] = useState(false);
  
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (hovered && (e.code === 'KeyE' || e.key === 'e')) {
        onEnter();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hovered, onEnter]);

  const statusColor = status === 'active' ? '#4fd1c5' : (status === 'locked' ? '#ff3366' : '#555555');

  return (
    <group position={position} rotation={rotation} 
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }} 
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (status === 'active') {
          e.stopPropagation();
          onEnter();
        }
      }}
    >
      <group position={[0, -0.04, 0]}> {/* Floor alignment correction */}
        {/* Outer Metal Frame */}
        <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 4.2, 0.4]} />
          <meshStandardMaterial color="#2d2d2d" roughness={0.4} metalness={0.7} />
        </mesh>
        
        {/* Dark Main Door Slab */}
        <mesh position={[-0.15, 2.1, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 4.0, 0.25]} />
          <meshStandardMaterial color="#0b0b0b" roughness={0.8} metalness={0.2} />
        </mesh>

        {/* Narrow Smoked-Glass Inset Panel */}
        <mesh position={[0.9, 2.1, 0.1]}>
          <boxGeometry args={[0.3, 4.0, 0.25]} />
          <meshPhysicalMaterial 
            color="#000000"
            transparent
            opacity={0.85}
            roughness={0.15}
            metalness={0.9}
            clearcoat={1.0}
          />
        </mesh>

        {/* Under-door Glow / Status Strip */}
        {status !== 'offline' && (
          <mesh position={[0, 0.05, 0.15]}>
            <boxGeometry args={[2.0, 0.02, 0.05]} />
            <meshBasicMaterial color={statusColor} />
          </mesh>
        )}
        
        {status !== 'offline' && (
          <pointLight position={[0, 0.5, 0.5]} color={statusColor} intensity={hovered ? 0.8 : 0.2} distance={2} decay={2} />
        )}

        {/* Small Access / Status Panel (Right side frame) */}
        <group position={[1.15, 1.7, 0.21]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.2, 0.4, 0.05]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.8} />
          </mesh>
          
          {/* Status indicator LED */}
          <mesh position={[-0.05, 0.12, 0.03]}>
            <circleGeometry args={[0.015, 16]} />
            <meshBasicMaterial color={statusColor} />
          </mesh>

          {/* Card slot indicator */}
          <mesh position={[0, -0.05, 0.026]}>
            <planeGeometry args={[0.12, 0.02]} />
            <meshBasicMaterial color="#000" />
          </mesh>
        </group>

        {/* Minimal hardware / Handle */}
        <mesh position={[0.65, 1.5, 0.4]} castShadow>
          <boxGeometry args={[0.02, 0.3, 0.08]} />
          <meshStandardMaterial color="#444444" metalness={0.9} roughness={0.3} />
        </mesh>

        {/* Flush Door Label UI on the Slab */}
        <Html transform occlude wrapperClass="door-ui" position={[-0.15, 1.9, 0.41]} distanceFactor={3.5}>
          <div className="flex flex-col items-center justify-center w-[200px] transition-all duration-500" 
               style={{ 
                 textShadow: hovered ? `0 0 10px ${statusColor}` : 'none',
                 opacity: hovered ? 1 : 0,
                 pointerEvents: hovered ? 'auto' : 'none'
               }}>
            <div className="text-white/30 tracking-[0.3em] text-[10px] font-mono w-full text-center border-b border-white/10 pb-1 mb-2">
              ROOM KEY
            </div>
            <div className="text-white font-black tracking-[0.2em] text-xl select-none">
              {label}
            </div>
            
            {userCount !== undefined && status !== 'offline' && (
              <div className="text-[12px] text-neutral-400 mt-2 font-mono tracking-widest bg-black/80 px-2 py-0.5 rounded border border-neutral-800 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                {userCount} USR
              </div>
            )}
            
            {hovered && status !== 'offline' && (
              <div className="mt-4 text-white font-bold text-[10px] tracking-[0.2em] bg-white/10 px-3 py-1 rounded-sm border border-white/20 uppercase backdrop-blur-sm shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                [E] Enter
              </div>
            )}
            
            {hovered && status === 'offline' && (
              <div className="mt-4 text-red-500 font-bold text-[10px] tracking-[0.2em] bg-red-900/40 px-3 py-1 rounded-sm border border-red-500/20 uppercase">
                Access Denied
              </div>
            )}
          </div>
        </Html>
      </group>

      {/* Raycast target */}
      <mesh position={[0, 2.1, 0.3]} visible={false}>
         <planeGeometry args={[2.5, 4.2]} />
         <meshBasicMaterial />
      </mesh>
      
      {/* Side Status Panel UI placed slightly in front of the 3D Panel */}
      <Html transform occlude position={[1.15, 1.7, 0.41]} rotation={[0, 0, 0]} distanceFactor={3}>
        <div className={`
          flex flex-col items-center justify-center border p-1 w-12
          ${status === 'active' ? 'border-[#00ffff] bg-black/80' : ''}
          ${status === 'locked' ? 'border-[#ff3366] bg-black/80' : ''}
          ${status === 'offline' ? 'border-zinc-800 bg-black/50' : ''}
        `}>
          <div className="text-[6px] tracking-widest text-[#00ffff] opacity-50 mb-1">ST</div>
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        </div>
      </Html>
    </group>
  );
}
