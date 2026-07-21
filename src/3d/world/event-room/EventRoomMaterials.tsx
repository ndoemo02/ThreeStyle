"use client";

import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { EventRoomQualityTier, EventRoomThemeTokens } from './EventRoomTypes';

export type EventRoomMaterials = {
  floor: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  seat: THREE.MeshStandardMaterial;
  screen: THREE.MeshStandardMaterial;
  screenDim: THREE.MeshStandardMaterial;
  sideScreen: THREE.MeshStandardMaterial;
  led: THREE.MeshStandardMaterial;
  warmLed: THREE.MeshStandardMaterial;
};

type PreviewTextureSet = {
  floorAlbedo: THREE.Texture;
  floorNormal: THREE.Texture;
  floorRoughness: THREE.Texture;
  wallAlbedo: THREE.Texture;
  wallNormal: THREE.Texture;
  wallRoughness: THREE.Texture;
  woodAlbedo: THREE.Texture;
  woodNormal: THREE.Texture;
  woodRoughness: THREE.Texture;
  seatAlbedo: THREE.Texture;
};

function cloneRuntimeTexture(source: THREE.Texture, repeat: [number, number], colorSpace: THREE.ColorSpace) {
  const texture = source.clone();
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function liftThemeColor(color: string, amount: number) {
  return new THREE.Color(color).lerp(new THREE.Color('#f2d3b6'), amount);
}

export function useEventRoomMaterials(
  theme: EventRoomThemeTokens,
  qualityTier: EventRoomQualityTier,
): EventRoomMaterials {
  const variant = qualityTier === 'mobile' || qualityTier === 'degraded' ? 'mobile' : 'desktop';
  const basePath = `/textures/runtime/event-room/${variant}`;
  const loadedTextures = useTexture([
    `${basePath}/floor-albedo.webp`,
    `${basePath}/floor-normal.webp`,
    `${basePath}/floor-roughness.webp`,
    `${basePath}/wall-albedo.webp`,
    `${basePath}/wall-normal.webp`,
    `${basePath}/wall-roughness.webp`,
    `${basePath}/wood-albedo.webp`,
    `${basePath}/wood-normal.webp`,
    `${basePath}/wood-roughness.webp`,
    `${basePath}/seat-albedo.webp`,
  ]) as THREE.Texture[];
  const useNormalMaps = qualityTier === 'desktop';

  const textures = useMemo<PreviewTextureSet>(() => ({
    floorAlbedo: cloneRuntimeTexture(loadedTextures[0], [5.2, 5.2], THREE.SRGBColorSpace),
    floorNormal: cloneRuntimeTexture(loadedTextures[1], [5.2, 5.2], THREE.NoColorSpace),
    floorRoughness: cloneRuntimeTexture(loadedTextures[2], [5.2, 5.2], THREE.NoColorSpace),
    wallAlbedo: cloneRuntimeTexture(loadedTextures[3], [3.4, 2.1], THREE.SRGBColorSpace),
    wallNormal: cloneRuntimeTexture(loadedTextures[4], [3.4, 2.1], THREE.NoColorSpace),
    wallRoughness: cloneRuntimeTexture(loadedTextures[5], [3.4, 2.1], THREE.NoColorSpace),
    woodAlbedo: cloneRuntimeTexture(loadedTextures[6], [1.1, 3.2], THREE.SRGBColorSpace),
    woodNormal: cloneRuntimeTexture(loadedTextures[7], [1.1, 3.2], THREE.NoColorSpace),
    woodRoughness: cloneRuntimeTexture(loadedTextures[8], [1.1, 3.2], THREE.NoColorSpace),
    seatAlbedo: cloneRuntimeTexture(loadedTextures[9], [1.4, 1.2], THREE.SRGBColorSpace),
  }), [loadedTextures]);

  const materials = useMemo<EventRoomMaterials>(() => ({
    floor: new THREE.MeshStandardMaterial({
      color: liftThemeColor(theme.floor, 0.42),
      map: textures.floorAlbedo,
      normalMap: useNormalMaps ? textures.floorNormal : null,
      roughnessMap: textures.floorRoughness,
      roughness: 0.68,
      metalness: 0.08,
    }),
    stone: new THREE.MeshStandardMaterial({
      color: liftThemeColor(theme.stone, 0.5),
      map: textures.wallAlbedo,
      normalMap: useNormalMaps ? textures.wallNormal : null,
      roughnessMap: textures.wallRoughness,
      roughness: 0.86,
      metalness: 0.04,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: liftThemeColor(theme.wood, 0.22),
      map: textures.woodAlbedo,
      normalMap: useNormalMaps ? textures.woodNormal : null,
      roughnessMap: textures.woodRoughness,
      roughness: 0.58,
      metalness: 0.03,
    }),
    woodDark: new THREE.MeshStandardMaterial({
      color: liftThemeColor(theme.woodDark, 0.26),
      map: textures.woodAlbedo,
      normalMap: useNormalMaps ? textures.woodNormal : null,
      roughnessMap: textures.woodRoughness,
      roughness: 0.64,
      metalness: 0.02,
    }),
    metal: new THREE.MeshStandardMaterial({ color: liftThemeColor(theme.metal, 0.18), roughness: 0.62, metalness: 0.28 }),
    seat: new THREE.MeshStandardMaterial({
      color: liftThemeColor(theme.seat, 0.28),
      map: textures.seatAlbedo,
      roughness: 0.82,
      metalness: 0.02,
    }),
    screen: new THREE.MeshStandardMaterial({
      color: theme.screenPrimary,
      emissive: theme.screenPrimary,
      emissiveIntensity: 1.05,
      roughness: 0.48,
      metalness: 0.02,
    }),
    screenDim: new THREE.MeshStandardMaterial({
      color: theme.screenSecondary,
      emissive: theme.screenSecondary,
      emissiveIntensity: 0.32,
      roughness: 0.64,
      metalness: 0.02,
    }),
    sideScreen: new THREE.MeshStandardMaterial({
      color: theme.screenSecondary,
      emissive: theme.screenSecondary,
      emissiveIntensity: 0.22,
      roughness: 0.72,
      metalness: 0.02,
    }),
    led: new THREE.MeshStandardMaterial({
      color: theme.led,
      emissive: theme.led,
      emissiveIntensity: 0.92,
      roughness: 0.48,
      metalness: 0.02,
    }),
    warmLed: new THREE.MeshStandardMaterial({
      color: theme.ledSoft,
      emissive: theme.ledSoft,
      emissiveIntensity: 0.86,
      roughness: 0.42,
      metalness: 0.04,
    }),
  }), [theme, textures, useNormalMaps]);

  useEffect(() => () => {
    Object.values(materials).forEach(material => material.dispose());
    Object.values(textures).forEach(texture => texture.dispose());
  }, [materials, textures]);

  return materials;
}
