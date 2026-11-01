'use client';

import { useEffect, useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { shouldUseMobileRoomProfileInBrowser } from '../../../lib/deviceProfile';
import { MergedLobbyBoxes, type LobbyBoxSpec } from './LobbyMeshes';
import type { LobbyMaterials } from './LobbyMaterials';
import { LOBBY_DESK_LOGO, LOBBY_DIRECTORY } from './lobbyFurnitureLayout';
import { WAYFINDING_ATLAS, wayfindingUv } from './lobbyWayfindingAtlas';

// Both panels hang on the left wall (x ≈ -9.8) and face into the room.
const FACING = Math.PI / 2;
const PANELS = [
  { ...LOBBY_DIRECTORY, region: WAYFINDING_ATLAS.directory },
  { ...LOBBY_DESK_LOGO, region: WAYFINDING_ATLAS.logo },
];
const FRAMES: LobbyBoxSpec[] = PANELS.map(panel => ({
  position: [panel.position[0] - 0.05, panel.position[1], panel.position[2]],
  size: [panel.size[0] + 0.1, panel.size[1] + 0.1, 0.06],
  rotation: [0, FACING, 0],
}));

/** Corridor directory and the backlit desk logo: one atlas, one draw call. */
export function LobbyWayfinding({ materials }: { materials: LobbyMaterials }) {
  const mobile = typeof window !== 'undefined' && shouldUseMobileRoomProfileInBrowser();
  // useTexture would also upload its cached source; only the configured copy should reach the GPU.
  const source = useLoader(THREE.TextureLoader, `/textures/runtime/lobby/${mobile ? 'mobile' : 'desktop'}/wayfinding.webp`);
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
    const parts = PANELS.map(panel => {
      const plane = new THREE.PlaneGeometry(...panel.size);
      const uv = plane.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, ...wayfindingUv(panel.region, uv.getX(i), uv.getY(i)));
      plane.rotateY(FACING);
      plane.translate(...panel.position);
      return plane;
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    merged.computeBoundingSphere();
    return merged;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group name="lobby-wayfinding">
      <MergedLobbyBoxes boxes={FRAMES} surface="dark" material={materials.door} decorative />
      <mesh geometry={geometry} raycast={() => {}}>
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
