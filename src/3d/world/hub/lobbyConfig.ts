export const LOBBY_CEILING_HEIGHT = 4.8;

export type LobbyDoorStatus = 'active' | 'locked' | 'offline';

export type LobbyDoorConfig = {
  id: string;
  label: string;
  status: LobbyDoorStatus;
  users: number;
  position: [number, number, number];
  rotationY: number;
};

export const LOBBY_DOORS: LobbyDoorConfig[] = [
  { id: 'room-2', label: 'LOFI BEATS', status: 'active', users: 8, position: [-19, 0, -1.1], rotationY: Math.PI },
  { id: 'room-3', label: 'PODCAST 1', status: 'locked', users: 0, position: [-14, 0, -8.9], rotationY: 0 },
  { id: 'room-4', label: 'PRIVATE', status: 'offline', users: 0, position: [-19, 0, -8.9], rotationY: 0 },
  { id: 'room-6', label: 'CHILLOUT', status: 'active', users: 5, position: [-34, 0, -1.1], rotationY: Math.PI },
  { id: 'room-7', label: 'MIX ROOM', status: 'locked', users: 1, position: [-29, 0, -8.9], rotationY: 0 },
  { id: 'room-8', label: 'ARCHIVE', status: 'offline', users: 0, position: [-34, 0, -8.9], rotationY: 0 },
];

export type LobbyQualityId = 'desktop' | 'desktop-low' | 'mobile' | 'mobile-low';

export type LobbyQualityProfile = {
  id: LobbyQualityId;
  dpr: number;
  lightCount: number;
  planterCount: number;
  useNormalMaps: boolean;
};

const DESKTOP_QUALITY: LobbyQualityProfile = {
  id: 'desktop',
  dpr: 1.25,
  lightCount: 3,
  planterCount: 3,
  useNormalMaps: true,
};

const DESKTOP_LOW_QUALITY: LobbyQualityProfile = {
  id: 'desktop-low',
  dpr: 1,
  lightCount: 2,
  planterCount: 2,
  useNormalMaps: true,
};

const MOBILE_QUALITY: LobbyQualityProfile = {
  id: 'mobile',
  dpr: 1,
  lightCount: 2,
  planterCount: 2,
  useNormalMaps: true,
};

const MOBILE_LOW_QUALITY: LobbyQualityProfile = {
  id: 'mobile-low',
  dpr: 0.75,
  lightCount: 1,
  planterCount: 1,
  useNormalMaps: false,
};

export function getInitialLobbyQuality(isMobile: boolean): LobbyQualityProfile {
  return isMobile ? MOBILE_QUALITY : DESKTOP_QUALITY;
}

export function getDegradedLobbyQuality(profile: LobbyQualityProfile): LobbyQualityProfile {
  if (profile.id === 'mobile') return MOBILE_LOW_QUALITY;
  if (profile.id === 'desktop') return DESKTOP_LOW_QUALITY;
  return profile;
}

export function shouldDegradeLobbyQuality(
  profile: LobbyQualityProfile,
  averageFps: number,
  belowThresholdMs: number,
): boolean {
  if (profile.id.endsWith('-low') || belowThresholdMs < 3_000) return false;
  const fpsFloor = profile.id === 'mobile' ? 25 : 50;
  return averageFps < fpsFloor;
}

export type LobbyPerformanceSample = {
  warmupSeconds: number;
  elapsedSeconds: number;
  frames: number;
  belowThresholdMs: number;
};

export function createLobbyPerformanceSample(): LobbyPerformanceSample {
  return { warmupSeconds: 0, elapsedSeconds: 0, frames: 0, belowThresholdMs: 0 };
}

/** Background gaps and asset warm-up do not represent sustainable rendering speed. */
export function sampleLobbyPerformance(
  profile: LobbyQualityProfile,
  sample: LobbyPerformanceSample,
  delta: number,
  hidden: boolean,
): { sample: LobbyPerformanceSample; degrade: boolean } {
  if (hidden || !Number.isFinite(delta) || delta <= 0 || delta > 1) {
    return { sample: createLobbyPerformanceSample(), degrade: false };
  }
  if (profile.id.endsWith('-low')) return { sample, degrade: false };
  const next = { ...sample, warmupSeconds: sample.warmupSeconds + delta };
  if (next.warmupSeconds < 6) return { sample: next, degrade: false };
  next.elapsedSeconds += delta;
  next.frames += 1;
  if (next.elapsedSeconds < 0.5) return { sample: next, degrade: false };
  const fps = next.frames / next.elapsedSeconds;
  const floor = profile.id === 'mobile' ? 25 : 50;
  next.belowThresholdMs = fps < floor ? next.belowThresholdMs + next.elapsedSeconds * 1000 : 0;
  const degrade = shouldDegradeLobbyQuality(profile, fps, next.belowThresholdMs);
  next.elapsedSeconds = next.frames = 0;
  return { sample: next, degrade };
}

export type LobbyAreaLight = {
  position: [number, number, number];
  width: number;
  height: number;
  intensity: number;
};

/** Every quality tier illuminates the entire route, including the end of the corridor. */
export function getLobbyAreaLights(count: number): LobbyAreaLight[] {
  if (count <= 1) {
    return [{ position: [-13, 4.3, -2], width: 54, height: 18, intensity: 1.8 }];
  }
  const lobby: LobbyAreaLight = { position: [0, 4.3, 0], width: 20, height: 16, intensity: 2.8 };
  if (count === 2) {
    return [lobby, { position: [-25, 4.3, -5], width: 29, height: 7, intensity: 2.6 }];
  }
  return [
    lobby,
    { position: [-18, 4.3, -5], width: 15, height: 7, intensity: 2.8 },
    { position: [-32, 4.3, -5], width: 15, height: 7, intensity: 2.6 },
  ];
}
