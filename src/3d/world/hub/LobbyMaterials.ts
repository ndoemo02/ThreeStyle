"use client";

import { useCallback, useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { LobbyQualityProfile } from './lobbyConfig';
import type { LobbySurface } from './lobbyGeometry';

export type LobbyMaterials = Record<LobbySurface, THREE.MeshStandardMaterial> & {
  brass: THREE.MeshStandardMaterial;
  trunk: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  led: THREE.MeshBasicMaterial;
  shadow: THREE.MeshBasicMaterial;
};

export function useLobbyMaterials(
  isMobile: boolean,
  quality: LobbyQualityProfile,
): LobbyMaterials {
  const variant = isMobile ? 'mobile' : 'desktop';
  const basePath = `/textures/runtime/lobby/${variant}`;
  const configureTextures = useCallback((loaded: THREE.Texture[]) => {
    loaded[0].colorSpace = THREE.SRGBColorSpace;
    loaded[1].colorSpace = THREE.NoColorSpace;
    loaded[2].colorSpace = THREE.NoColorSpace;
    for (const texture of loaded) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = isMobile ? 2 : 4;
      texture.needsUpdate = true;
    }
  }, [isMobile]);

  const [albedo, normal, orm] = useTexture([
    `${basePath}/albedo.webp`,
    `${basePath}/normal.webp`,
    `${basePath}/orm.webp`,
  ], configureTextures);

  const materials = useMemo<LobbyMaterials>(() => {
    const pbr = {
      map: albedo,
      normalMap: quality.useNormalMaps ? normal : null,
      roughnessMap: orm,
      metalnessMap: orm,
    };

    return {
      stone: new THREE.MeshStandardMaterial({ ...pbr, color: '#a49b92', roughness: 0.82, metalness: 0.75 }),
      wood: new THREE.MeshStandardMaterial({ ...pbr, color: '#c0a68f', roughness: 0.88, metalness: 0.35 }),
      plaster: new THREE.MeshStandardMaterial({ ...pbr, color: '#ded2c5', roughness: 0.96, metalness: 0.08 }),
      dark: new THREE.MeshStandardMaterial({ ...pbr, color: '#5d5650', roughness: 0.9, metalness: 0.62 }),
      brass: new THREE.MeshStandardMaterial({ color: '#b98b5f', roughness: 0.34, metalness: 0.82 }),
      trunk: new THREE.MeshStandardMaterial({ color: '#4b3424', roughness: 0.94, metalness: 0 }),
      foliage: new THREE.MeshStandardMaterial({ color: '#526943', roughness: 0.96, metalness: 0 }),
      led: new THREE.MeshBasicMaterial({ color: '#ffd0a0', toneMapped: false }),
      shadow: new THREE.MeshBasicMaterial({
        color: '#080604',
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    };
  }, [albedo, normal, orm, quality.useNormalMaps]);

  useEffect(() => () => {
    Object.values(materials).forEach(material => material.dispose());
  }, [materials]);

  useEffect(() => () => {
    albedo.dispose();
    normal.dispose();
    orm.dispose();
  }, [albedo, normal, orm]);

  return materials;
}
