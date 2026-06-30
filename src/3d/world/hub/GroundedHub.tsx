"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { shouldUseMobileRoomProfileInBrowser } from '../../../lib/deviceProfile';
import { LeftWingCorridor } from '../corridors/LeftWingCorridor';
import { HubShell } from './HubShell';
import { getInitialLobbyQuality, type LobbyQualityProfile } from './lobbyConfig';
import { useLobbyMaterials } from './LobbyMaterials';
import { LobbyPerformanceGovernor } from './LobbyPerformanceGovernor';

function LobbyFallback() {
  return (
    <group>
      <hemisphereLight args={['#ffe4c4', '#211a16', 0.8]} />
      <mesh position={[-12, -0.04, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[58, 28]} />
        <meshStandardMaterial color="#2a2521" roughness={0.72} metalness={0.05} />
      </mesh>
    </group>
  );
}

function LobbyScene({
  isMobile,
  quality,
  onQualityChange,
  onEnterRoom,
}: {
  isMobile: boolean;
  quality: LobbyQualityProfile;
  onQualityChange: (quality: LobbyQualityProfile) => void;
  onEnterRoom: (id: string) => void;
}) {
  const materials = useLobbyMaterials(isMobile, quality);
  const restoreDpr = useMemo(() => {
    if (typeof window === 'undefined') return isMobile ? 1 : 1.5;
    return Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5);
  }, [isMobile]);

  const lights = [
    { position: [0, 4.35, 0] as [number, number, number], width: 12, height: 7, intensity: 3.8 },
    { position: [-18, 4.35, -5] as [number, number, number], width: 10, height: 5, intensity: 3.4 },
    { position: [-32, 4.35, -5] as [number, number, number], width: 10, height: 5, intensity: 3.2 },
  ];

  return (
    <group>
      <LobbyPerformanceGovernor quality={quality} restoreDpr={restoreDpr} onDegrade={onQualityChange} />
      <hemisphereLight args={['#ffe8cf', '#2b211b', isMobile ? 1.05 : 0.92]} />
      <ambientLight color="#ffd9b5" intensity={isMobile ? 0.34 : 0.28} />
      {lights.slice(0, quality.lightCount).map(light => (
        <rectAreaLight
          key={light.position.join(':')}
          color="#ffd2a4"
          intensity={light.intensity}
          width={light.width}
          height={light.height}
          position={light.position}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ))}
      <HubShell materials={materials} planterCount={quality.planterCount} />
      <LeftWingCorridor materials={materials} onEnterRoom={onEnterRoom} />
    </group>
  );
}

export function GroundedHub({ onEnterRoom }: { onEnterRoom?: (id: string) => void }) {
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && shouldUseMobileRoomProfileInBrowser()
  ));
  const [quality, setQuality] = useState<LobbyQualityProfile>(() => getInitialLobbyQuality(isMobile));

  useEffect(() => {
    const check = () => {
      const nextMobile = shouldUseMobileRoomProfileInBrowser();
      setIsMobile(current => {
        if (current !== nextMobile) setQuality(getInitialLobbyQuality(nextMobile));
        return nextMobile;
      });
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleQualityChange = useCallback((nextQuality: LobbyQualityProfile) => {
    setQuality(current => current.id.endsWith('-low') ? current : nextQuality);
  }, []);

  const handleEnterRoom = useCallback((id: string) => onEnterRoom?.(id), [onEnterRoom]);

  return (
    <Suspense fallback={<LobbyFallback />}>
      <LobbyScene
        isMobile={isMobile}
        quality={quality}
        onQualityChange={handleQualityChange}
        onEnterRoom={handleEnterRoom}
      />
    </Suspense>
  );
}
