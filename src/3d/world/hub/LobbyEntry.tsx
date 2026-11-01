'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ENTRY, ENTRY_TIMING, entryEase, entryImageSource } from '../../../lib/entryTransition';
import { useEntryStore } from '../../../stores/useEntryStore';
import { useTransitionSurface } from '../../systems/useTransitionSurface';
import { MergedLobbyBoxes, type LobbyBoxSpec } from './LobbyMeshes';

const FRAME: LobbyBoxSpec[] = [
  { position: [-2.04, 2.4, 0.08], size: [0.28, 4.8, 0.5] },
  { position: [2.04, 2.4, 0.08], size: [0.28, 4.8, 0.5] },
  { position: [0, 4.61, 0.08], size: [4.36, 0.38, 0.5] },
  { position: [0, 0.04, 0.08], size: [4.1, 0.08, 0.5] },
];

function leafGeometry(left: boolean, source: ReturnType<typeof entryImageSource>) {
  const geometry = new THREE.PlaneGeometry(ENTRY.doorWidth / 2, ENTRY.height);
  const uv = geometry.getAttribute('uv');
  const x0 = left ? source.left : source.x;
  const x1 = left ? source.x : source.right;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (x0 + uv.getX(i) * (x1 - x0)) / source.w, 1 - source.bottom / source.h + uv.getY(i) * (source.bottom - source.top) / source.h);
  }
  return geometry;
}

function exteriorWallGeometry(width: number, portrait: boolean) {
  const geometry = new THREE.PlaneGeometry(width, 4.8);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, portrait ? (760 + uv.getX(i) * 100) / 941 : (710 + uv.getX(i) * 360) / 1672,
      portrait ? 1 - 900 / 1672 + uv.getY(i) * 800 / 1672 : 1 - 785 / 941 + uv.getY(i) * 760 / 941);
  }
  return geometry;
}

export function LobbyEntry() {
  const portrait = useThree(s => s.size.height > s.size.width);
  const image = entryImageSource(portrait);
  const source = useLoader(THREE.TextureLoader, image.url);
  const grain = useTransitionSurface();
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const map = useMemo(() => { const t = source.clone(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t; }, [source]);
  const geometries = useMemo(() => [leafGeometry(true, entryImageSource(portrait)), leafGeometry(false, entryImageSource(portrait))], [portrait]);
  const walls = useMemo(() => [exteriorWallGeometry(16.1, portrait), exteriorWallGeometry(8.1, portrait)], [portrait]);
  const frameMaterial = useMemo(() => new THREE.MeshStandardMaterial({ map: grain, color: '#473a30', roughness: 0.82, metalness: 0.15 }), [grain]);
  useEffect(() => () => map.dispose(), [map]);
  useEffect(() => () => frameMaterial.dispose(), [frameMaterial]);
  useEffect(() => () => [...geometries, ...walls].forEach(g => g.dispose()), [geometries, walls]);
  useFrame(() => {
    const state = useEntryStore.getState();
    // On direct demo entry the portal is already open; it remains a physical threshold.
    const open = state.phase === 'opening'
      ? entryEase((performance.now() - state.startedAt) / ENTRY_TIMING.opening)
      : ['idle', 'entering', 'complete', 'error'].includes(state.phase) ? 1 : 0;
    if (left.current) left.current.position.x = -ENTRY.doorWidth / 4 - open * 1.95;
    if (right.current) right.current.position.x = ENTRY.doorWidth / 4 + open * 1.95;
  });
  return <group position={[ENTRY.x, 0, ENTRY.z]} name="landing-lobby-threshold">
    <mesh geometry={walls[0]} position={[-9.95, 2.4, 0.185]}><meshBasicMaterial map={map} toneMapped={false} /></mesh>
    <mesh geometry={walls[1]} position={[5.95, 2.4, 0.185]}><meshBasicMaterial map={map} toneMapped={false} /></mesh>
    <MergedLobbyBoxes boxes={FRAME} surface="dark" material={frameMaterial} />
    <mesh position={[0, 4.41, 0.34]}><boxGeometry args={[3.88, 0.035, 0.04]} /><meshBasicMaterial color="#ffc886" toneMapped={false} /></mesh>
    <group ref={left} position={[-0.9, 2.325, 0.02]} name="landing-door-left">
      <mesh><boxGeometry args={[1.8, ENTRY.height, 0.12]} /><meshStandardMaterial color="#335d5b" map={grain} roughness={0.85} metalness={0.1} /></mesh>
      <mesh geometry={geometries[0]} position={[0, 0, 0.067]}><meshBasicMaterial map={map} side={THREE.DoubleSide} toneMapped={false} /></mesh>
    </group>
    <group ref={right} position={[0.9, 2.325, 0.02]} name="landing-door-right">
      <mesh><boxGeometry args={[1.8, ENTRY.height, 0.12]} /><meshStandardMaterial color="#335d5b" map={grain} roughness={0.85} metalness={0.1} /></mesh>
      <mesh geometry={geometries[1]} position={[0, 0, 0.067]}><meshBasicMaterial map={map} side={THREE.DoubleSide} toneMapped={false} /></mesh>
    </group>
  </group>;
}
