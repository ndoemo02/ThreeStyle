import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHudStore } from '../../../stores/useHudStore';
import { useCreatorLightingFrame } from './CreatorLighting';
import { VISUALIZER_BARS, VISUALIZER_REST, createVisualizer, stepVisualizer, visualizerBandEdges, visualizerTargets } from '../../../lib/creatorVisualizer';

function createVideoTexture(element: HTMLVideoElement | null) {
  if (!element) return null;
  const texture = new THREE.VideoTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// Audio display layout (1024×576): text block on top, bars standing on a baseline with a dim reflection below.
const LEFT = 64;
const PITCH = (1024 - LEFT * 2) / VISUALIZER_BARS;
// Wide bars with clear gaps: the canvas has no mipmaps, so thin bars shimmer from across the room on a phone.
const BAR = Math.round(PITCH * 0.68);
const BASELINE = 456;
const BAR_HEIGHT = 196;
const REFLECTION = 0.32;

/** Must render inside CreatorLightingProvider: the visualizer reads the provider's spectrum and LED colour. */
export function useCreatorScreenTexture(screen?: RefObject<THREE.Group | null>, mobile = false) {
  const lighting = useCreatorLightingFrame();
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
    return { canvas, context: canvas.getContext('2d'), background, backgroundContext: background.getContext('2d'), texture };
  }, []);
  const displayRef = useRef(audioDisplay);
  const audioFrame = useRef({ key: '', time: -1, moving: true });
  const bars = useRef({ visualizer: createVisualizer(), targets: new Float32Array(VISUALIZER_BARS), edges: visualizerBandEdges(0), bins: -1 });
  const bounds = useMemo(() => ({ frustum: new THREE.Frustum(), matrix: new THREE.Matrix4(), sphere: new THREE.Sphere(new THREE.Vector3(), 4) }), []);

  useEffect(() => {
    displayRef.current = audioDisplay;
    audioFrame.current = { key: '', time: -1, moving: true };
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
    const last = audioFrame.current;
    // A paused screen keeps drawing until the bars have settled, then stops.
    if (status !== 'playing' && last.key === key && !last.moving) return;
    if (last.key === key && now - last.time < 1 / (mobile ? 20 : 30)) return;
    if (screen?.current) {
      screen.current.getWorldPosition(bounds.sphere.center);
      bounds.frustum.setFromProjectionMatrix(bounds.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      if (!bounds.frustum.intersectsSphere(bounds.sphere)) return;
    }
    const { context: ctx, backgroundContext: text, background, canvas, texture } = displayRef.current;
    if (!ctx || !text) return;
    if (last.key !== key) {
      text.fillStyle = '#100e0c'; text.fillRect(0, 0, canvas.width, canvas.height);
      text.fillStyle = '#f3a05d'; text.font = 'bold 28px sans-serif'; text.fillText('THR3STYLE / CREATOR ROOM', LEFT, 78);
      text.fillStyle = '#f2ede6'; text.font = 'bold 64px sans-serif';
      let title = media.title;
      while (text.measureText(title).width > 890 && title.length > 1) title = title.slice(0, -1);
      text.fillText(title === media.title ? title : `${title.slice(0, -1)}…`, LEFT, 170);
      text.fillStyle = '#c9bdb0'; text.font = 'bold 32px sans-serif';
      const label = status === 'playing' ? 'TERAZ GRA' : status === 'loading' ? 'ŁADOWANIE' : status === 'error' ? 'PROBLEM Z ODTWARZANIEM' : 'PAUZA';
      text.fillText(label, LEFT, 222);
      text.fillStyle = '#2b2622'; text.fillRect(LEFT - 8, BASELINE + 2, canvas.width - (LEFT - 8) * 2, 2);
    }
    const delta = last.time < 0 ? 0 : now - last.time;
    audioFrame.current = { key, time: now, moving: last.moving };

    const frame = lighting.current, music = frame.music, state = bars.current;
    let targets: Float32Array | null = null;
    if (music.playing && music.spectrum.length > 0) {
      if (state.bins !== music.spectrum.length) { state.bins = music.spectrum.length; state.edges = visualizerBandEdges(state.bins); }
      targets = visualizerTargets(music.spectrum, state.edges, state.targets);
    }
    const rest = frame.session.state === 'paused' ? VISUALIZER_REST : 0;
    audioFrame.current.moving = stepVisualizer(state.visualizer, targets, delta, rest, frame.reducedMotion);

    const { levels, peaks } = state.visualizer;
    ctx.drawImage(background, 0, 0);
    ctx.fillStyle = frame.color.getStyle();
    for (let bar = 0; bar < VISUALIZER_BARS; bar++) {
      const height = Math.max(3, levels[bar] * BAR_HEIGHT);
      ctx.fillRect(LEFT + bar * PITCH, BASELINE - height, BAR, height);
    }
    ctx.globalAlpha = 0.2;
    for (let bar = 0; bar < VISUALIZER_BARS; bar++) {
      ctx.fillRect(LEFT + bar * PITCH, BASELINE + 6, BAR, Math.max(1, levels[bar] * BAR_HEIGHT * REFLECTION));
    }
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff1e2';
    if (!frame.reducedMotion) {
      for (let bar = 0; bar < VISUALIZER_BARS; bar++) {
        if (peaks[bar] > levels[bar] + 0.01) ctx.fillRect(LEFT + bar * PITCH, BASELINE - peaks[bar] * BAR_HEIGHT - 6, BAR, 5);
      }
    }
    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  });

  if (camEnabled) return cameraTexture;
  if (!media || status === 'error') return null;
  return media.kind === 'audio' ? audioDisplay.texture : videoTexture;
}
