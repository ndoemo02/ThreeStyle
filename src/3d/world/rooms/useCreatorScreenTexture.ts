import { useEffect, useMemo, useRef, type RefObject } from 'react';
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

export function useCreatorScreenTexture(screen?: RefObject<THREE.Group | null>, mobile = false) {
  const video = useHudStore(s => s.masterVideoRef);
  const camera = useHudStore(s => s.camVideoElement);
  const camEnabled = useHudStore(s => s.camEnabled);
  const media = useHudStore(s => s.activeMedia);
  const status = useHudStore(s => s.playbackStatus);
  const videoTexture = useMemo(() => media?.kind === 'video' ? createVideoTexture(video) : null, [video, media?.kind]);
  const cameraTexture = useMemo(() => camEnabled ? createVideoTexture(camera) : null, [camera, camEnabled]);
  const audioDisplay = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 576;
    const background = document.createElement('canvas');
    background.width = canvas.width; background.height = canvas.height;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return { canvas, context: canvas.getContext('2d'), background, backgroundContext: background.getContext('2d'), texture, data: new Uint8Array(128) };
  }, []);
  const displayRef = useRef(audioDisplay);
  const audioFrame = useRef({ key: '', time: -1 });
  const bounds = useMemo(() => ({ frustum: new THREE.Frustum(), matrix: new THREE.Matrix4(), sphere: new THREE.Sphere(new THREE.Vector3(), 4) }), []);

  useEffect(() => {
    displayRef.current = audioDisplay;
    audioFrame.current = { key: '', time: -1 };
  }, [audioDisplay]);

  useEffect(() => {
    return () => videoTexture?.dispose();
  }, [videoTexture]);
  useEffect(() => () => cameraTexture?.dispose(), [cameraTexture]);
  useEffect(() => () => audioDisplay.texture.dispose(), [audioDisplay]);

  useFrame(({ clock, camera }) => {
    if (camEnabled || media?.kind !== 'audio') return;
    const key = `${media.id}:${status}`;
    const now = clock.elapsedTime;
    if (status !== 'playing' && audioFrame.current.key === key) return;
    if (status === 'playing' && now - audioFrame.current.time < 1 / (mobile ? 20 : 30)) return;
    if (screen?.current) {
      screen.current.getWorldPosition(bounds.sphere.center);
      bounds.frustum.setFromProjectionMatrix(bounds.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      if (!bounds.frustum.intersectsSphere(bounds.sphere)) return;
    }
    const { context: ctx, backgroundContext: text, background, canvas, texture, data } = displayRef.current;
    if (!ctx || !text) return;
    if (audioFrame.current.key !== key) {
      text.fillStyle = '#151310'; text.fillRect(0, 0, canvas.width, canvas.height);
      text.fillStyle = '#f3a05d'; text.font = '26px sans-serif'; text.fillText('THR3STYLE / CREATOR ROOM', 64, 75);
      text.fillStyle = '#f2ede6'; text.font = 'bold 52px sans-serif';
      let title = media.title;
      while (text.measureText(title).width > 890 && title.length > 1) title = title.slice(0, -1);
      text.fillText(title === media.title ? title : `${title.slice(0, -1)}…`, 64, 170);
      text.fillStyle = '#b4a99c'; text.font = '28px sans-serif';
      const label = status === 'playing' ? 'TERAZ GRA' : status === 'loading' ? 'ŁADOWANIE' : status === 'error' ? 'PROBLEM Z ODTWARZANIEM' : 'PAUZA';
      text.fillText(label, 64, 222);
    }
    audioFrame.current = { key, time: now };
    const analyser = useAudioStore.getState().analyserNode;
    if (status === 'playing' && analyser) analyser.getByteFrequencyData(data); else data.fill(0);
    ctx.drawImage(background, 0, 0);
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
