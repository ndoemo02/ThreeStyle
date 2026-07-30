"use client";

import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { EVENT_ROOM_LIGHT_BASES, type EventRoomLightBaseProfile } from './eventRoomLightStates';
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
  /** Kanał `ceilingRing` — pierścień-bohater + cove. */
  ringNeon: THREE.MeshStandardMaterial;
  /** Kanał `ceilingAccents` — pierścień akcentowy + downlighty. */
  ringAccent: THREE.MeshStandardMaterial;
  /** Kanał `sideWash` — szczeliny neonu w ścianach. */
  wallSlit: THREE.MeshStandardMaterial;
  /** Kanał `runway` — pętla LED runwayu + nosy poziomów sceny. */
  runwayLed: THREE.MeshStandardMaterial;
  /** Kanał `loungeGlow` — fascia lounge + lampki stołowe. */
  loungeLed: THREE.MeshStandardMaterial;
  /** Kanał `exitSafety` — wyłącznie pasek wyjścia. Żadnego prawdziwego światła. */
  exitLed: THREE.MeshStandardMaterial;
  /** Warstwa zgodności: renderery powłoki, podium, lounge i ekranów bocznych (Etapy 3–6). */
  led: THREE.MeshStandardMaterial;
  /** Warstwa zgodności — patrz `led`. */
  warmLed: THREE.MeshStandardMaterial;
};

/**
 * Bazowe `emissiveIntensity` materiałów zgodnościowych — wartości identyczne ze
 * stanem przed Etapem 2, żeby przepięcie na kanały nie zmieniło wyglądu bazowego.
 * Znikają wraz z legacy materiałami w Etapach 3–6.
 */
export const EVENT_ROOM_LEGACY_EMISSIVE_BASES = {
  led: 0.92,
  warmLed: 0.86,
  screenDim: 0.32,
  sideScreen: 0.22,
} as const;

/**
 * Tekstury ładowane przez nazwane klucze, nigdy przez indeksy tablicy — pominięcie
 * normal map na mobile nie może po cichu przesunąć indeksów (R7, D9).
 */
type EventRoomTextureKey =
  | 'floorAlbedo'
  | 'floorNormal'
  | 'floorRoughness'
  | 'wallAlbedo'
  | 'wallNormal'
  | 'wallRoughness'
  | 'woodAlbedo'
  | 'woodNormal'
  | 'woodRoughness'
  | 'seatAlbedo';

type LoadedTextures = Partial<Record<EventRoomTextureKey, THREE.Texture>>;

type PreviewTextureSet = {
  floorAlbedo: THREE.Texture;
  floorNormal: THREE.Texture | null;
  floorRoughness: THREE.Texture;
  wallAlbedo: THREE.Texture;
  wallNormal: THREE.Texture | null;
  wallRoughness: THREE.Texture;
  woodAlbedo: THREE.Texture;
  woodNormal: THREE.Texture | null;
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

function requireTexture(textures: LoadedTextures, key: EventRoomTextureKey): THREE.Texture {
  const texture = textures[key];
  if (!texture) throw new Error(`EventRoomMaterials: brak wymaganej tekstury "${key}".`);
  return texture;
}

function cloneOptionalTexture(
  source: THREE.Texture | undefined,
  repeat: [number, number],
  colorSpace: THREE.ColorSpace,
) {
  return source ? cloneRuntimeTexture(source, repeat, colorSpace) : null;
}

function liftThemeColor(color: string, amount: number) {
  return new THREE.Color(color).lerp(new THREE.Color('#f2d3b6'), amount);
}

function createChannelMaterial(color: string, emissiveIntensity: number, roughness: number, metalness: number) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    roughness,
    metalness,
  });
}

export function useEventRoomMaterials(
  theme: EventRoomThemeTokens,
  {
    baseProfile,
    qualityTier,
  }: {
    /** Ustalany raz przy mount strefy — jedyne źródło wariantu tekstur (§8, D12). */
    baseProfile: EventRoomLightBaseProfile;
    /** Steruje wyłącznie użyciem już wczytanych zasobów, nigdy ścieżkami (R13). */
    qualityTier: EventRoomQualityTier;
  },
): EventRoomMaterials {
  const basePath = `/textures/runtime/event-room/${baseProfile}`;
  const loadsNormalMaps = baseProfile === 'desktop';

  const texturePaths = useMemo<Record<string, string>>(() => {
    const paths: Record<string, string> = {
      floorAlbedo: `${basePath}/floor-albedo.webp`,
      floorRoughness: `${basePath}/floor-roughness.webp`,
      wallAlbedo: `${basePath}/wall-albedo.webp`,
      wallRoughness: `${basePath}/wall-roughness.webp`,
      woodAlbedo: `${basePath}/wood-albedo.webp`,
      woodRoughness: `${basePath}/wood-roughness.webp`,
      seatAlbedo: `${basePath}/seat-albedo.webp`,
    };
    // Mobile nie ładuje normal map, których nie używa (D9).
    if (loadsNormalMaps) {
      paths.floorNormal = `${basePath}/floor-normal.webp`;
      paths.wallNormal = `${basePath}/wall-normal.webp`;
      paths.woodNormal = `${basePath}/wood-normal.webp`;
    }
    return paths;
  }, [basePath, loadsNormalMaps]);

  const loadedTextures = useTexture(texturePaths) as LoadedTextures;
  const useNormalMaps = loadsNormalMaps && qualityTier !== 'degraded';

  const textures = useMemo<PreviewTextureSet>(() => ({
    floorAlbedo: cloneRuntimeTexture(requireTexture(loadedTextures, 'floorAlbedo'), [5.2, 5.2], THREE.SRGBColorSpace),
    floorNormal: cloneOptionalTexture(loadedTextures.floorNormal, [5.2, 5.2], THREE.NoColorSpace),
    floorRoughness: cloneRuntimeTexture(requireTexture(loadedTextures, 'floorRoughness'), [5.2, 5.2], THREE.NoColorSpace),
    wallAlbedo: cloneRuntimeTexture(requireTexture(loadedTextures, 'wallAlbedo'), [3.4, 2.1], THREE.SRGBColorSpace),
    wallNormal: cloneOptionalTexture(loadedTextures.wallNormal, [3.4, 2.1], THREE.NoColorSpace),
    wallRoughness: cloneRuntimeTexture(requireTexture(loadedTextures, 'wallRoughness'), [3.4, 2.1], THREE.NoColorSpace),
    woodAlbedo: cloneRuntimeTexture(requireTexture(loadedTextures, 'woodAlbedo'), [1.1, 3.2], THREE.SRGBColorSpace),
    woodNormal: cloneOptionalTexture(loadedTextures.woodNormal, [1.1, 3.2], THREE.NoColorSpace),
    woodRoughness: cloneRuntimeTexture(requireTexture(loadedTextures, 'woodRoughness'), [1.1, 3.2], THREE.NoColorSpace),
    seatAlbedo: cloneRuntimeTexture(requireTexture(loadedTextures, 'seatAlbedo'), [1.4, 1.2], THREE.SRGBColorSpace),
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
    screenDim: createChannelMaterial(theme.screenSecondary, EVENT_ROOM_LEGACY_EMISSIVE_BASES.screenDim, 0.64, 0.02),
    sideScreen: createChannelMaterial(theme.screenSecondary, EVENT_ROOM_LEGACY_EMISSIVE_BASES.sideScreen, 0.72, 0.02),

    ringNeon: createChannelMaterial(theme.ledSoft, EVENT_ROOM_LIGHT_BASES.emissive.ringNeon, 0.42, 0.04),
    ringAccent: createChannelMaterial(theme.led, EVENT_ROOM_LIGHT_BASES.emissive.ringAccent, 0.44, 0.03),
    wallSlit: createChannelMaterial(theme.led, EVENT_ROOM_LIGHT_BASES.emissive.wallSlit, 0.46, 0.02),
    runwayLed: createChannelMaterial(theme.ledSoft, EVENT_ROOM_LIGHT_BASES.emissive.runwayLed, 0.44, 0.03),
    loungeLed: createChannelMaterial(theme.ledSoft, EVENT_ROOM_LIGHT_BASES.emissive.loungeLed, 0.46, 0.03),
    exitLed: createChannelMaterial(theme.ledSoft, EVENT_ROOM_LIGHT_BASES.emissive.exitLed, 0.5, 0.02),

    led: createChannelMaterial(theme.led, EVENT_ROOM_LEGACY_EMISSIVE_BASES.led, 0.48, 0.02),
    warmLed: createChannelMaterial(theme.ledSoft, EVENT_ROOM_LEGACY_EMISSIVE_BASES.warmLed, 0.42, 0.04),
  }), [theme, textures, useNormalMaps]);

  useEffect(() => () => {
    Object.values(materials).forEach(material => material.dispose());
    Object.values(textures).forEach(texture => texture?.dispose());
  }, [materials, textures]);

  return materials;
}
