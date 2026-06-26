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
