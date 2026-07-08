export type EventRoomThemeId = 'rose' | 'galaxy';

export type EventRoomShowPhase =
  | 'idle'
  | 'intro'
  | 'countdown'
  | 'trackReveal'
  | 'finale'
  | 'afterloop';

export type EventRoomQualityTier = 'mobile' | 'desktop' | 'degraded';

export type TopTenTrack = {
  rank: number;
  title: string;
  artist: string;
  accent: string;
};

export type EventRoomThemeTokens = {
  id: EventRoomThemeId;
  label: string;
  background: string;
  floor: string;
  stone: string;
  wood: string;
  woodDark: string;
  metal: string;
  seat: string;
  screenPrimary: string;
  screenSecondary: string;
  led: string;
  ledSoft: string;
  haze: string;
};

export type EventRoomShowState = {
  theme: EventRoomThemeId;
  phase: EventRoomShowPhase;
  currentRank: number;
  isPaused: boolean;
  isHostOverrideActive: boolean;
};

export const EVENT_ROOM_EXIT_ZONE = 'hub';

export const EVENT_ROOM_THEMES: Record<EventRoomThemeId, EventRoomThemeTokens> = {
  rose: {
    id: 'rose',
    label: 'ROSE MODE',
    background: '#120c0d',
    floor: '#151110',
    stone: '#241d1a',
    wood: '#865233',
    woodDark: '#3d271c',
    metal: '#0c0b0b',
    seat: '#241918',
    screenPrimary: '#ff6fb3',
    screenSecondary: '#5a2b3d',
    led: '#f06aa7',
    ledSoft: '#f0bb84',
    haze: '#24110e',
  },
  galaxy: {
    id: 'galaxy',
    label: 'GALAXY MODE',
    background: '#070710',
    floor: '#0d0e12',
    stone: '#151821',
    wood: '#70452a',
    woodDark: '#2e1d14',
    metal: '#08090d',
    seat: '#151722',
    screenPrimary: '#7a5cff',
    screenSecondary: '#20324f',
    led: '#7f6cff',
    ledSoft: '#d7a768',
    haze: '#0d1020',
  },
};

export const EVENT_ROOM_TOP_TEN: TopTenTrack[] = [
  { rank: 10, title: 'Late Night Draft', artist: 'ThreeStyle', accent: '#f59e0b' },
  { rank: 9, title: 'Velvet Signal', artist: 'Mira Vox', accent: '#fb7185' },
  { rank: 8, title: 'Floor Light', artist: 'North Deck', accent: '#38bdf8' },
  { rank: 7, title: 'Amber Loop', artist: 'Kade Bloom', accent: '#f97316' },
  { rank: 6, title: 'Glass Echo', artist: 'Soma Lane', accent: '#a78bfa' },
  { rank: 5, title: 'Afterimage', artist: 'Vanta Club', accent: '#22d3ee' },
  { rank: 4, title: 'Rose Voltage', artist: 'Luma Saint', accent: '#f472b6' },
  { rank: 3, title: 'Orbit Room', artist: 'Cassini FM', accent: '#818cf8' },
  { rank: 2, title: 'Golden Hourline', artist: 'NOVA/NOIR', accent: '#facc15' },
  { rank: 1, title: 'Crown Frequency', artist: 'Freeflow', accent: '#ffffff' },
];

export const INITIAL_EVENT_ROOM_SHOW_STATE: EventRoomShowState = {
  theme: 'rose',
  phase: 'idle',
  currentRank: 10,
  isPaused: false,
  isHostOverrideActive: false,
};
