'use client';

import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { shouldUseMobileRoomProfileInBrowser } from '../../../lib/deviceProfile';
import { MergedLobbyBoxes, type LobbyBoxSpec } from './LobbyMeshes';
import { lobbySignUv } from './lobbySignAtlas';
import type { LobbyMaterials } from './LobbyMaterials';

export type LobbySign = { tile: number; position: [number, number, number]; size: [number, number]; rotationY?: number };

function SignBatch({ signs, url, atlas }: { signs: LobbySign[]; url: string; atlas: boolean }) {
  const source = useTexture(url) as THREE.Texture;
  const gl = useThree(s => s.gl);
  const texture = useMemo(() => {
    const copy = source.clone();
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.minFilter = THREE.LinearMipmapLinearFilter;
    copy.magFilter = THREE.LinearFilter;
    copy.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    copy.needsUpdate = true;
    return copy;
  }, [source, gl]);
  useEffect(() => () => texture.dispose(), [texture]);

  const geometry = useMemo(() => {
    const parts = signs.map(sign => {
      const plane = new THREE.PlaneGeometry(...sign.size);
      if (atlas) {
        const uv = plane.getAttribute('uv');
        for (let i = 0; i < uv.count; i++) uv.setXY(i, ...lobbySignUv(sign.tile, uv.getX(i), uv.getY(i)));
      }
      plane.rotateY(sign.rotationY ?? 0); plane.translate(...sign.position);
      return plane;
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose()); merged.computeBoundingSphere();
    return merged;
  }, [signs, atlas]);
  return <mesh geometry={geometry} raycast={() => {}}>
    <meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}

/** Door labels stay batched; only the large welcome screen gets its own resolution. */
export function LobbySignage({ signs, materials }: { signs: LobbySign[]; materials: LobbyMaterials }) {
  const mobile = typeof window !== 'undefined' && shouldUseMobileRoomProfileInBrowser();
  const path = '/textures/runtime/lobby/' + (mobile ? 'mobile' : 'desktop');
  const welcome = useMemo(() => signs.filter(s => s.tile === 0), [signs]);
  const labels = useMemo(() => signs.filter(s => s.tile !== 0), [signs]);
  const frames = useMemo<LobbyBoxSpec[]>(() => signs.map(sign => {
    const rotationY = sign.rotationY ?? 0;
    return {
      position: [sign.position[0] - Math.sin(rotationY) * 0.06, sign.position[1], sign.position[2] - Math.cos(rotationY) * 0.06],
      size: [sign.size[0] + 0.12, sign.size[1] + 0.12, 0.08], rotation: [0, rotationY, 0],
    };
  }), [signs]);
  return <group>
    <MergedLobbyBoxes boxes={frames} surface="dark" material={materials.door} decorative />
    {labels.length > 0 && <SignBatch signs={labels} url={path + '/signage.webp'} atlas />}
    {welcome.length > 0 && <SignBatch signs={welcome} url={path + '/welcome.webp'} atlas={false} />}
  </group>;
}
