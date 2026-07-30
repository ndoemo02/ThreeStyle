"use client";

import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useEventRoomScreenSurfaceBinding } from './EventRoomLightRig';
import { EVENT_ROOM_LIGHT_STATES, eventRoomScreenMultiplier } from './eventRoomLightStates';
import type {
  EventRoomQualityTier,
  EventRoomShowState,
  EventRoomThemeTokens,
  TopTenTrack,
} from './EventRoomTypes';
import { EVENT_ROOM_TOP_TEN } from './EventRoomTypes';

const SCREEN_WIDTH = 12.65;
const SCREEN_HEIGHT = 3.78;
const SCREEN_ARC = THREE.MathUtils.degToRad(36);

function createCurvedPanelGeometry(
  width: number,
  height: number,
  arc: number,
  segments: number,
) {
  const geometry = new THREE.PlaneGeometry(width, height, segments, 1);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const radius = width / arc;

  for (let index = 0; index < positions.count; index += 1) {
    const sourceX = positions.getX(index);
    const theta = (sourceX / width) * arc;
    positions.setX(index, Math.sin(theta) * radius);
    positions.setZ(index, radius * (1 - Math.cos(theta)));
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function findTrack(rank: number): TopTenTrack {
  return EVENT_ROOM_TOP_TEN.find(track => track.rank === rank) ?? EVENT_ROOM_TOP_TEN[0];
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawScreenArtwork(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  show: EventRoomShowState,
  theme: EventRoomThemeTokens,
) {
  const activeTrack = findTrack(show.currentRank);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, theme.id === 'rose' ? '#2b101f' : '#10122f');
  background.addColorStop(0.5, theme.id === 'rose' ? '#641f43' : '#272052');
  background.addColorStop(1, theme.id === 'rose' ? '#25101d' : '#0b1026');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.28;
  context.strokeStyle = theme.led;
  context.lineWidth = Math.max(3, width / 520);
  for (let wave = 0; wave < 4; wave += 1) {
    context.beginPath();
    context.moveTo(-80, height * (0.18 + wave * 0.19));
    context.bezierCurveTo(
      width * 0.24,
      height * (0.02 + wave * 0.16),
      width * 0.68,
      height * (0.38 + wave * 0.1),
      width + 80,
      height * (0.12 + wave * 0.17),
    );
    context.stroke();
  }
  context.restore();

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = theme.ledSoft;
  context.font = `600 ${Math.round(height * 0.035)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  context.fillText(show.phase.toUpperCase(), width / 2, height * 0.075);

  context.shadowColor = theme.led;
  context.shadowBlur = height * 0.045;
  context.fillStyle = '#fff7ef';
  context.font = `900 ${Math.round(height * 0.125)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  context.fillText('TOP 10', width / 2, height * 0.205);
  context.shadowBlur = 0;

  const gap = width * 0.006;
  const gridX = width * 0.055;
  const gridY = height * 0.33;
  const gridWidth = width * 0.89;
  const cardWidth = (gridWidth - gap * 9) / 10;
  const cardHeight = height * 0.39;

  EVENT_ROOM_TOP_TEN.forEach((track, index) => {
    const x = gridX + index * (cardWidth + gap);
    const active = track.rank === activeTrack.rank;
    roundedRect(context, x, gridY, cardWidth, cardHeight, height * 0.012);
    context.fillStyle = active ? `${track.accent}35` : 'rgba(8, 5, 13, 0.68)';
    context.fill();
    context.lineWidth = active ? Math.max(3, width / 640) : Math.max(1, width / 1300);
    context.strokeStyle = active ? theme.ledSoft : 'rgba(255,255,255,0.22)';
    context.shadowColor = active ? theme.led : 'transparent';
    context.shadowBlur = active ? height * 0.04 : 0;
    context.stroke();
    context.shadowBlur = 0;

    context.fillStyle = '#fff7ef';
    context.font = `800 ${Math.round(height * 0.062)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    context.fillText(String(track.rank), x + cardWidth / 2, gridY + cardHeight * 0.24);

    const barWidth = cardWidth * 0.09;
    const barGap = cardWidth * 0.045;
    const barsWidth = barWidth * 4 + barGap * 3;
    const barsX = x + (cardWidth - barsWidth) / 2;
    const barsBottom = gridY + cardHeight * 0.86;
    for (let bar = 0; bar < 4; bar += 1) {
      const barHeight = cardHeight * (0.18 + ((11 - track.rank + bar) % 5) * 0.055);
      context.fillStyle = active ? theme.ledSoft : theme.led;
      context.globalAlpha = active ? 1 : 0.68;
      context.fillRect(barsX + bar * (barWidth + barGap), barsBottom - barHeight, barWidth, barHeight);
    }
    context.globalAlpha = 1;
  });

  const title = show.phase === 'idle' ? 'WEEKLY TOP 10' : `#${activeTrack.rank} ${activeTrack.title}`;
  const subtitle = show.phase === 'idle' ? theme.label : activeTrack.artist;
  context.fillStyle = '#f4dfca';
  context.font = `600 ${Math.round(height * 0.035)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  context.fillText(`${title}  ·  ${subtitle}`, width / 2, height * 0.865);

  context.fillStyle = theme.ledSoft;
  context.globalAlpha = 0.82;
  context.fillRect(width * 0.15, height * 0.93, width * 0.7, Math.max(2, height * 0.005));
  context.globalAlpha = 1;
}

function useRankingCanvasTexture(
  show: EventRoomShowState,
  theme: EventRoomThemeTokens,
  qualityTier: EventRoomQualityTier,
) {
  const canvas = useMemo(() => {
    const element = document.createElement('canvas');
    const mobileLike = qualityTier !== 'desktop';
    element.width = mobileLike ? 1280 : 1920;
    element.height = mobileLike ? 384 : 576;
    return element;
  }, [qualityTier]);

  const texture = useMemo(() => {
    const nextTexture = new THREE.CanvasTexture(canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.generateMipmaps = false;
    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;
    nextTexture.anisotropy = 4;
    return nextTexture;
  }, [canvas]);

  useLayoutEffect(() => {
    const context = canvas.getContext('2d');
    if (!context) return;
    drawScreenArtwork(context, canvas.width, canvas.height, show, theme);
    // CanvasTexture uploads redrawn pixels only after this explicit Three.js invalidation.
    // eslint-disable-next-line react-hooks/immutability
    texture.needsUpdate = true;
  }, [canvas, show, texture, theme]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export function EventRoomCurvedScreen({
  show,
  theme,
  qualityTier,
  frameMaterial,
}: {
  show: EventRoomShowState;
  theme: EventRoomThemeTokens;
  qualityTier: EventRoomQualityTier;
  frameMaterial: THREE.Material;
}) {
  const segmentCount = qualityTier === 'desktop' ? 48 : 28;
  const screenGeometry = useMemo(
    () => createCurvedPanelGeometry(SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_ARC, segmentCount),
    [segmentCount],
  );
  const frameGeometry = useMemo(
    () => createCurvedPanelGeometry(SCREEN_WIDTH + 0.66, SCREEN_HEIGHT + 0.58, SCREEN_ARC, segmentCount),
    [segmentCount],
  );
  const texture = useRankingCanvasTexture(show, theme, qualityTier);
  const screenSurfaceBinding = useEventRoomScreenSurfaceBinding();

  // Kanał `screenKey` mnoży kolor tego materiału (dolny clamp 0.06), więc ekran
  // ściemnia się razem z salą pomimo `toneMapped={false}` (D8). Wartość startowa
  // odpowiada stanowi `house`, żeby pierwsza klatka nie mignęła pełną jasnością.
  const screenMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    color: new THREE.Color().setScalar(
      eventRoomScreenMultiplier(EVENT_ROOM_LIGHT_STATES.house.screenKey),
    ),
  }), [texture]);

  useLayoutEffect(() => {
    if (!screenSurfaceBinding) return;
    const binding = screenSurfaceBinding;
    // Rejestracja uchwytu w pudełku rigu — jedyny kanał komunikacji z driverem
    // świateł bez re-renderu i bez zmiany EventRoomScreens (poza zakresem Etapu 2).
    // eslint-disable-next-line react-hooks/immutability
    binding.material = screenMaterial;
    return () => {
      if (binding.material === screenMaterial) binding.material = null;
    };
  }, [screenMaterial, screenSurfaceBinding]);

  useEffect(() => () => {
    screenGeometry.dispose();
    frameGeometry.dispose();
    screenMaterial.dispose();
  }, [frameGeometry, screenGeometry, screenMaterial]);

  return (
    <group position={[0, 3.35, -10.3]}>
      <mesh geometry={frameGeometry} position={[0, 0, -0.12]} material={frameMaterial} />
      <mesh geometry={screenGeometry} material={screenMaterial} />
    </group>
  );
}
