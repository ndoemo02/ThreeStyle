"use client";

import { useHudStore } from '../stores/useHudStore';
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { flushSync } from 'react-dom';

type MediaKind = 'video' | 'audio';

type HudMediaItem = {
  id: string;
  kind: MediaKind;
  title: string;
  src: string;
  size: number;
  modifiedAt: string;
  videoCodec?: 'h264' | 'hevc' | 'av1' | 'vp9' | 'mpeg4' | 'unknown';
  isVideoDisplayable?: boolean;
  compatibilityNote?: string;
};

type MediaLibraryResponse = {
  items?: HudMediaItem[];
  videos?: HudMediaItem[];
  audio?: HudMediaItem[];
};

type LibraryStatus = 'loading' | 'ready' | 'error';

const MEDIA_REFRESH_MS = 8000;

function isDisplayableVideo(item: HudMediaItem) {
  return item.kind === 'video' && item.isVideoDisplayable !== false;
}

function pickDefaultMedia(items: HudMediaItem[]) {
  return items.find(isDisplayableVideo) ?? items.find((item) => item.kind === 'video') ?? items[0] ?? null;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

function formatTime(time: number) {
  if (!Number.isFinite(time)) return '00:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getMediaItems(response: MediaLibraryResponse) {
  if (Array.isArray(response.items)) return response.items;
  return [...(response.videos ?? []), ...(response.audio ?? [])];
}

export function HudOverlay() {
  const { isOpen, closeHud, activeScreenId, isPlaying, setIsPlaying } = useHudStore();
  const setMasterVideoRef = useHudStore((state) => state.setMasterVideoRef);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mediaItems, setMediaItems] = useState<HudMediaItem[]>([]);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>('loading');
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const mediaElementRef = useRef<HTMLMediaElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadMediaLibrary = useCallback(async () => {
    try {
      const response = await fetch('/api/media', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Media scan failed with ${response.status}`);
      }

      const payload = (await response.json()) as MediaLibraryResponse;
      const nextItems = getMediaItems(payload);

      setMediaItems(nextItems);
      setActiveMediaId((currentId) => {
        if (currentId && nextItems.some((item) => item.id === currentId)) return currentId;
        return pickDefaultMedia(nextItems)?.id ?? null;
      });
      setLibraryStatus('ready');
      setLibraryError(null);
    } catch (error: unknown) {
      console.error('HUD media library failed to load:', error);
      setLibraryStatus('error');
      setLibraryError('Nie moge odczytac public/media. Sprawdz folder i odswiez HUD.');
    }
  }, []);

  useEffect(() => {
    void loadMediaLibrary();
  }, [loadMediaLibrary]);

  useEffect(() => {
    if (!isOpen) return;

    void loadMediaLibrary();
    const refreshId = window.setInterval(() => {
      void loadMediaLibrary();
    }, MEDIA_REFRESH_MS);

    return () => window.clearInterval(refreshId);
  }, [isOpen, loadMediaLibrary]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || window.matchMedia('(pointer: coarse)').matches);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [activeMediaId]);

  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    if (node) {
      mediaElementRef.current = node;
      setMasterVideoRef(node);
      return;
    }

    if (mediaElementRef.current instanceof HTMLVideoElement) {
      mediaElementRef.current = null;
    }
    setMasterVideoRef(null);
  }, [setMasterVideoRef]);

  const audioCallbackRef = useCallback((node: HTMLAudioElement | null) => {
    if (node) {
      mediaElementRef.current = node;
      return;
    }

    if (mediaElementRef.current instanceof HTMLAudioElement) {
      mediaElementRef.current = null;
    }
    setMasterVideoRef(null);
  }, [setMasterVideoRef]);

  const playCurrentMedia = useCallback(() => {
    const mediaElement = mediaElementRef.current;
    if (!mediaElement) return;

    void mediaElement.play().catch((error: unknown) => {
      console.warn('HUD media playback was blocked:', error);
      setIsPlaying(false);
    });
  }, [setIsPlaying]);

  const togglePlay = useCallback(() => {
    const mediaElement = mediaElementRef.current;
    if (!mediaElement) return;

    if (isPlaying) {
      mediaElement.pause();
      return;
    }

    playCurrentMedia();
  }, [isPlaying, playCurrentMedia]);

  const selectAndPlayMedia = useCallback((id: string) => {
    const selectedMedia = mediaItems.find((item) => item.id === id);

    if (id === activeMediaId) {
      if (selectedMedia && isDisplayableVideo(selectedMedia)) {
        togglePlay();
      }
      return;
    }

    const previousMediaElement = mediaElementRef.current;
    previousMediaElement?.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    // Keep play() inside the click gesture even when React has to swap video/audio nodes.
    flushSync(() => {
      setActiveMediaId(id);
    });

    if (!selectedMedia || (selectedMedia.kind === 'video' && !isDisplayableVideo(selectedMedia))) {
      return;
    }

    const nextMediaElement = mediaElementRef.current;
    if (!nextMediaElement) return;

    nextMediaElement.currentTime = 0;
    nextMediaElement.load();
    playCurrentMedia();
  }, [activeMediaId, mediaItems, playCurrentMedia, setIsPlaying, togglePlay]);

  const activeMedia = mediaItems.find((item) => item.id === activeMediaId) ?? null;

  const hudContentProps = {
    activeScreenId,
    activeMedia,
    mediaItems,
    libraryStatus,
    libraryError,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    videoCallbackRef,
    audioCallbackRef,
    selectAndPlayMedia,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    mounted,
  };

  const visibilityClass = isOpen
    ? 'opacity-100 pointer-events-auto'
    : 'opacity-0 pointer-events-none';

  return (
    <>
      {isMobile ? (
        <div
          className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl transition-opacity duration-300 flex flex-col ${visibilityClass}`}
        >
          <div className="flex justify-end p-6 pb-0 z-50 shrink-0">
            <button onClick={closeHud} className="text-white/40 hover:text-white font-mono text-xs">
              [X] CLOSE
            </button>
          </div>
          <div
            className={`flex-1 w-full p-6 pt-2 flex flex-col font-sans overflow-y-auto transform transition-transform duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
          >
            <HudContent {...hudContentProps} />
          </div>
        </div>
      ) : (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-end pr-8 bg-black/40 transition-opacity duration-300 ${visibilityClass}`}
          onClick={closeHud}
        >
          <div
            className={`w-[560px] h-[90vh] bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_40px_rgba(255,140,66,0.15)] flex flex-col font-sans shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button onClick={closeHud} className="absolute top-6 right-6 text-white/40 hover:text-white font-mono text-xs z-50">
              [X] CLOSE
            </button>
            <HudContent {...hudContentProps} />
          </div>
        </div>
      )}
    </>
  );
}

interface HudContentProps {
  activeScreenId: string | null;
  activeMedia: HudMediaItem | null;
  mediaItems: HudMediaItem[];
  libraryStatus: LibraryStatus;
  libraryError: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  togglePlay: () => void;
  videoCallbackRef: (node: HTMLVideoElement | null) => void;
  audioCallbackRef: (node: HTMLAudioElement | null) => void;
  selectAndPlayMedia: (id: string) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  mounted: boolean;
}

function HudContent({
  activeScreenId,
  activeMedia,
  mediaItems,
  libraryStatus,
  libraryError,
  isPlaying,
  currentTime,
  duration,
  togglePlay,
  videoCallbackRef,
  audioCallbackRef,
  selectAndPlayMedia,
  setCurrentTime,
  setDuration,
  setIsPlaying,
  mounted,
}: HudContentProps) {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const videoItems = mediaItems.filter((item) => item.kind === 'video');
  const audioItems = mediaItems.filter((item) => item.kind === 'audio');

  const mediaEventProps = {
    onTimeUpdate: (event: SyntheticEvent<HTMLMediaElement>) => setCurrentTime(event.currentTarget.currentTime),
    onLoadedMetadata: (event: SyntheticEvent<HTMLMediaElement>) => setDuration(event.currentTarget.duration),
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onEnded: () => setIsPlaying(false),
  };

  return (
    <div className="h-full flex flex-col relative w-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2" />

      <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-300 rounded-xl flex items-center justify-center font-black text-3xl text-black shadow-lg">
            3S
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-md">MEDIA HUD</h1>
            <p className="text-orange-400 text-xs font-mono tracking-widest mt-1">
              AUTO SCAN // {activeScreenId ?? 'MASTER'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-mono text-[10px] border border-green-500/30 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {libraryStatus === 'loading' ? 'SCAN' : `${mediaItems.length} FILES`}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-start w-full relative mb-6 overflow-y-auto pr-1">
        <div className="w-full aspect-video bg-black/60 rounded-xl overflow-hidden shadow-xl border border-white/10 relative group">
          {mounted && activeMedia?.kind === 'video' && !isDisplayableVideo(activeMedia) ? (
            <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(251,146,60,0.18),rgba(0,0,0,0.92)_62%)] flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-2xl border border-orange-300/30 bg-orange-400/10 flex items-center justify-center mb-5 shadow-[0_0_45px_rgba(249,115,22,0.18)]">
                <span className="text-2xl font-black text-orange-200">H265</span>
              </div>
              <p className="text-orange-200 text-[10px] font-mono tracking-[0.3em] uppercase mb-2">Audio-only risk</p>
              <p className="text-white font-black text-lg tracking-tight line-clamp-2">{activeMedia.title}</p>
              <p className="text-white/45 text-xs mt-3 max-w-[360px]">{activeMedia.compatibilityNote ?? 'Ten plik moze wymagac konwersji do H.264 (avc1), zeby pokazac obraz w HUD i na ekranie 3D.'}</p>
            </div>
          ) : mounted && activeMedia?.kind === 'video' ? (
            <video
              key={activeMedia.id}
              id="room-master-video"
              ref={videoCallbackRef}
              src={activeMedia.src}
              playsInline
              preload="metadata"
              loop
              className="w-full h-full object-cover transition-opacity duration-500"
              {...mediaEventProps}
            />
          ) : mounted && activeMedia?.kind === 'audio' ? (
            <div className="w-full h-full bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.24),rgba(0,0,0,0.9)_62%)] flex flex-col items-center justify-center text-center p-8">
              <audio
                key={activeMedia.id}
                ref={audioCallbackRef}
                src={activeMedia.src}
                preload="metadata"
                {...mediaEventProps}
              />
              <div className="w-20 h-20 rounded-2xl border border-orange-300/30 bg-orange-400/10 flex items-center justify-center mb-5 shadow-[0_0_45px_rgba(249,115,22,0.22)]">
                <span className="text-3xl font-black text-orange-200">A</span>
              </div>
              <p className="text-white/40 text-[10px] font-mono tracking-[0.3em] uppercase mb-2">Audio Track</p>
              <p className="text-white font-black text-xl tracking-tight line-clamp-2">{activeMedia.title}</p>
            </div>
          ) : mounted ? (
            <div className="w-full h-full bg-black flex flex-col items-center justify-center font-mono text-[10px] text-white/30 gap-2 px-8 text-center">
              <span>NO MEDIA FOUND</span>
              <span className="text-white/20">Wrzu? pliki do public/media/video albo public/media/audio.</span>
            </div>
          ) : (
            <div className="w-full h-full bg-black flex items-center justify-center font-mono text-[10px] text-white/20">LOADING VIEWPORT...</div>
          )}

          {activeMedia && (
            <div
              className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl">
                {isPlaying ? (
                  <span className="w-4 h-4 border-l-4 border-r-4 border-white" />
                ) : (
                  <span className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-5">
          <MediaSection
            title="Video Assets"
            emptyText="Brak filmow w public/media/video."
            items={videoItems}
            activeMediaId={activeMedia?.id ?? null}
            isPlaying={isPlaying}
            onSelect={selectAndPlayMedia}
          />
          <MediaSection
            title="Audio Assets"
            emptyText="Brak audio w public/media/audio."
            items={audioItems}
            activeMediaId={activeMedia?.id ?? null}
            isPlaying={isPlaying}
            onSelect={selectAndPlayMedia}
          />
          {libraryStatus === 'error' && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200 font-mono">
              {libraryError}
            </p>
          )}
        </div>
      </div>

      <div className="bg-black/50 rounded-xl border border-white/5 p-5 mt-2 shrink-0 relative overflow-hidden">
        <div className="flex items-center justify-between z-10 relative">
          <div className="min-w-0">
            <p className="text-white/40 font-mono text-[10px] tracking-[0.2em] mb-1">{isPlaying ? 'NOW PLAYING' : 'PAUSED'}</p>
            <p className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200 drop-shadow-md truncate">
              {activeMedia?.title ?? 'Media library empty'}
            </p>
          </div>
          <div className="flex items-end h-8 gap-0.5 z-10 opacity-80 shrink-0 pl-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="w-1 bg-orange-500 rounded-t-sm transition-all duration-300"
                style={{ height: isPlaying ? `${20 + (index % 5) * 15}%` : '20%' }}
              />
            ))}
          </div>
        </div>

        <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden z-10 relative">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-300 relative transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-mono text-white/40 z-10 relative">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

interface MediaSectionProps {
  title: string;
  emptyText: string;
  items: HudMediaItem[];
  activeMediaId: string | null;
  isPlaying: boolean;
  onSelect: (id: string) => void;
}

function MediaSection({ title, emptyText, items, activeMediaId, isPlaying, onSelect }: MediaSectionProps) {
  return (
    <section>
      <p className="text-white/40 text-xs font-mono tracking-widest uppercase mb-3">{title}</p>
      <div className="flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="border border-white/5 bg-white/[0.03] rounded-xl p-4 text-xs text-white/30 font-mono">
            {emptyText}
          </div>
        ) : (
          items.map((item) => {
            const isActive = item.id === activeMediaId;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`flex items-center justify-between border p-4 rounded-xl transition group text-left ${
                  isActive
                    ? 'bg-orange-500/15 border-orange-300/30 shadow-[0_0_28px_rgba(249,115,22,0.12)]'
                    : item.kind === 'video' && !isDisplayableVideo(item)
                      ? 'bg-white/[0.03] hover:bg-orange-500/10 border-orange-300/15'
                      : 'bg-white/5 hover:bg-white/10 border-white/5'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex justify-center items-center transition shrink-0 ${isActive ? 'bg-orange-500' : 'bg-orange-500/20 group-hover:bg-orange-500'}`}>
                    {isActive && isPlaying ? (
                      <span className="w-3 h-3 border-l-4 border-r-4 border-white ml-[1px]" />
                    ) : (
                      <span className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[8px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold tracking-wide text-sm truncate">{item.title}</p>
                    <p className="text-white/40 text-[10px] mt-1 font-mono uppercase">
                      {item.kind === 'video' ? (item.videoCodec ?? 'unknown') : item.kind} / {formatBytes(item.size)}
                    </p>
                  </div>
                </div>
                <span className="text-orange-300 font-mono text-[10px] opacity-0 group-hover:opacity-100 transition pl-3 shrink-0">
                  {item.kind === 'video' && !isDisplayableVideo(item) ? 'H.264?' : isActive ? (isPlaying ? 'PAUSE' : 'PLAY') : 'PLAY'}
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
