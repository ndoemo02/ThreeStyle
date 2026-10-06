'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { LobbyMaterials } from './LobbyMaterials';
import { MergedLobbyBoxes, MergedLobbyGlow } from './LobbyMeshes';
import { CHARACTER_UV, LOBBY_PAINT, LOBBY_SEAT, LOBBY_SEAT_TRIM, LOBBY_COOL_LED, LOBBY_COOL_GLOW, LOBBY_SEAT_SHADOW } from './lobbyCharacterLayout';

export function LobbyCharacter({ materials, low }: { materials: LobbyMaterials; low: boolean }) {
  const started = useRef(-1);
  const glow = useRef<THREE.MeshBasicMaterial | null>(null);
  // useTexture eagerly uploads its cached source. Configure an owned copy via
  // useLoader instead, so only the configured atlas occupies GPU memory.
  const source = useLoader(THREE.TextureLoader, `/textures/runtime/lobby/${low ? 'low' : 'shared'}/character.webp`);
  const gl = useThree(s => s.gl);
  const texture = useMemo(() => {
    const copy = source.clone();
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    copy.needsUpdate = true;
    return copy;
  }, [source, gl]);
  useEffect(() => () => texture.dispose(), [texture]);
  const geometry = useMemo(() => {
    const parts = LOBBY_PAINT.map(spec => {
      const part = new THREE.PlaneGeometry(...spec.size);
      const uv = part.getAttribute('uv');
      const [x,y,w,h] = CHARACTER_UV[spec.tile];
      // An 8px gutter in the 1024 atlas prevents neighbour tile bleeding.
      const pad = 8/1024;
      for(let i=0;i<uv.count;i++) uv.setXY(i,x+pad+uv.getX(i)*(w-2*pad),y+pad+uv.getY(i)*(h-2*pad));
      const rotation = spec.rotation ?? [0,0,0];
      part.rotateX(rotation[0]);part.rotateY(rotation[1]);part.rotateZ(rotation[2]);
      part.translate(...spec.position);
      return part;
    });
    const merged = mergeGeometries(parts,false);
    parts.forEach(p=>p.dispose());merged.computeBoundingSphere();
    return merged;
  }, []);
  const accent = useMemo(() => ({
    led: new THREE.MeshBasicMaterial({color:'#79ada8',toneMapped:false}),
    glow: new THREE.MeshBasicMaterial({map:materials.glow.map,color:'#65aaa3',transparent:true,opacity:.2,depthWrite:false,side:THREE.FrontSide,toneMapped:false}),
    shadow: new THREE.MeshBasicMaterial({color:'#080604',transparent:true,opacity:.24,depthWrite:false,side:THREE.FrontSide}),
  }),[materials]);
  useEffect(()=>()=>{accent.led.dispose();accent.glow.dispose();accent.shadow.dispose();},[accent]);
  useEffect(() => {
    glow.current = accent.glow;
    if (!low) useTexture.preload('/textures/runtime/lobby/low/character.webp');
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { started.current = media.matches ? -1 : performance.now(); };
    update();media.addEventListener('change',update);
    return () => media.removeEventListener('change',update);
  },[accent,low]);
  useFrame(()=>{
    // Brief, quiet welcome; uniform changes only. No lamp or ongoing pulse loop.
    const material = glow.current;
    if(!material) return;
    const time = started.current < 0 ? 5 : (performance.now()-started.current)/1000;
    if(time>4.5 && material.opacity===.2) return;
    const lift = time>=4.5 ? 0 : Math.sin(Math.PI*Math.min(1,time/4.5))*.055;
    material.opacity = .2+lift;
  });
  return <group name="lobby-character">
    <MergedLobbyBoxes boxes={LOBBY_SEAT} surface="dark" material={materials.dark} decorative />
    <MergedLobbyBoxes boxes={LOBBY_SEAT_TRIM} surface="wood" material={materials.brass} decorative />
    <MergedLobbyGlow planes={LOBBY_SEAT_SHADOW} material={accent.shadow} />
    <mesh name="lobby-paint" geometry={geometry} raycast={()=>{}}>
      <meshStandardMaterial map={texture} roughness={.95} alphaTest={.16} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
    </mesh>
    <MergedLobbyBoxes boxes={LOBBY_COOL_LED} surface="wood" material={accent.led} decorative />
    <MergedLobbyGlow planes={LOBBY_COOL_GLOW} material={accent.glow} />
  </group>;
}
