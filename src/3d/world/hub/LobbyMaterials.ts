"use client";

import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { LOBBY_LED_BLOOM_GAIN, type LobbyQualityProfile } from './lobbyConfig';
import type { LobbySurface } from './lobbyGeometry';
import { withLobbyFloor, withLobbyWalls } from './lobbySurfaceShader';

export type LobbyMaterials = Record<LobbySurface, THREE.MeshStandardMaterial> & {
  /** Procedural glossy tiles (hub and corridor floors); `stone` stays for the atlas surface type. */
  floor: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  counter: THREE.MeshStandardMaterial;
  rug: THREE.MeshStandardMaterial;
  led: THREE.MeshBasicMaterial;
  glow: THREE.MeshBasicMaterial;
  pool: THREE.MeshBasicMaterial;
  softShadow: THREE.MeshBasicMaterial;
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

  // Radial falloff for floor light pools; additive, so the edge fades to nothing.
  const poolMap = useMemo(() => {
    const size = 64;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x + 0.5) / size * 2 - 1;
        const dy = (y + 0.5) / size * 2 - 1;
        const falloff = Math.pow(Math.max(0, 1 - Math.hypot(dx, dy)), 1.8);
        const value = Math.round(falloff * 255);
        pixels.set([value, value, value, 255], (y * size + x) * 4);
      }
    }
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
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
      // Roughness multiplies the ORM map: a semi-polished floor picks up area-light sheen.
      stone: new THREE.MeshStandardMaterial({ ...pbr, color: '#75716d', roughness: 0.52, metalness: 0, normalScale: new THREE.Vector2(0.25, 0.25) }),
      wood: new THREE.MeshStandardMaterial({ ...pbr, color: '#93725a', roughness: 0.72, metalness: 0, normalScale: new THREE.Vector2(0.3, 0.3) }),
      // Moderate roughness: the big ceiling area lights would otherwise mirror as panels across the floor.
      floor: withLobbyFloor(new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 }), quality.floorReflections),
      // Darker low, warm cove wash high (lobbySurfaceShader).
      plaster: withLobbyWalls(new THREE.MeshStandardMaterial({ ...pbr, color: '#bdb6ae', roughness: 0.96, metalness: 0 })),
      dark: new THREE.MeshStandardMaterial({ ...pbr, color: '#a9b0b2', roughness: 0.94, metalness: 0 }),
      door: new THREE.MeshStandardMaterial({ color: '#41494d', roughness: 0.72, metalness: 0.06 }),
      brass: new THREE.MeshStandardMaterial({ color: '#c8a27b', roughness: 0.44, metalness: 0.6 }),
      counter: new THREE.MeshStandardMaterial({ color: '#1f1b19', roughness: 0.34, metalness: 0.12 }),
      rug: new THREE.MeshStandardMaterial({ color: '#3a2a2c', roughness: 1, metalness: 0 }),
      // Pushed past white where bloom runs: only these accents cross the bloom threshold, so
      // screens and signs (at most white) stay sharp.
      led: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe0b8').multiplyScalar(quality.bloom ? LOBBY_LED_BLOOM_GAIN : 1), toneMapped: false }),
      glow: new THREE.MeshBasicMaterial({ map: glowMap, color: '#ffc88d', transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
      pool: new THREE.MeshBasicMaterial({ map: poolMap, color: '#ffb36b', transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      softShadow: new THREE.MeshBasicMaterial({ color: '#050302', alphaMap: poolMap, transparent: true, opacity: 0.6, depthWrite: false }),
      shadow: new THREE.MeshBasicMaterial({
        color: '#080604',
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    };
  }, [albedo, normal, orm, glowMap, poolMap, quality.useNormalMaps, quality.floorReflections, quality.bloom]);

  useEffect(() => () => {
    Object.values(materials).forEach(material => material.dispose());
  }, [materials]);

  useEffect(() => () => {
    albedo.dispose();
    normal.dispose();
    orm.dispose();
  }, [albedo, normal, orm]);

  useEffect(() => () => glowMap.dispose(), [glowMap]);
  useEffect(() => () => poolMap.dispose(), [poolMap]);

  return materials;
}
