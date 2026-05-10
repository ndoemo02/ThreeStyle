"use client";

import { useHudStore } from '../stores/useHudStore';
import { useAudioStore } from '../stores/useAudioStore';
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
  const { isOpen, closeHud, activeScreenId, isPlaying, setIsPlaying, camEnabled, setCamEnabled } = useHudStore();
  const camFacingMode = useHudStore((state) => state.camFacingMode);
  const setCamFacingMode = useHudStore((state) => state.setCamFacingMode);
  const setMasterVideoRef = useHudStore((state) => state.setMasterVideoRef);
  const setCamVideoElement = useHudStore((state) => state.setCamVideoElement);
  const setAnalyserNode = useAudioStore((state) => state.setAnalyserNode);
  const setAudioContext = useAudioStore((state) => state.setAudioContext);
  const setIsActive = useAudioStore((state) => state.setIsActive);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);

  // ── Native Web Audio pipeline (created during user gesture) ──────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const videoSourceCreatedRef = useRef(false);
  const audioSourceCreatedRef = useRef(false);

  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Sync camera video element to store after mount (avoids React error #185)
  useEffect(() => {
    if (mounted) setCamVideoElement(camVideoRef.current);
  }, [mounted, setCamVideoElement]);
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
          return item.id === activeMediaId && item.kind === 'video' && item.isVideoDisplayable !== false;
        })
      : false;

    mediaElementRef.current = isVideoActive ? masterVideoElementRef.current : masterAudioElementRef.current;
    setMasterVideoRef(isVideoActive ? masterVideoElementRef.current : null);
  }, [activeMediaId, mediaItems, setMasterVideoRef]);

  // ── Audio pipeline helper (idempotent — call at every play) ──────────
  const ensureAudioPipeline = useCallback((mediaElement: HTMLMediaElement) => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      setAnalyserNode(analyser);
      setAudioContext(ctx);
      console.log('[HUD Audio] Pipeline created. ctx.state:', ctx.state, 'analyserSet:', !!analyser);
    }

    const ctx = audioCtxRef.current;
    ctx.resume();

    // createMediaElementSource must be called once per element
    const isVideo = mediaElement instanceof HTMLVideoElement;
    const alreadyCreated = isVideo ? videoSourceCreatedRef.current : audioSourceCreatedRef.current;
    if (!alreadyCreated) {
      try {
        const source = ctx.createMediaElementSource(mediaElement);
        source.connect(analyserRef.current!);
        if (isVideo) videoSourceCreatedRef.current = true;
        else audioSourceCreatedRef.current = true;
        console.log('[HUD Audio] Source connected for', isVideo ? 'VIDEO' : 'AUDIO');
      } catch (err) {
        console.warn('[HUD Audio] createMediaElementSource FAILED:', err);
      }
    }
  }, [setAnalyserNode, setAudioContext]);

  const playCurrentMedia = useCallback(() => {
    const mediaElement = mediaElementRef.current;
    if (!mediaElement) return;

    ensureAudioPipeline(mediaElement);

    const attempt = () => {
      void mediaElement.play().catch((error: unknown) => {
        const name = (error as Error)?.name;
        if (name === 'AbortError') {
          // Race condition: poprzedni play/pause w toku — retry po chwili
          setTimeout(attempt, 80);
        } else {
          console.warn('HUD media playback was blocked:', error);
          setIsPlaying(false);
        }
      });
    };
    attempt();
  }, [setIsPlaying, ensureAudioPipeline]);

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

    // Ustaw src ręcznie (React mógł nie zaktualizować DOM synchronicznie)
    // i graj gdy gotowe — bez race condition z canplay
    nextMediaElement.currentTime = 0;
    nextMediaElement.src = selectedMedia.src;
    ensureAudioPipeline(nextMediaElement);

    const startPlay = () => {
      void nextMediaElement.play().catch((error: unknown) => {
        const name = (error as Error)?.name;
        if (name === 'AbortError') {
          setTimeout(() => void nextMediaElement.play().catch(() => setIsPlaying(false)), 100);
        } else {
          console.warn('HUD media playback was blocked:', error);
          setIsPlaying(false);
        }
      });
    };

    // Video już załadowane? Graj natychmiast
    if (nextMediaElement.readyState >= 2) {
      startPlay();
    } else {
      // Czekaj na canplay (może odpalić przed load() jeśli src już załadowane)
      nextMediaElement.addEventListener('canplay', () => startPlay(), { once: true });
      // load() odpala ładowanie jeśli src się zmienił; jeśli nie — canplay już poszedł
      nextMediaElement.load();
    }
  }, [activeMediaId, mediaItems, setIsPlaying, togglePlay, ensureAudioPipeline]);

  const activeMedia = mediaItems.find((item) => item.id === activeMediaId) ?? null;
  const statusLabel = libraryStatus === 'loading' ? 'Scanning' : libraryStatus === 'error' ? 'Offline' : 'Session Live';

  const masterMediaEventProps = {
    onTimeUpdate: (event: SyntheticEvent<HTMLMediaElement>) => setCurrentTime(event.currentTarget.currentTime),
    onLoadedMetadata: (event: SyntheticEvent<HTMLMediaElement>) => setDuration(event.currentTarget.duration),
    onPlay: () => { setIsPlaying(true); setIsActive(true); },
    onPause: () => { setIsPlaying(false); setIsActive(false); },
    onEnded: () => { setIsPlaying(false); setIsActive(false); },
  };

  return (
    <>
      {/* Ukryty master player — NIE autoPlay, tylko preload="metadata", odpala się jawnie przez selectAndPlayMedia */}
      {mounted && (
        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 1, height: 1, pointerEvents: 'none', zIndex: -9999, opacity: 0.0001, overflow: 'hidden' }}>
          <video
            ref={masterVideoElementRef}
            src={activeMedia?.kind === 'video' ? activeMedia.src : undefined}
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            loop
            {...masterMediaEventProps}
          />
          <audio
            ref={masterAudioElementRef}
            src={activeMedia?.kind === 'audio' ? activeMedia.src : undefined}
            preload="metadata"
            crossOrigin="anonymous"
            {...masterMediaEventProps}
          />
          <video
            ref={camVideoRef}
            muted
            playsInline
          />
        </div>
      )}

      {/* Główny overlay HUD */}
      <div
        className={`hud-overlay hud-overlay-bg ${isOpen ? 'hud-overlay-open' : 'hud-overlay-closed'}`}
        onClick={closeHud}
      >
        <div className="hud-gradient-layer" />

        <div
          className={`hud-inner ${isMobile ? 'hud-inner-mobile' : 'hud-inner-desktop'}`}
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="hud-header">
            <div className="hud-panel-gradient" />
            <div className="hud-header-row">
              <Thr3StyleHudMark compact className="shrink-0" />
              <div className="hud-header-title-group">
                <p className="hud-header-eyebrow">Laptop Media Session</p>
                <h1 className="hud-header-heading">BLOK TRZECH PIĘTER</h1>
              </div>
              <div className="hud-status-badge">
                <p className="hud-status-label">Status</p>
                <p className="hud-status-value">{statusLabel}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setCamEnabled(!camEnabled); }}
                className="hud-close-btn"
                style={{
                  marginRight: '8px',
                  background: camEnabled ? 'rgba(255,60,60,0.25)' : 'rgba(255,255,255,0.06)',
                  border: camEnabled ? '1px solid rgba(255,60,60,0.5)' : '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {camEnabled ? '📷 ON' : '📷 OFF'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (camEnabled) setCamFacingMode(camFacingMode === 'user' ? 'environment' : 'user'); }}
                className="hud-close-btn"
                style={{
                  marginRight: '8px',
                  background: camEnabled ? 'rgba(0,200,200,0.15)' : 'rgba(255,255,255,0.04)',
                  border: camEnabled ? '1px solid rgba(0,200,200,0.35)' : '1px solid rgba(255,255,255,0.1)',
                  opacity: camEnabled ? 1 : 0.4,
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                }}
              >
                {camFacingMode === 'user' ? 'FRONT' : 'BACK'}
              </button>
              <button onClick={closeHud} className="hud-close-btn">
                Close
              </button>
            </div>
          </div>

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
    node.scrollTo({ left: node.clientWidth * index, behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const nextIndex = Math.round(node.scrollLeft / Math.max(node.clientWidth, 1));
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
    <div className="hud-content">
      <div className="hud-ambient-glow" />

      {/* Pionowe kropki nawigacji (desktop) */}
      <div className="hud-tab-nav">
        {panelLabels.map((label, index) => {
          const isActive = index === activePanelIndex;
          return (
            <button
              key={label}
              type="button"
              onClick={() => jumpToPanel(index)}
              className={`hud-tab-btn ${isActive ? 'hud-tab-btn-active' : ''}`}
            >
              <span className={`hud-tab-label ${isActive ? 'hud-tab-label-active' : ''}`}>
                {label}
              </span>
              <span className={`hud-tab-dot ${isActive ? 'hud-tab-dot-active' : ''}`} />
            </button>
          );
        })}
      </div>

      <div className="hud-content-inner">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="hud-scroll-container"
        >
          {/* Panel 01: Now Playing */}
          <PanelViewport>
          <PanelFrame
            eyebrow="Panel 01"
            title="Now Playing"
            subtitle="A focused playback surface with enough context to keep the room immersive."
            footer={`Swipe for more • ${activePanelIndex + 1}/${panelLabels.length}`}
          >
            <div className="hud-nowplaying-content">
              {/* Video / audio / empty preview card */}
              <div className="hud-nowplaying-card">
                <div className="hud-nowplaying-card-border" />
                {mounted && activeMedia?.kind === 'video' && !isDisplayableVideo(activeMedia) ? (
                  <div className="hud-media-state hud-bg-codec">
                    <div className="hud-media-icon">H</div>
                    <p className="hud-media-eyebrow">Video codec warning</p>
                    <p className="hud-media-title">{activeMedia.title}</p>
                    <p className="hud-media-desc">
                      {activeMedia.compatibilityNote ?? 'Ten plik moze wymagac konwersji do H.264, zeby pokazac obraz w HUD i na ekranie pokoju.'}
                    </p>
                  </div>
                ) : mounted && activeMedia?.kind === 'video' ? (
                  <VideoCanvasPreview masterVideoRef={masterVideoElementRef} activeMediaId={activeMedia.id} onClick={togglePlay} />
                ) : mounted && activeMedia?.kind === 'audio' ? (
                  <div className="hud-media-state hud-bg-audio">
                    <div className="hud-media-icon">A</div>
                    <p className="hud-media-eyebrow">Audio track</p>
                    <p className="hud-media-title">{activeMedia.title}</p>
                  </div>
                ) : mounted ? (
                  <div className="hud-media-state hud-bg-empty">
                    <p className="hud-media-eyebrow" style={{ color: 'rgba(255,255,255,0.36)', letterSpacing: '0.3em' }}>No media found</p>
                    <p className="hud-media-desc" style={{ color: 'rgba(255,255,255,0.46)' }}>Wrzuć pliki do `public/media/video` albo `public/media/audio`, a HUD zaciągnie je automatycznie.</p>
                  </div>
                ) : (
                  <div className="hud-loading-state">Loading viewport</div>
                )}

                {/* Play/Pause overlay — klik w canvas lub panel */}
                {activeMedia && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="hud-play-overlay"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    <div className="hud-play-btn">
                      {isPlaying ? (
                        <span className="hud-play-pause-icon hud-play-pause-icon-pause" />
                      ) : (
                        <span className="hud-play-pause-icon" />
                      )}
                    </div>
                  </button>
                )}
              </div>

              {/* Info card z progress barem */}
              <div className="hud-info-card">
                <div className="hud-info-row">
                  <div style={{ minWidth: 0 }}>
                    <p className="hud-info-eyebrow">{isPlaying ? 'Playing now' : 'Ready to play'}</p>
                    <p className="hud-info-title">{activeMedia?.title ?? 'Media library empty'}</p>
                    <p className="hud-info-meta">
                      {activeMedia ? `${activeMedia.kind.toUpperCase()} • ${formatBytes(activeMedia.size)} • ${formatStamp(activeMedia.modifiedAt)}` : 'Dodaj pliki do biblioteki, aby uruchomić sesję.'}
                    </p>
                  </div>
                  <div className="hud-viz-bars">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <span
                        key={index}
                        className="hud-viz-bar"
                        style={{ height: isPlaying ? `${26 + (index % 5) * 11}%` : '24%' }}
                      />
                    ))}
                  </div>
                </div>
                <div className="hud-progress-track">
                  <div
                    className="hud-progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="hud-progress-times">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </PanelFrame>
        </PanelViewport>

        {/* Panel 02: Vote / Discovery */}
        <PanelViewport>
          <PanelFrame
            eyebrow="Panel 02"
            title="Vote / Discovery"
            subtitle="One decision surface, one action path, no desktop-dashboard clutter."
          >
            <div className="hud-flex-col-gap4">
              <div className="hud-info-card">
                <p className="hud-media-eyebrow" style={{ color: 'rgba(243,160,93,0.78)' }}>Current prompt</p>
                <h2 style={{ marginTop: '12px', fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.04em', color: '#fff' }}>Which media state should guide the room next?</h2>
                <p style={{ marginTop: '12px', fontSize: '14px', lineHeight: 1.5, color: 'rgba(255,255,255,0.56)' }}>
                  Discovery is intentionally reduced to one focused choice so the laptop feels like a cinematic controller, not a dashboard.
                </p>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
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
                        className={`hud-vote-btn ${isSelected ? 'hud-vote-btn-active' : ''}`}
                      >
                        <div className="hud-vote-row">
                          <div style={{ minWidth: 0 }}>
                            <p className="hud-vote-label">Option 0{index + 1}</p>
                            <p className="hud-vote-title">{item.title}</p>
                            <p className="hud-vote-kind">{item.kind === 'video' ? 'Video focus' : 'Audio focus'} • {formatBytes(item.size)}</p>
                          </div>
                          <span className={`hud-vote-badge ${isSelected ? 'hud-vote-badge-active' : 'hud-vote-badge-default'}`}>
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

        {/* Panel 03: Queue / Next */}
        <PanelViewport>
          <PanelFrame
            eyebrow="Panel 03"
            title="Queue / Next"
            subtitle="A thumb-friendly queue surface for moving through the session one media item at a time."
          >
            <div className="hud-flex-col-gap4">
              <div className="hud-info-card">
                <div className="hud-vote-row">
                  <div>
                    <p className="hud-info-eyebrow">Up next</p>
                    <p style={{ marginTop: '8px', fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.88)' }}>{queueItems.length > 0 ? `${queueItems.length} items ready` : 'Queue is empty'}</p>
                  </div>
                  <div className="hud-vote-badge hud-vote-badge-default" style={{ color: 'rgba(255,255,255,0.46)', letterSpacing: '0.24em' }}>
                    Swipe flow
                  </div>
                </div>
              </div>

              <div className="hud-overflow-y hud-space-y-3" style={{ flex: 1, minHeight: 0 }}>
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

        {/* Panel 04: Session / Room State */}
        <PanelViewport>
          <PanelFrame
            eyebrow="Panel 04"
            title="Session / Room State"
            subtitle="Ambient session info that supports the room instead of overpowering it."
          >
            <div style={{ display: 'grid', gap: '16px', flex: 1, minHeight: 0 }}>
              <div className="hud-info-card">
                <p className="hud-media-eyebrow" style={{ color: 'rgba(243,160,93,0.78)' }}>Session status</p>
                <div className="hud-grid-cols2" style={{ marginTop: '16px' }}>
                  {sessionMetrics.map((metric) => (
                    <div key={metric.label} className="hud-metric-card">
                      <p className="hud-metric-label">{metric.label}</p>
                      <p className="hud-metric-value">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hud-info-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <p className="hud-info-eyebrow">Room pulse</p>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.38)' }}>{libraryStatus}</span>
                </div>
                <div style={{ display: 'flex', height: '96px', alignItems: 'flex-end', gap: '2px' }}>
                  {Array.from({ length: 18 }).map((_, index) => (
                    <span
                      key={index}
                      className="hud-pulse-bar"
                      style={{ height: `${30 + ((index * 17) % 55)}%`, opacity: index % 4 === 0 ? 0.95 : 0.72 }}
                    />
                  ))}
                </div>
                <p className="hud-session-desc">
                  Laptop otwiera teraz poziomy, sekwencyjny media flow. Każdy ekran skupia się na jednej funkcji, więc sterowanie jest czytelne nawet na telefonie.
                </p>
              </div>
            </div>
          </PanelFrame>
        </PanelViewport>

        {/* Panel 05: Media Library */}
        <PanelViewport>
          <PanelFrame
            eyebrow="Panel 05"
            title="Media Library"
            subtitle="The full asset list remains available, but inside one focused viewport instead of multiple side modules."
          >
            <div className="hud-flex-col-gap4">
              {libraryStatus === 'error' && libraryError ? (
                <div className="hud-error-banner">{libraryError}</div>
              ) : null}

              <div className="hud-overflow-y hud-space-y-5" style={{ flex: 1, minHeight: 0 }}>
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

        {/* Mobile bottom tabs */}
        {isMobile ? (
          <div className="hud-mobile-tabs-wrap">
            <div className="hud-mobile-tabs">
              {panelLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => jumpToPanel(index)}
                  className={`hud-mobile-tab-dot ${index === activePanelIndex ? 'hud-mobile-tab-dot-active' : ''}`}
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
  return <section className="hud-viewport">{children}</section>;
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
    <div className="hud-frame">
      <div className="hud-panel-gradient" />
      <div className="hud-frame-header">
        <p className="hud-frame-eyebrow">{eyebrow}</p>
        <h2 className="hud-frame-title">{title}</h2>
        <p className="hud-frame-subtitle">{subtitle}</p>
      </div>
      <div className="hud-frame-body">{children}</div>
      {footer ? (
        <div className="hud-frame-footer">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="hud-empty-card">
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
      className="hud-queue-btn"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
        <div className="hud-queue-index">
          0{index + 1}
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="hud-queue-title">{item.title}</p>
          <p className="hud-queue-meta">
            {item.kind} • {formatBytes(item.size)}
          </p>
        </div>
      </div>
      <span className="hud-queue-badge">
        Open
      </span>
    </button>
  );
}

function VideoCanvasPreview({ masterVideoRef, activeMediaId, onClick }: { masterVideoRef: RefObject<HTMLVideoElement | null>; activeMediaId: string; onClick?: () => void }) {
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

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={360}
      className="hud-canvas-preview"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    />
  );
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
      <div className="hud-section-header">
        <p className="hud-library-title">{title}</p>
        <div className="hud-library-divider" />
      </div>
      <div className="hud-space-y-3">
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
                className={`hud-library-item ${isActive ? 'hud-library-item-active' : ''}`}
              >
                <div className="hud-library-item-row">
                  <div style={{ minWidth: 0 }}>
                    <p className="hud-library-item-title">{item.title}</p>
                    <p className="hud-library-item-meta">
                      {item.kind === 'video' ? (item.videoCodec ?? 'unknown') : item.kind} • {formatBytes(item.size)}
                    </p>
                  </div>
                  <span className={`hud-library-badge ${isActive ? 'hud-library-badge-active' : 'hud-library-badge-default'}`}>
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
