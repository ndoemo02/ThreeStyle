"use client";

import { useHudStore } from '../stores/useHudStore';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject, type SyntheticEvent, type UIEvent } from 'react';
import { flushSync } from 'react-dom';
import { Thr3StyleHudMark } from './branding/Thr3StyleHudMark';

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
const panelShellClass = 'relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,19,16,0.78),rgba(7,8,10,0.88))] shadow-[0_30px_120px_rgba(0,0,0,0.5),0_0_24px_rgba(243,160,93,0.08)] backdrop-blur-[24px]';
const panelCardClass = 'relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] shadow-[0_18px_50px_rgba(0,0,0,0.24),0_0_18px_rgba(243,160,93,0.05)] backdrop-blur-xl';

const panelLabels = [
  'Now Playing',
  'Vote / Discovery',
  'Queue / Next',
  'Session / Room',
  'Media Library',
] as const;

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

function formatStamp(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return 'No timestamp';
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
  const masterVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const masterAudioElementRef = useRef<HTMLAudioElement | null>(null);

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

  useEffect(() => {
    const isVideoActive = activeMediaId
      ? mediaItems.some((item) => {
          const match = item.id === activeMediaId && item.kind === 'video' && item.isVideoDisplayable !== false;
          if (item.id === activeMediaId) console.log('[DEBUG HUD] isVideoActive evaluation:', item.id, item.kind, item.isVideoDisplayable, '=>', match);
          return match;
        })
      : false;

    console.log('[DEBUG HUD] Setting masterVideoRef, isVideoActive:', isVideoActive, 'Element:', isVideoActive ? masterVideoElementRef.current : null);
    mediaElementRef.current = isVideoActive ? masterVideoElementRef.current : masterAudioElementRef.current;
    setMasterVideoRef(isVideoActive ? masterVideoElementRef.current : null);
  }, [activeMediaId, mediaItems, setMasterVideoRef]);

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

    flushSync(() => {
      setActiveMediaId(id);
    });

    if (!selectedMedia || (selectedMedia.kind === 'video' && !isDisplayableVideo(selectedMedia))) {
      return;
    }

    const nextMediaElement = selectedMedia.kind === 'video'
      ? masterVideoElementRef.current
      : masterAudioElementRef.current;
    if (!nextMediaElement) return;

    mediaElementRef.current = nextMediaElement;
    console.log('[DEBUG HUD] Playing media:', selectedMedia.kind, 'Element:', nextMediaElement);
    
    nextMediaElement.currentTime = 0;
    nextMediaElement.load();
    void nextMediaElement.play().then(() => {
      console.log('[DEBUG HUD] Media playback started successfully! paused:', nextMediaElement.paused);
    }).catch((error: unknown) => {
      console.warn('HUD media playback was blocked:', error);
      setIsPlaying(false);
    });
  }, [activeMediaId, mediaItems, setIsPlaying, togglePlay]);

  const activeMedia = mediaItems.find((item) => item.id === activeMediaId) ?? null;
  const statusLabel = libraryStatus === 'loading' ? 'Scanning' : libraryStatus === 'error' ? 'Offline' : 'Session Live';
  const visibilityClass = isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none';
  const masterMediaEventProps = {
    onTimeUpdate: (event: SyntheticEvent<HTMLMediaElement>) => setCurrentTime(event.currentTarget.currentTime),
    onLoadedMetadata: (event: SyntheticEvent<HTMLMediaElement>) => setDuration(event.currentTarget.duration),
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onEnded: () => setIsPlaying(false),
  };

  return (
    <>
      {mounted && (
        <div 
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 1, height: 1, pointerEvents: 'none', zIndex: -9999, opacity: 0.0001, overflow: 'hidden' }}
        >
          <video
            ref={masterVideoElementRef}
            src={activeMedia?.kind === 'video' ? activeMedia.src : undefined}
            playsInline
            autoPlay
            preload="auto"
            loop
            className="w-full h-full"
            {...masterMediaEventProps}
          />
          <audio
            ref={masterAudioElementRef}
            src={activeMedia?.kind === 'audio' ? activeMedia.src : undefined}
            preload="auto"
            {...masterMediaEventProps}
          />
        </div>
      )}

      <div
        className={`fixed inset-0 z-50 bg-[radial-gradient(circle_at_top,rgba(243,160,93,0.16),rgba(0,0,0,0.82)_34%,rgba(0,0,0,0.92)_100%)] backdrop-blur-xl transition-opacity duration-300 ${visibilityClass}`}
        onClick={closeHud}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_18%,transparent_84%,rgba(0,0,0,0.26))]" />
        
        <div className={`relative mx-auto flex h-dvh w-full ${isMobile ? 'max-w-full px-3 py-3' : 'max-w-[620px] px-5 py-4'} flex-col`} onClick={(event) => event.stopPropagation()}>
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[60%] -translate-x-1/2 bg-[radial-gradient(circle_at_top,rgba(243,160,93,0.08),transparent_38%)] blur-[100px]" />

        <header className={`${panelShellClass} z-20 mb-3 shrink-0 p-4`}>
          <div className="absolute inset-0 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_18%,transparent_80%,rgba(243,160,93,0.04))] pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <Thr3StyleHudMark compact className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.34em] text-[#f3a05d]/75">Laptop Media Session</p>
              <h1 className="mt-1 truncate text-[1.15rem] font-semibold tracking-[-0.03em] text-white">BLOK TRZECH PIĘTER</h1>
            </div>
            <div className="hidden min-w-[120px] rounded-full border border-white/10 bg-white/6 px-3 py-2 text-right md:block">
              <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">Status</p>
              <p className="mt-1 text-xs font-medium text-white/82">{statusLabel}</p>
            </div>
            <button
              onClick={closeHud}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.26em] text-white/56 transition hover:border-[#f3a05d]/30 hover:text-white"
            >
              Close
            </button>
          </div>
        </header>

        <HudContent
          activeScreenId={activeScreenId}
          activeMedia={activeMedia}
          mediaItems={mediaItems}
          libraryStatus={libraryStatus}
          libraryError={libraryError}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          togglePlay={togglePlay}
          selectAndPlayMedia={selectAndPlayMedia}
          setCurrentTime={setCurrentTime}
          setDuration={setDuration}
          setIsPlaying={setIsPlaying}
          mounted={mounted}
          isMobile={isMobile}
          masterVideoElementRef={masterVideoElementRef}
        />
      </div>
    </div>
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
  selectAndPlayMedia: (id: string) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  mounted: boolean;
  isMobile: boolean;
  masterVideoElementRef: RefObject<HTMLVideoElement | null>;
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
  selectAndPlayMedia,
  mounted,
  isMobile,
  masterVideoElementRef,
}: HudContentProps) {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const videoItems = useMemo(() => mediaItems.filter((item) => item.kind === 'video'), [mediaItems]);
  const audioItems = useMemo(() => mediaItems.filter((item) => item.kind === 'audio'), [mediaItems]);
  const queueItems = useMemo(() => mediaItems.filter((item) => item.id !== activeMedia?.id).slice(0, 6), [activeMedia?.id, mediaItems]);
  const quickVoteItems = useMemo(() => mediaItems.slice(0, 3), [mediaItems]);
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const [selectedVoteId, setSelectedVoteId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const effectiveSelectedVoteId = selectedVoteId ?? activeMedia?.id ?? quickVoteItems[0]?.id ?? null;

  const jumpToPanel = useCallback((index: number) => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.clientHeight * index, behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const nextIndex = Math.round(node.scrollTop / Math.max(node.clientHeight, 1));
    if (nextIndex !== activePanelIndex) {
      setActivePanelIndex(nextIndex);
    }
  }, [activePanelIndex]);

  const sessionMetrics = [
    { label: 'Viewport', value: activeScreenId ?? 'master_catalog' },
    { label: 'Playable', value: `${mediaItems.filter((item) => item.kind === 'video' && item.isVideoDisplayable !== false).length}` },
    { label: 'Audio', value: `${audioItems.length}` },
    { label: 'Library', value: `${mediaItems.length} files` },
  ];

  return (
    <div className="relative min-h-0 flex-1">
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-[80%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(243,160,93,0.14),transparent_62%)] blur-[90px]" />

      <div className="absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 md:flex md:flex-col md:gap-2">
        {panelLabels.map((label, index) => {
          const isActive = index === activePanelIndex;
          return (
            <button
              key={label}
              type="button"
              onClick={() => jumpToPanel(index)}
              className={`group flex items-center justify-end gap-2 ${isActive ? 'opacity-100' : 'opacity-55 hover:opacity-90'}`}
            >
              <span className={`max-w-0 overflow-hidden text-[10px] uppercase tracking-[0.24em] text-white/60 transition-all group-hover:max-w-[120px] ${isActive ? 'max-w-[120px] text-[#f3a05d]' : ''}`}>
                {label}
              </span>
              <span className={`h-2.5 w-2.5 rounded-full border ${isActive ? 'border-[#f3a05d] bg-[#f3a05d] shadow-[0_0_16px_rgba(243,160,93,0.9)]' : 'border-white/22 bg-white/10'}`} />
            </button>
          );
        })}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <PanelViewport>
          <PanelFrame
            eyebrow="Panel 01"
            title="Now Playing"
            subtitle="A focused playback surface with enough context to keep the room immersive."
            footer={`Swipe for more • ${activePanelIndex + 1}/${panelLabels.length}`}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className={`${panelCardClass} group relative min-h-0 flex-1 overflow-hidden`}>
                <div className="absolute inset-0 rounded-[26px] border border-white/10 pointer-events-none" />
                {mounted && activeMedia?.kind === 'video' && !isDisplayableVideo(activeMedia) ? (
                  <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(243,160,93,0.14),rgba(0,0,0,0.92)_64%)] px-8 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#f3a05d]/24 bg-white/6 text-2xl font-semibold text-[#f3a05d]">
                      H
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#f3a05d]/78">Video codec warning</p>
                    <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">{activeMedia.title}</p>
                    <p className="mt-3 max-w-[320px] text-sm leading-6 text-white/55">
                      {activeMedia.compatibilityNote ?? 'Ten plik moze wymagac konwersji do H.264, zeby pokazac obraz w HUD i na ekranie pokoju.'}
                    </p>
                  </div>
                ) : mounted && activeMedia?.kind === 'video' ? (
                  <VideoCanvasPreview masterVideoRef={masterVideoElementRef} activeMediaId={activeMedia.id} />
                ) : mounted && activeMedia?.kind === 'audio' ? (
                  <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_center,rgba(243,160,93,0.18),rgba(0,0,0,0.9)_62%)] px-8 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#f3a05d]/28 bg-white/6 text-2xl font-semibold text-[#f3a05d]">
                      A
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-[#f3a05d]/78">Audio track</p>
                    <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">{activeMedia.title}</p>
                  </div>
                ) : mounted ? (
                  <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(243,160,93,0.08),rgba(0,0,0,0.94)_62%)] px-8 text-center">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/36">No media found</p>
                    <p className="mt-3 max-w-[320px] text-sm leading-6 text-white/46">Wrzuć pliki do `public/media/video` albo `public/media/audio`, a HUD zaciągnie je automatycznie.</p>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center bg-black text-[10px] uppercase tracking-[0.24em] text-white/24">Loading viewport</div>
                )}

                {activeMedia && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-100 transition group-hover:bg-black/26"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/14 bg-white/10 shadow-[0_0_35px_rgba(243,160,93,0.16)] backdrop-blur-md">
                      {isPlaying ? (
                        <span className="h-5 w-5 border-l-[6px] border-r-[6px] border-white" />
                      ) : (
                        <span className="ml-1 h-0 w-0 border-y-[11px] border-y-transparent border-l-[17px] border-l-white" />
                      )}
                    </div>
                  </button>
                )}
              </div>

              <div className={`${panelCardClass} p-5`}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">{isPlaying ? 'Playing now' : 'Ready to play'}</p>
                    <p className="mt-2 truncate text-[1.15rem] font-semibold tracking-[-0.03em] text-white">{activeMedia?.title ?? 'Media library empty'}</p>
                    <p className="mt-2 text-sm text-white/52">
                      {activeMedia ? `${activeMedia.kind.toUpperCase()} • ${formatBytes(activeMedia.size)} • ${formatStamp(activeMedia.modifiedAt)}` : 'Dodaj pliki do biblioteki, aby uruchomić sesję.'}
                    </p>
                  </div>
                  <div className="flex h-10 items-end gap-1 opacity-80">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <span
                        key={index}
                        className="w-1.5 rounded-full bg-[linear-gradient(180deg,rgba(255,241,227,0.92),rgba(243,160,93,0.42))]"
                        style={{ height: isPlaying ? `${26 + (index % 5) * 11}%` : '24%' }}
                      />
                    ))}
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(243,160,93,0.88),rgba(255,241,227,0.96))]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/40">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </PanelFrame>
        </PanelViewport>

        <PanelViewport>
          <PanelFrame
            eyebrow="Panel 02"
            title="Vote / Discovery"
            subtitle="One decision surface, one action path, no desktop-dashboard clutter."
          >
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className={`${panelCardClass} p-5`}>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#f3a05d]/78">Current prompt</p>
                <h2 className="mt-3 text-[1.35rem] font-semibold tracking-[-0.04em] text-white">Which media state should guide the room next?</h2>
                <p className="mt-3 text-sm leading-6 text-white/56">
                  Discovery is intentionally reduced to one focused choice so the laptop feels like a cinematic controller, not a dashboard.
                </p>
              </div>

              <div className="grid gap-3">
                {quickVoteItems.length === 0 ? (
                  <EmptyCard message="Brak mediów do panelu discovery." />
                ) : (
                  quickVoteItems.map((item, index) => {
                    const isSelected = item.id === effectiveSelectedVoteId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedVoteId(item.id);
                          selectAndPlayMedia(item.id);
                        }}
                        className={`relative overflow-hidden rounded-[24px] border p-4 text-left transition ${
                          isSelected
                            ? 'border-[#f3a05d]/34 bg-[linear-gradient(180deg,rgba(243,160,93,0.16),rgba(255,255,255,0.05))] shadow-[0_18px_42px_rgba(243,160,93,0.08)]'
                            : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] hover:bg-white/8'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Option 0{index + 1}</p>
                            <p className="mt-2 truncate text-base font-medium text-white/92">{item.title}</p>
                            <p className="mt-2 text-sm text-white/50">{item.kind === 'video' ? 'Video focus' : 'Audio focus'} • {formatBytes(item.size)}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${isSelected ? 'bg-white/12 text-[#f3a05d]' : 'bg-white/6 text-white/48'}`}>
                            {isSelected ? 'Active' : 'Select'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </PanelFrame>
        </PanelViewport>

        <PanelViewport>
          <PanelFrame
            eyebrow="Panel 03"
            title="Queue / Next"
            subtitle="A thumb-friendly queue surface for moving through the session one media item at a time."
          >
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className={`${panelCardClass} p-5`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">Up next</p>
                    <p className="mt-2 text-base font-medium text-white/88">{queueItems.length > 0 ? `${queueItems.length} items ready` : 'Queue is empty'}</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-white/46">
                    Vertical flow
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {queueItems.length === 0 ? (
                  <EmptyCard message="Brak kolejnych pozycji. Dodaj więcej plików do biblioteki." />
                ) : (
                  queueItems.map((item, index) => (
                    <QueueRow
                      key={item.id}
                      index={index}
                      item={item}
                      onSelect={selectAndPlayMedia}
                    />
                  ))
                )}
              </div>
            </div>
          </PanelFrame>
        </PanelViewport>

        <PanelViewport>
          <PanelFrame
            eyebrow="Panel 04"
            title="Session / Room State"
            subtitle="Ambient session info that supports the room instead of overpowering it."
          >
            <div className="grid min-h-0 flex-1 gap-4">
              <div className={`${panelCardClass} p-5`}>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#f3a05d]/78">Session status</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {sessionMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-[22px] border border-white/8 bg-black/14 p-4">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/38">{metric.label}</p>
                      <p className="mt-2 truncate text-base font-medium text-white/88">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${panelCardClass} p-5`}>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">Room pulse</p>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-white/38">{libraryStatus}</span>
                </div>
                <div className="flex h-24 items-end gap-2">
                  {Array.from({ length: 18 }).map((_, index) => (
                    <span
                      key={index}
                      className="flex-1 rounded-full bg-[linear-gradient(180deg,rgba(255,244,232,0.92),rgba(243,160,93,0.4))]"
                      style={{ height: `${30 + ((index * 17) % 55)}%`, opacity: index % 4 === 0 ? 0.95 : 0.72 }}
                    />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-white/54">
                  Laptop otwiera teraz pionowy, sekwencyjny media flow. Każdy ekran skupia się na jednej funkcji, więc sterowanie jest czytelne nawet na telefonie.
                </p>
              </div>
            </div>
          </PanelFrame>
        </PanelViewport>

        <PanelViewport>
          <PanelFrame
            eyebrow="Panel 05"
            title="Media Library"
            subtitle="The full asset list remains available, but inside one focused viewport instead of multiple side modules."
          >
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              {libraryStatus === 'error' && libraryError ? (
                <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                  {libraryError}
                </div>
              ) : null}

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                <LibrarySection
                  title="Video Assets"
                  emptyText="Brak filmów w public/media/video."
                  items={videoItems}
                  activeMediaId={activeMedia?.id ?? null}
                  isPlaying={isPlaying}
                  onSelect={selectAndPlayMedia}
                />
                <LibrarySection
                  title="Audio Assets"
                  emptyText="Brak audio w public/media/audio."
                  items={audioItems}
                  activeMediaId={activeMedia?.id ?? null}
                  isPlaying={isPlaying}
                  onSelect={selectAndPlayMedia}
                />
              </div>
            </div>
          </PanelFrame>
        </PanelViewport>
        </div>

        {isMobile ? (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(8,9,11,0.72)] px-3 py-2 backdrop-blur-xl">
              {panelLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => jumpToPanel(index)}
                  className={`h-2.5 rounded-full transition-all ${index === activePanelIndex ? 'w-7 bg-[#f3a05d]' : 'w-2.5 bg-white/20'}`}
                  aria-label={label}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PanelViewport({ children }: { children: React.ReactNode }) {
  return <section className="flex h-full snap-start flex-col pb-3">{children}</section>;
}

interface PanelFrameProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  footer?: string;
  children: React.ReactNode;
}

function PanelFrame({ eyebrow, title, subtitle, footer, children }: PanelFrameProps) {
  return (
    <div className={`${panelShellClass} flex h-full flex-col p-5 pb-16 md:pb-5`}>
      <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_18%,transparent_80%,rgba(243,160,93,0.04))]" />
      <div className="relative mb-4 shrink-0">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#f3a05d]/76">{eyebrow}</p>
        <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.04em] text-white">{title}</h2>
        <p className="mt-2 max-w-[420px] text-sm leading-6 text-white/54">{subtitle}</p>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
      {footer ? (
        <div className="relative mt-4 shrink-0 border-t border-white/8 pt-3 text-[10px] uppercase tracking-[0.24em] text-white/34">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className={`${panelCardClass} p-4 text-sm text-white/42`}>
      {message}
    </div>
  );
}

function QueueRow({
  index,
  item,
  onSelect,
}: {
  index: number;
  item: HudMediaItem;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`${panelCardClass} flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-white/8`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-white/6 text-sm font-medium text-white/82">
          0{index + 1}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/92">{item.title}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/38">
            {item.kind} • {formatBytes(item.size)}
          </p>
        </div>
      </div>
      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/50">
        Open
      </span>
    </button>
  );
}

function VideoCanvasPreview({ masterVideoRef, activeMediaId }: { masterVideoRef: RefObject<HTMLVideoElement | null>; activeMediaId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      if (masterVideoRef.current && canvasRef.current && masterVideoRef.current.readyState >= 2) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(masterVideoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    };
    renderLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [masterVideoRef, activeMediaId]);

  return <canvas ref={canvasRef} width={640} height={360} className="h-full w-full object-cover" />;
}

interface LibrarySectionProps {
  title: string;
  emptyText: string;
  items: HudMediaItem[];
  activeMediaId: string | null;
  isPlaying: boolean;
  onSelect: (id: string) => void;
}

function LibrarySection({ title, emptyText, items, activeMediaId, isPlaying, onSelect }: LibrarySectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-white/42">{title}</p>
        <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(255,255,255,0.12),rgba(243,160,93,0.14),transparent)]" />
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyCard message={emptyText} />
        ) : (
          items.map((item) => {
            const isActive = item.id === activeMediaId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`relative w-full overflow-hidden rounded-[24px] border p-4 text-left transition ${
                  isActive
                    ? 'border-[#f3a05d]/34 bg-[linear-gradient(180deg,rgba(243,160,93,0.14),rgba(255,255,255,0.05))] shadow-[0_18px_40px_rgba(243,160,93,0.08)]'
                    : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] hover:bg-white/8'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white/92">{item.title}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/38">
                      {item.kind === 'video' ? (item.videoCodec ?? 'unknown') : item.kind} • {formatBytes(item.size)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${isActive ? 'bg-white/12 text-[#f3a05d]' : 'bg-white/6 text-white/48'}`}>
                    {isActive ? (isPlaying ? 'Playing' : 'Ready') : 'Open'}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
