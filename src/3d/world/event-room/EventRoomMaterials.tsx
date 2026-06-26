"use client";

import { useEffect, useMemo } from 'react';
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
  led: THREE.MeshStandardMaterial;
  warmLed: THREE.MeshStandardMaterial;
};

export function useEventRoomMaterials(theme: EventRoomThemeTokens): EventRoomMaterials {
  const materials = useMemo<EventRoomMaterials>(() => ({
    floor: new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.62, metalness: 0.16 }),
    stone: new THREE.MeshStandardMaterial({ color: theme.stone, roughness: 0.78, metalness: 0.08 }),
    wood: new THREE.MeshStandardMaterial({ color: theme.wood, roughness: 0.58, metalness: 0.04 }),
    woodDark: new THREE.MeshStandardMaterial({ color: theme.woodDark, roughness: 0.72, metalness: 0.02 }),
    metal: new THREE.MeshStandardMaterial({ color: theme.metal, roughness: 0.72, metalness: 0.34 }),
    seat: new THREE.MeshStandardMaterial({ color: theme.seat, roughness: 0.86, metalness: 0.02 }),
    screen: new THREE.MeshStandardMaterial({
      color: theme.screenPrimary,
      emissive: theme.screenPrimary,
      emissiveIntensity: 1.35,
      roughness: 0.42,
      metalness: 0.02,
    }),
    screenDim: new THREE.MeshStandardMaterial({
      color: theme.screenSecondary,
      emissive: theme.screenSecondary,
      emissiveIntensity: 0.68,
      roughness: 0.55,
      metalness: 0.02,
    }),
    led: new THREE.MeshStandardMaterial({
      color: theme.led,
      emissive: theme.led,
      emissiveIntensity: 1.8,
      roughness: 0.4,
      metalness: 0.02,
    }),
    warmLed: new THREE.MeshStandardMaterial({
      color: theme.ledSoft,
      emissive: theme.ledSoft,
      emissiveIntensity: 1.45,
      roughness: 0.36,
      metalness: 0.04,
    }),
  }), [theme]);

  useEffect(() => () => {
    Object.values(materials).forEach(material => material.dispose());
  }, [materials]);

  return materials;
}
