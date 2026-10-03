import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function CreatorMediaSurface({ texture, width, height }: { texture: THREE.Texture; width: number; height: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const image = texture.image as { videoWidth?: number; videoHeight?: number; width?: number; height?: number } | undefined;
    const sourceWidth = image?.videoWidth || image?.width || width;
    const sourceHeight = image?.videoHeight || image?.height || height;
    const ratio = sourceWidth / sourceHeight;
    const containerRatio = width / height;
    ref.current.scale.set(ratio > containerRatio ? 1 : ratio / containerRatio, ratio > containerRatio ? containerRatio / ratio : 1, 1);
  });
  return <mesh ref={ref} position={[0, 0, 0.011]} renderOrder={20}><planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} color="#ffffff" side={THREE.DoubleSide} toneMapped={false} /></mesh>;
}
