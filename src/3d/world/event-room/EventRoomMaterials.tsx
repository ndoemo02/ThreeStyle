"use client";

import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { EventRoomThemeTokens } from './EventRoomTypes';

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

export function useEventRoomMaterials(theme: EventRoomThemeTokens): EventRoomMaterials {
  const sourceWoodTexture = useTexture('/textures/vocal/wood.jpg');

  const woodTexture = useMemo(() => {
    const texture = sourceWoodTexture.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.2, 3.4);
    texture.needsUpdate = true;
    return texture;
  }, [sourceWoodTexture]);

  const materials = useMemo<EventRoomMaterials>(() => ({
    floor: new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.58, metalness: 0.12 }),
    stone: new THREE.MeshStandardMaterial({ color: theme.stone, roughness: 0.68, metalness: 0.12 }),
    wood: new THREE.MeshStandardMaterial({
      color: theme.wood,
      map: woodTexture,
      roughness: 0.5,
      metalness: 0.03,
    }),
    woodDark: new THREE.MeshStandardMaterial({
      color: theme.woodDark,
      map: woodTexture,
      roughness: 0.62,
      metalness: 0.02,
    }),
    metal: new THREE.MeshStandardMaterial({ color: theme.metal, roughness: 0.66, metalness: 0.38 }),
    seat: new THREE.MeshStandardMaterial({ color: theme.seat, roughness: 0.82, metalness: 0.02 }),
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
  }), [theme, woodTexture]);

  useEffect(() => () => {
    Object.values(materials).forEach(material => material.dispose());
    woodTexture.dispose();
  }, [materials, woodTexture]);

  return materials;
}
