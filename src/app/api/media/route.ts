import { NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type MediaKind = 'video' | 'audio';
type VideoCodec = 'h264' | 'hevc' | 'av1' | 'vp9' | 'mpeg4' | 'unknown';

type MediaItem = {
  id: string;
  kind: MediaKind;
  title: string;
  src: string;
  size: number;
  modifiedAt: string;
  videoCodec?: VideoCodec;
  isVideoDisplayable?: boolean;
  compatibilityNote?: string;
};

const MEDIA_ROOT = path.join(process.cwd(), 'public', 'media');
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogv']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.opus']);

function getMediaKind(filePath: string): MediaKind | null {
  const extension = path.extname(filePath).toLowerCase();

  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio';

  return null;
}

function toPublicUrl(relativeFilePath: string): string {
  return `/media/${relativeFilePath.split(path.sep).map(encodeURIComponent).join('/')}`;
}

function toTitle(fileName: string): string {
  return path.basename(fileName, path.extname(fileName)).replace(/[_-]+/g, ' ').trim();
}

async function detectVideoCompatibility(filePath: string): Promise<Pick<MediaItem, 'videoCodec' | 'isVideoDisplayable' | 'compatibilityNote'>> {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.webm') {
    return { videoCodec: 'vp9', isVideoDisplayable: true };
  }

  const fileBytes = await readFile(filePath);
  const fileText = fileBytes.toString('latin1');

  if (fileText.includes('hvc1') || fileText.includes('hev1')) {
    return {
      videoCodec: 'hevc',
      isVideoDisplayable: false,
      compatibilityNote: 'HEVC/H.265 moze grac jako samo audio w Chrome/VideoTexture. Konwertuj do H.264 (avc1).',
    };
  }

  if (fileText.includes('avc1') || fileText.includes('avc3')) {
    return { videoCodec: 'h264', isVideoDisplayable: true };
  }

  if (fileText.includes('av01')) {
    return { videoCodec: 'av1', isVideoDisplayable: true };
  }

  if (fileText.includes('vp09') || fileText.includes('VP90') || fileText.includes('VP80')) {
    return { videoCodec: 'vp9', isVideoDisplayable: true };
  }

  if (fileText.includes('mp4v')) {
    return {
      videoCodec: 'mpeg4',
      isVideoDisplayable: false,
      compatibilityNote: 'MPEG-4 Visual moze nie wyswietlac obrazu w przegladarce. Konwertuj do H.264 (avc1).',
    };
  }

  return {
    videoCodec: 'unknown',
    isVideoDisplayable: false,
    compatibilityNote: 'Nie rozpoznano kodeka video. Najbezpieczniej uzyc MP4 H.264 (avc1) + AAC.',
  };
}

function sortMedia(first: MediaItem, second: MediaItem): number {
  if (first.kind !== second.kind) return first.kind === 'video' ? -1 : 1;

  if (first.kind === 'video' && second.kind === 'video') {
    const firstPlayable = first.isVideoDisplayable === true;
    const secondPlayable = second.isVideoDisplayable === true;
    if (firstPlayable !== secondPlayable) return firstPlayable ? -1 : 1;
  }

  return first.title.localeCompare(second.title, 'pl', { sensitivity: 'base' });
}

async function readMediaDirectory(directory: string, baseDirectory = directory): Promise<MediaItem[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const items = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith('.')) return [];

      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return readMediaDirectory(fullPath, baseDirectory);
      }

      if (!entry.isFile()) return [];

      const kind = getMediaKind(entry.name);
      if (!kind) return [];

      const metadata = await stat(fullPath);
      const relativeFilePath = path.relative(baseDirectory, fullPath);
      const normalizedId = relativeFilePath.split(path.sep).join('/');
      const videoCompatibility = kind === 'video' ? await detectVideoCompatibility(fullPath) : {};

      return [{
        id: `${kind}:${normalizedId}`,
        kind,
        title: toTitle(entry.name),
        src: toPublicUrl(relativeFilePath),
        size: metadata.size,
        modifiedAt: metadata.mtime.toISOString(),
        ...videoCompatibility,
      } satisfies MediaItem];
    }),
  );

  return items.flat();
}

export async function GET() {
  try {
    const items = await readMediaDirectory(MEDIA_ROOT);
    const sortedItems = items.toSorted(sortMedia);

    return NextResponse.json(
      {
        items: sortedItems,
        videos: sortedItems.filter((item) => item.kind === 'video'),
        audio: sortedItems.filter((item) => item.kind === 'audio'),
        scannedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return NextResponse.json({ items: [], videos: [], audio: [], scannedAt: new Date().toISOString() });
    }

    console.error('Failed to scan HUD media library:', error);
    return NextResponse.json(
      { error: 'Failed to scan media library' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
