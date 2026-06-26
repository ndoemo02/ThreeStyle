"use client";

import { Html } from "@react-three/drei";

export function ScaleReferenceDummy({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 1.80m Tall Body (Pivot is at center, so Y = 0.9) */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 1.8, 16]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.3} wireframe />
      </mesh>

      {/* 1.8m Height Marker */}
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.5]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      <Html position={[0.3, 1.8, 0]} occlude className="text-yellow-400 font-mono text-[10px] whitespace-nowrap bg-black/80 px-1">
        1.80m (Top of Head)
      </Html>

      {/* 1.68m Eye Level Marker */}
      <mesh position={[0, 1.68, 0]}>
        <boxGeometry args={[0.55, 0.02, 0.55]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <Html position={[0.3, 1.68, 0]} occlude className="text-red-500 font-mono text-[10px] whitespace-nowrap bg-black/80 px-1">
        1.68m (Eye Level)
      </Html>

      {/* 1.00m Door Handle Height Marker */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.5]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
      <Html position={[0.3, 1.0, 0]} occlude className="text-green-500 font-mono text-[10px] whitespace-nowrap bg-black/80 px-1">
        1.00m (Standard Handle)
      </Html>
    </group>
  );
}
