import { useGLTF, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

export function Logo3S() {
  // TODO: Docelowo podmienimy to ładując faktyczny model .glb
  // Obecnie rysujemy poglądowy znak złożony z prostej geometrii
  return (
    <group position={[0, 1.5, 0]} rotation={[0, -Math.PI / 6, 0]}>
      {/* Sekcja Carbon Fiber */}
      <mesh position={[-0.5, 0, 0]}>
        <boxGeometry args={[0.5, 1, 0.2]} />
        <meshStandardMaterial 
          color="#111" 
          roughness={0.4} 
          metalness={0.8}
        />
      </mesh>

      {/* Sekcja S - Polished Chrome */}
      <mesh position={[0.2, 0, 0.1]}>
        <boxGeometry args={[0.5, 1, 0.2]} />
        <meshPhysicalMaterial 
          color="#fff" 
          metalness={1} 
          roughness={0.05} 
          clearcoat={1} 
          reflectivity={1}
        />
      </mesh>
    </group>
  );
}
