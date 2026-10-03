export type CreatorMediaKind = 'audio' | 'video';
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface CreatorMediaItem {
  id: string;
  kind: CreatorMediaKind;
  title: string;
  src: string;
  size: number;
  local?: boolean;
  isVideoDisplayable?: boolean;
  compatibilityNote?: string;
}

export const MAX_SESSION_FILE_BYTES = 200 * 1024 * 1024;
const audioExtensions = /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i;
const videoExtensions = /\.(mp4|webm|mov|m4v|ogv)$/i;

export function inspectSessionFile(file: { name: string; size: number; type: string }):
  { kind: CreatorMediaKind; error?: never } | { kind?: never; error: string } {
  if (!file.size) return { error: 'Ten plik jest pusty.' };
  if (file.size > MAX_SESSION_FILE_BYTES) return { error: 'Wybierz plik do 200 MB.' };
  if (file.type.startsWith('audio/') || audioExtensions.test(file.name)) return { kind: 'audio' };
  if (file.type.startsWith('video/') || videoExtensions.test(file.name)) return { kind: 'video' };
  return { error: 'Wybierz plik audio lub wideo.' };
}

export function mergeCreatorLibrary(catalog: CreatorMediaItem[], session: CreatorMediaItem[]) {
  return [...session, ...catalog.filter(item => !session.some(local => local.id === item.id))];
}

export function formatMediaTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}
