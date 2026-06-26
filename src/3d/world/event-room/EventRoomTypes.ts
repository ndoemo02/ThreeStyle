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
    background: '#160f12',
    floor: '#171313',
    stone: '#201a18',
    wood: '#7a462a',
    woodDark: '#3a2117',
    metal: '#0c0b0b',
    seat: '#211617',
    screenPrimary: '#ff6fb3',
    screenSecondary: '#ffb1d2',
    led: '#ff8abf',
    ledSoft: '#d5a06b',
    haze: '#2b111d',
  },
  galaxy: {
    id: 'galaxy',
    label: 'GALAXY MODE',
    background: '#070710',
    floor: '#101116',
    stone: '#171923',
    wood: '#6b3f25',
    woodDark: '#2c1a12',
    metal: '#08090d',
    seat: '#151722',
    screenPrimary: '#7a5cff',
    screenSecondary: '#28b8ff',
    led: '#8f7aff',
    ledSoft: '#2fb7ff',
    haze: '#0b1028',
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
