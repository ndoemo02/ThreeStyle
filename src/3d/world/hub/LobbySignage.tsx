'use client';

import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { shouldUseMobileRoomProfileInBrowser } from '../../../lib/deviceProfile';
import { MergedLobbyBoxes, type LobbyBoxSpec } from './LobbyMeshes';
import { lobbySignUv } from './lobbySignAtlas';
import type { LobbyMaterials } from './LobbyMaterials';

export type LobbySign = {
  tile: number;
  position: [number, number, number];
  size: [number, number];
  rotationY?: number;
};

/** All labels in one part of the building share one static, mipmapped atlas and draw call. */
export function LobbySignage({ signs, materials }: { signs: LobbySign[]; materials: LobbyMaterials }) {
  const mobile = typeof window !== 'undefined' && shouldUseMobileRoomProfileInBrowser();
  const source = useTexture(`/textures/runtime/lobby/${mobile ? 'mobile' : 'desktop'}/signage.webp`) as THREE.Texture;
  const texture = useMemo(() => {
    const copy = source.clone();
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.minFilter = THREE.LinearMipmapLinearFilter;
    copy.magFilter = THREE.LinearFilter;
    copy.anisotropy = mobile ? 2 : 4;
    copy.needsUpdate = true;
    return copy;
  }, [source, mobile]);
  useEffect(() => () => texture.dispose(), [texture]);

  const geometry = useMemo(() => {
    const parts = signs.map(sign => {
      const plane = new THREE.PlaneGeometry(...sign.size);
      const uv = plane.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, ...lobbySignUv(sign.tile, uv.getX(i), uv.getY(i)));
      plane.rotateY(sign.rotationY ?? 0);
      plane.translate(...sign.position);
      return plane;
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    merged.computeBoundingSphere();
    return merged;
  }, [signs]);

  const frames = useMemo<LobbyBoxSpec[]>(() => signs.map(sign => {
    const rotationY = sign.rotationY ?? 0;
    return {
      position: [sign.position[0] - Math.sin(rotationY) * 0.06, sign.position[1], sign.position[2] - Math.cos(rotationY) * 0.06],
      size: [sign.size[0] + 0.12, sign.size[1] + 0.12, 0.08],
      rotation: [0, rotationY, 0],
    };
  }), [signs]);

  return <group>
    <MergedLobbyBoxes boxes={frames} surface="dark" material={materials.door} decorative />
    <mesh geometry={geometry} raycast={() => {}}>
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  </group>;
}
