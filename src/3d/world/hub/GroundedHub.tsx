"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { shouldUseMobileRoomProfileInBrowser } from '../../../lib/deviceProfile';
import { LeftWingCorridor } from '../corridors/LeftWingCorridor';
import { HubShell } from './HubShell';
import { getInitialLobbyQuality, getLobbyAreaLights, type LobbyQualityProfile } from './lobbyConfig';
import { useLobbyMaterials } from './LobbyMaterials';
import { LobbyPerformanceGovernor } from './LobbyPerformanceGovernor';
import { SceneReadySignal } from '../../systems/SceneReadySignal';

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
  onReady,
}: {
  isMobile: boolean;
  quality: LobbyQualityProfile;
  onQualityChange: (quality: LobbyQualityProfile) => void;
  onEnterRoom: (id: string) => void;
  onReady?: () => void;
}) {
  const materials = useLobbyMaterials(isMobile, quality);
  const restoreDpr = useMemo(() => {
    if (typeof window === 'undefined') return isMobile ? 1 : 1.5;
    return Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5);
  }, [isMobile]);

  const lights = getLobbyAreaLights(quality.lightCount);

  return (
    <group>
      <LobbyPerformanceGovernor quality={quality} restoreDpr={restoreDpr} onDegrade={onQualityChange} />
      <hemisphereLight args={['#f1ede5', '#242321', isMobile ? 0.95 : 0.85]} />
      <ambientLight color="#ece5d9" intensity={isMobile ? 0.3 : 0.24} />
      {lights.map(light => (
        <rectAreaLight
          key={light.position.join(':')}
          color="#ffe4c4"
          intensity={light.intensity}
          width={light.width}
          height={light.height}
          position={light.position}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ))}
      <HubShell materials={materials} planterCount={quality.planterCount} low={quality.id.endsWith('-low')} />
      <LeftWingCorridor materials={materials} onEnterRoom={onEnterRoom} />
      <SceneReadySignal onReady={onReady} />
    </group>
  );
}

export function GroundedHub({ onEnterRoom, onReady }: { onEnterRoom?: (id: string) => void; onReady?: () => void }) {
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
        onReady={onReady}
      />
    </Suspense>
  );
}
