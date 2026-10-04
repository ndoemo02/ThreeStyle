"use client";

import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { LobbyQualityProfile } from './lobbyConfig';
import type { LobbySurface } from './lobbyGeometry';

export type LobbyMaterials = Record<LobbySurface, THREE.MeshStandardMaterial> & {
  brass: THREE.MeshStandardMaterial;
  trunk: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  led: THREE.MeshBasicMaterial;
  glow: THREE.MeshBasicMaterial;
  shadow: THREE.MeshBasicMaterial;
};

export function useLobbyMaterials(
  isMobile: boolean,
  quality: LobbyQualityProfile,
): LobbyMaterials {
  const variant = isMobile ? 'mobile' : 'desktop';
  const basePath = `/textures/runtime/lobby/${variant}`;
  const sources = useTexture([
    `${basePath}/albedo.webp`,
    `${basePath}/normal.webp`,
    `${basePath}/orm.webp`,
  ]);
  const [sourceAlbedo, sourceNormal, sourceOrm] = sources;
  // Own the configured copies; the loader cache remains reusable on the next lobby visit.
  const [albedo, normal, orm] = useMemo(() => {
    const loaded = [sourceAlbedo, sourceNormal, sourceOrm].map(texture => texture.clone());
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
    return loaded;
  }, [sourceAlbedo, sourceNormal, sourceOrm, isMobile]);

  const glowMap = useMemo(() => {
    const height = 64;
    const pixels = new Uint8Array(height * 4);
    for (let y = 0; y < height; y++) {
      const alpha = Math.pow(Math.max(0, 1 - Math.abs(y / (height - 1) - 0.5) * 2), 2.2);
      pixels.set([255, 255, 255, Math.round(alpha * 255)], y * 4);
    }
    const texture = new THREE.DataTexture(pixels, 1, height, THREE.RGBAFormat);
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);

  const materials = useMemo<LobbyMaterials>(() => {
    const pbr = {
      map: albedo,
      normalMap: quality.useNormalMaps ? normal : null,
      roughnessMap: orm,
      metalnessMap: orm,
    };

    return {
      stone: new THREE.MeshStandardMaterial({ ...pbr, color: '#c5c7c5', roughness: 0.92, metalness: 0, normalScale: new THREE.Vector2(0.25, 0.25) }),
      wood: new THREE.MeshStandardMaterial({ ...pbr, color: '#b9a896', roughness: 0.88, metalness: 0, normalScale: new THREE.Vector2(0.3, 0.3) }),
      plaster: new THREE.MeshStandardMaterial({ ...pbr, color: '#d5d2c9', roughness: 0.96, metalness: 0 }),
      dark: new THREE.MeshStandardMaterial({ ...pbr, color: '#a9b0b2', roughness: 0.94, metalness: 0 }),
      door: new THREE.MeshStandardMaterial({ color: '#41494d', roughness: 0.72, metalness: 0.06 }),
      brass: new THREE.MeshStandardMaterial({ color: '#c8a27b', roughness: 0.44, metalness: 0.6 }),
      trunk: new THREE.MeshStandardMaterial({ color: '#4b3424', roughness: 0.94, metalness: 0 }),
      foliage: new THREE.MeshStandardMaterial({ color: '#4a634b', roughness: 0.96, metalness: 0 }),
      led: new THREE.MeshBasicMaterial({ color: '#ffe0b8', toneMapped: false }),
      glow: new THREE.MeshBasicMaterial({ map: glowMap, color: '#ffc88d', transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
      shadow: new THREE.MeshBasicMaterial({
        color: '#080604',
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    };
  }, [albedo, normal, orm, glowMap, quality.useNormalMaps]);

  useEffect(() => () => {
    Object.values(materials).forEach(material => material.dispose());
  }, [materials]);

  useEffect(() => () => {
    albedo.dispose();
    normal.dispose();
    orm.dispose();
  }, [albedo, normal, orm]);

  useEffect(() => () => glowMap.dispose(), [glowMap]);

  return materials;
}
