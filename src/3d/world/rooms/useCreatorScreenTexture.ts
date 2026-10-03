import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHudStore } from '../../../stores/useHudStore';
import { useAudioStore } from '../../../stores/useAudioStore';

function createVideoTexture(element: HTMLVideoElement | null) {
  if (!element) return null;
  const texture = new THREE.VideoTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export function useCreatorScreenTexture() {
  const video = useHudStore(s => s.masterVideoRef);
  const camera = useHudStore(s => s.camVideoElement);
  const camEnabled = useHudStore(s => s.camEnabled);
  const media = useHudStore(s => s.activeMedia);
  const status = useHudStore(s => s.playbackStatus);
  const videoTexture = useMemo(() => createVideoTexture(video), [video]);
  const cameraTexture = useMemo(() => createVideoTexture(camera), [camera]);
  const audioDisplay = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 576;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return { canvas, context: canvas.getContext('2d'), texture, data: new Uint8Array(128) };
  }, []);
  const displayRef = useRef(audioDisplay);
  const audioFrame = useRef({ key: '', time: -1 });

  useEffect(() => {
    return () => videoTexture?.dispose();
  }, [videoTexture]);
  useEffect(() => () => cameraTexture?.dispose(), [cameraTexture]);
  useEffect(() => () => audioDisplay.texture.dispose(), [audioDisplay]);

  useFrame(({ clock }) => {
    if (camEnabled || media?.kind !== 'audio') return;
    const key = `${media.id}:${status}`;
    const now = clock.getElapsedTime();
    if (status !== 'playing' && audioFrame.current.key === key) return;
    if (status === 'playing' && now - audioFrame.current.time < 1 / 30) return;
    audioFrame.current = { key, time: now };
    const { context: ctx, canvas, texture, data } = displayRef.current;
    if (!ctx) return;
    const analyser = useAudioStore.getState().analyserNode;
    if (status === 'playing' && analyser) analyser.getByteFrequencyData(data); else data.fill(0);
    ctx.fillStyle = '#151310'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f3a05d'; ctx.font = '20px sans-serif'; ctx.fillText('THR3STYLE / CREATOR ROOM', 64, 75);
    ctx.fillStyle = '#f2ede6'; ctx.font = 'bold 46px sans-serif';
    let title = media.title;
    while (ctx.measureText(title).width > 890 && title.length > 1) title = title.slice(0, -1);
    ctx.fillText(title === media.title ? title : `${title.slice(0, -1)}…`, 64, 170);
    ctx.fillStyle = '#b4a99c'; ctx.font = '22px sans-serif';
    const label = status === 'playing' ? 'TERAZ GRA' : status === 'loading' ? 'ŁADOWANIE' : status === 'error' ? 'PROBLEM Z ODTWARZANIEM' : 'PAUZA';
    ctx.fillText(label, 64, 222);
    ctx.fillStyle = '#f3a05d';
    for (let i = 0; i < 48; i++) {
      const height = Math.max(5, data[i] / 255 * 190);
      ctx.fillRect(64 + i * 18.5, 385 - height / 2, 6, height);
    }
    texture.needsUpdate = true;
  });

  if (camEnabled) return cameraTexture;
  if (!media || status === 'error') return null;
  return media.kind === 'audio' ? audioDisplay.texture : videoTexture;
}
