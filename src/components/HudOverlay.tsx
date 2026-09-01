"use client";

import { useHudStore } from '../stores/useHudStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject, type UIEvent } from 'react';
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
  bpm?: number;
  artist?: string;
  votes?: number;
  winRate?: number;
  rank?: number;
  category?: string;
};

type MediaLibraryResponse = {
  items?: HudMediaItem[];
  videos?: HudMediaItem[];
  audio?: HudMediaItem[];
};

type LibraryStatus = 'loading' | 'ready' | 'error';

const MEDIA_REFRESH_MS = 30000;

const panelLabels = [
  'Now Playing',
  'Battles & Vote',
  'Drop & Upload',
  'Top 10 Charts',
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
  if (Number.isNaN(date.getTime())) return 'Nowy drop';
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getMediaItems(response: MediaLibraryResponse): HudMediaItem[] {
  if (Array.isArray(response.items)) return response.items;
  return [...(response.videos ?? []), ...(response.audio ?? [])];
}

// ── Mock Initial Battle & Charts Data ──
const INITIAL_BATTLES = [
  {
    id: 'battle-01',
    round: '1/4 Finals',
    category: '#Freestyle',
    trackA: {
      id: 'a1',
      alias: 'Unknown MC #1',
      title: 'Neon Cypher 04',
      bpm: 94,
      votes: 142,
      score: 64,
    },
    trackB: {
      id: 'b1',
      alias: 'Unknown MC #2',
      title: 'Raw Concrete 808',
      bpm: 96,
      votes: 80,
      score: 36,
    }
  }
];

const INITIAL_CHARTS: HudMediaItem[] = [
  {
    id: 'chart-1',
    rank: 1,
    title: '3Style Championship Anthem',
    artist: 'ShadowFlow MC',
    bpm: 92,
    votes: 1240,
    winRate: 88,
    category: 'Freestyle',
    kind: 'audio',
    src: '/media/audio/anthem.mp3',
    size: 5.4 * 1024 * 1024,
    modifiedAt: new Date().toISOString(),
  },
  {
    id: 'chart-2',
    rank: 2,
    title: 'Midnight Drum & 808s',
    artist: 'VocalBooth God',
    bpm: 140,
    votes: 980,
    winRate: 82,
    category: 'Trap',
    kind: 'audio',
    src: '/media/audio/trap808.mp3',
    size: 4.8 * 1024 * 1024,
    modifiedAt: new Date().toISOString(),
  },
  {
    id: 'chart-3',
    rank: 3,
    title: 'Golden Mic Session #9',
    artist: 'Lil Verse',
    bpm: 90,
    votes: 750,
    winRate: 76,
    category: 'BoomBap',
    kind: 'audio',
    src: '/media/audio/session9.mp3',
    size: 6.1 * 1024 * 1024,
    modifiedAt: new Date().toISOString(),
  },
  {
    id: 'chart-4',
    rank: 4,
    title: 'Studio Identity Drop',
    artist: 'Andruia Beatmaker',
    bpm: 95,
    votes: 620,
    winRate: 71,
    category: 'Freestyle',
    kind: 'audio',
    src: '/media/audio/drop.mp3',
    size: 3.9 * 1024 * 1024,
    modifiedAt: new Date().toISOString(),
  },
  {
    id: 'chart-5',
    rank: 5,
    title: 'Warsaw Nights Flow',
    artist: 'Kolektyw 3S',
    bpm: 128,
    votes: 510,
    winRate: 68,
    category: 'Drill',
    kind: 'audio',
    src: '/media/audio/warsaw.mp3',
    size: 4.2 * 1024 * 1024,
    modifiedAt: new Date().toISOString(),
  }
];

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
  const camStreamRef = useRef<MediaStream | null>(null);

  // ── Native Web Audio pipeline ──────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const videoSourceCreatedRef = useRef(false);
  const audioSourceCreatedRef = useRef(false);

  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Sync camera and master video element to store after mount (prevents re-render loop)
  useEffect(() => {
    if (mounted) {
      setCamVideoElement(camVideoRef.current);
      setMasterVideoRef(masterVideoRef.current);
    }
  }, [mounted, setCamVideoElement, setMasterVideoRef]);

  useEffect(() => {
    return () => {
      camStreamRef.current?.getTracks().forEach((track) => track.stop());
      camStreamRef.current = null;
      setCamVideoElement(null);
      setMasterVideoRef(null);
    };
  }, [setCamVideoElement, setMasterVideoRef]);

  const stopCameraPreview = useCallback(() => {
    camStreamRef.current?.getTracks().forEach((track) => track.stop());
    camStreamRef.current = null;
    const video = camVideoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  const startCameraPreview = useCallback(async (facingMode = camFacingMode) => {
    const video = camVideoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) return false;

    stopCameraPreview();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      camStreamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      setCamVideoElement(video);
      return true;
    } catch (error) {
      console.warn('[SelfieCam] HUD camera start failed:', error);
      camStreamRef.current = null;
      setCamEnabled(false);
      return false;
    }
  }, [camFacingMode, setCamEnabled, setCamVideoElement, stopCameraPreview]);

  const [mediaItems, setMediaItems] = useState<HudMediaItem[]>([]);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>('loading');
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const masterVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const updateMobile = () => setIsMobile(mediaQuery.matches || window.innerWidth < 900);
    updateMobile();
    window.addEventListener('resize', updateMobile);
    return () => window.removeEventListener('resize', updateMobile);
  }, []);

  // Fetch media library
  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      try {
        const response = await fetch('/api/media', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as MediaLibraryResponse;
        if (cancelled) return;
        const nextItems = getMediaItems(data);
        setMediaItems(nextItems);
        setLibraryStatus('ready');
        setLibraryError(null);

        setActiveMediaId((currentId) => {
          if (currentId && nextItems.some((item) => item.id === currentId)) return currentId;
          return pickDefaultMedia(nextItems)?.id ?? null;
        });
      } catch (err: any) {
        if (cancelled) return;
        setLibraryStatus('error');
        setLibraryError(err?.message ?? 'Failed to load media');
      }
    }

    void loadMedia();
    const interval = setInterval(() => void loadMedia(), MEDIA_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const activeMedia = useMemo(
    () => mediaItems.find((item) => item.id === activeMediaId) ?? pickDefaultMedia(mediaItems),
    [activeMediaId, mediaItems],
  );

  const activeMediaRef = useRef<HudMediaItem | null>(activeMedia);
  activeMediaRef.current = activeMedia;

  const initAudioPipeline = useCallback(() => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') void audioCtxRef.current.resume();
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      setAudioContext(ctx);
      setAnalyserNode(analyser);
      setIsActive(true);

      const video = masterVideoRef.current;
      if (video && !videoSourceCreatedRef.current) {
        try {
          const vSrc = ctx.createMediaElementSource(video);
          vSrc.connect(analyser);
          analyser.connect(ctx.destination);
          videoSourceCreatedRef.current = true;
        } catch (e) {
          console.warn('[HudAudio] Video element source attach failed:', e);
        }
      }

      const audio = masterAudioRef.current;
      if (audio && !audioSourceCreatedRef.current) {
        try {
          const aSrc = ctx.createMediaElementSource(audio);
          aSrc.connect(analyser);
          analyser.connect(ctx.destination);
          audioSourceCreatedRef.current = true;
        } catch (e) {
          console.warn('[HudAudio] Audio element source attach failed:', e);
        }
      }
    } catch (e) {
      console.warn('[HudAudio] Web Audio initialization failed:', e);
    }
  }, [setAnalyserNode, setAudioContext, setIsActive]);

  const togglePlay = useCallback(async () => {
    initAudioPipeline();
    const media = activeMediaRef.current;
    if (!media) return;

    const el = media.kind === 'video' ? masterVideoRef.current : masterAudioRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      try {
        await el.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('[HUD] Playback error:', err);
      }
    }
  }, [initAudioPipeline, isPlaying, setIsPlaying]);

  const selectAndPlayMedia = useCallback((id: string) => {
    initAudioPipeline();
    const item = mediaItems.find((m) => m.id === id);
    if (!item) return;

    if (item.kind === 'video' && masterAudioRef.current) {
      masterAudioRef.current.pause();
    }
    if (item.kind === 'audio' && masterVideoRef.current) {
      masterVideoRef.current.pause();
    }

    setActiveMediaId(id);
    setIsPlaying(true);

    requestAnimationFrame(async () => {
      const el = item.kind === 'video' ? masterVideoRef.current : masterAudioRef.current;
      if (el) {
        try {
          el.currentTime = 0;
          await el.play();
        } catch (err) {
          console.warn('[HUD] Autoplay error:', err);
        }
      }
    });
  }, [initAudioPipeline, mediaItems, setIsPlaying]);

  const handleToggleCam = useCallback(async () => {
    if (camEnabled) {
      stopCameraPreview();
      setCamEnabled(false);
    } else {
      const success = await startCameraPreview(camFacingMode);
      if (success) {
        setCamEnabled(true);
      }
    }
  }, [camEnabled, camFacingMode, setCamEnabled, startCameraPreview, stopCameraPreview]);

  return (
    <div className={`hud-overlay ${isOpen ? 'hud-overlay-open' : 'hud-overlay-closed'}`}>
      <div className="hud-overlay-bg" />
      <div className="hud-gradient-layer" />

      {/* Hidden Master Media Elements for Web Audio & 3D Video Texture */}
      <video
        ref={masterVideoRef}
        src={activeMedia?.kind === 'video' ? activeMedia.src : undefined}
        playsInline
        crossOrigin="anonymous"
        loop
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.001, pointerEvents: 'none' }}
      />
      <audio
        ref={masterAudioRef}
        src={activeMedia?.kind === 'audio' ? activeMedia.src : undefined}
        loop
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        style={{ display: 'none' }}
      />
      <video
        ref={camVideoRef}
        playsInline
        muted
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.001, pointerEvents: 'none' }}
      />

      <div className={`hud-inner ${isMobile ? 'hud-inner-mobile' : 'hud-inner-desktop'}`}>
        {/* HUD Master Header */}
        <header className="hud-header">
          <div className="hud-panel-gradient" />
          <div className="hud-header-row">
            <Thr3StyleHudMark />
            <div className="hud-header-title-group">
              <p className="hud-header-eyebrow">Studio Deck • 3S Arena</p>
              <h1 className="hud-header-heading">{activeMedia?.title ?? 'Creator Studio Live'}</h1>
            </div>
            <div className="hud-status-badge">
              <p className="hud-status-label">Studio State</p>
              <p className="hud-status-value">{camEnabled ? '📹 Wall Cam Live' : isPlaying ? '⚡ Studio Wall 4K' : 'Ready'}</p>
            </div>
            <button type="button" onClick={closeHud} className="hud-close-btn" aria-label="Close Studio HUD">
              ESC / Zamknij
            </button>
          </div>
        </header>

        {/* 4 Modular Studio Tabs Content */}
        <HudModularContent
          isHudOpen={isOpen}
          activeMedia={activeMedia}
          mediaItems={mediaItems}
          libraryStatus={libraryStatus}
          libraryError={libraryError}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          togglePlay={togglePlay}
          selectAndPlayMedia={selectAndPlayMedia}
          mounted={mounted}
          isMobile={isMobile}
          masterVideoElementRef={masterVideoRef}
          camEnabled={camEnabled}
          onToggleCam={handleToggleCam}
          analyserRef={analyserRef}
        />
      </div>
    </div>
  );
}

interface HudModularContentProps {
  isHudOpen: boolean;
  activeMedia?: HudMediaItem | null;
  mediaItems: HudMediaItem[];
  libraryStatus: LibraryStatus;
  libraryError: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  togglePlay: () => void;
  selectAndPlayMedia: (id: string) => void;
  mounted: boolean;
  isMobile: boolean;
  masterVideoElementRef: RefObject<HTMLVideoElement | null>;
  camEnabled: boolean;
  onToggleCam: () => void;
  analyserRef: RefObject<AnalyserNode | null>;
}

function HudModularContent({
  isHudOpen,
  activeMedia,
  mediaItems,
  libraryStatus,
  isPlaying,
  currentTime,
  duration,
  togglePlay,
  selectAndPlayMedia,
  mounted,
  isMobile,
  masterVideoElementRef,
  camEnabled,
  onToggleCam,
  analyserRef,
}: HudModularContentProps) {
  const [activePanelIndex, setActivePanelIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const jumpToPanel = useCallback((index: number) => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ left: node.clientWidth * index, behavior: 'smooth' });
    setActivePanelIndex(index);
  }, []);

  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const nextIndex = Math.round(node.scrollLeft / Math.max(node.clientWidth, 1));
    if (nextIndex !== activePanelIndex) {
      setActivePanelIndex(nextIndex);
    }
  }, [activePanelIndex]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Hype reactions feedback state
  const [activeHypeEmoji, setActiveHypeEmoji] = useState<string | null>(null);
  const triggerHype = (emoji: string) => {
    setActiveHypeEmoji(emoji);
    setTimeout(() => setActiveHypeEmoji(null), 900);
  };

  // Battles State
  const [battles, setBattles] = useState(INITIAL_BATTLES);
  const [selectedVotedTrack, setSelectedVotedTrack] = useState<'A' | 'B' | null>(null);
  const [flowScore, setFlowScore] = useState(8);
  const [lyricsScore, setLyricsScore] = useState(9);
  const [vibeScore, setVibeScore] = useState(8);
  const [voteSubmitted, setVoteSubmitted] = useState(false);

  // Drop & Upload State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('#Freestyle');
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [wallPreviewActive, setWallPreviewActive] = useState(false);

  // Top 10 Charts State
  const [chartFilter, setChartFilter] = useState<'today' | 'weekly' | 'alltime'>('weekly');
  const [chartsList] = useState(INITIAL_CHARTS);

  return (
    <div className="hud-content">
      <div className="hud-ambient-glow" />

      {/* Desktop Top/Side Tab Selector */}
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
        <div ref={scrollRef} onScroll={handleScroll} className="hud-scroll-container">

          {/* ══════════════════════════════════════════════════════════════════════
              PANEL 01: NOW PLAYING & FREESTYLE ARENA
              ══════════════════════════════════════════════════════════════════════ */}
          <PanelViewport>
            <PanelFrame
              eyebrow="Panel 01 • Master Desk"
              title="Now Playing & Freestyle"
              subtitle="Interaktywny panel odsłuchu studyjnego, reakcji live oraz transmisji na ścianę 3D."
            >
              <div className="hud-nowplaying-content">
                {/* 4K Preview / Visualizer Card */}
                <div className="hud-nowplaying-card">
                  <div className="hud-nowplaying-card-border" />
                  {activeMedia?.kind === 'video' ? (
                    <VideoCanvasPreview
                      masterVideoRef={masterVideoElementRef}
                      activeMediaId={activeMedia.id}
                      isActive={isHudOpen && activePanelIndex === 0}
                      isPlaying={isPlaying}
                      onClick={togglePlay}
                    />
                  ) : (
                    <AudioWaveformVisualizer
                      analyserRef={analyserRef}
                      isPlaying={isPlaying}
                      onClick={togglePlay}
                    />
                  )}

                  {/* Play/Pause Overlay */}
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

                  {/* Hype Emoji Pop Overlay */}
                  {activeHypeEmoji && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) scale(1.5)',
                      fontSize: '48px',
                      pointerEvents: 'none',
                      animation: 'bounce 0.6s ease-out',
                      textShadow: '0 0 20px rgba(243,160,93,0.8)'
                    }}>
                      {activeHypeEmoji}
                    </div>
                  )}
                </div>

                {/* Info & Live Scrubber Bar */}
                <div className="hud-info-card">
                  <div className="hud-info-row">
                    <div style={{ minWidth: 0 }}>
                      <p className="hud-info-eyebrow">{isPlaying ? '🔥 Playing on Studio Wall' : 'Studio Standby'}</p>
                      <p className="hud-info-title">{activeMedia?.title ?? '3Style Master Track'}</p>
                      <p className="hud-info-meta">
                        {activeMedia ? `${activeMedia.kind.toUpperCase()} • ${formatBytes(activeMedia.size)} • ${formatStamp(activeMedia.modifiedAt)}` : 'Dodaj beat do biblioteki.'}
                      </p>
                    </div>
                    <div className="hud-viz-bars">
                      {Array.from({ length: 12 }).map((_, index) => (
                        <span
                          key={index}
                          className="hud-viz-bar"
                          style={{ height: isPlaying ? `${28 + (index % 5) * 14}%` : '20%' }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="hud-progress-track">
                    <div className="hud-progress-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="hud-progress-times">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Live Camera Broadcast & Hype Reactions Bar */}
                <div className="hud-cam-switch">
                  <div>
                    <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)' }}>Studio Wall Source</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>
                      {camEnabled ? 'Kamera Live (Selfie / Booth)' : 'Master Track 4K Visualizer'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleCam}
                    className={`hud-cam-toggle-btn ${camEnabled ? 'hud-cam-toggle-on' : 'hud-cam-toggle-off'}`}
                  >
                    {camEnabled ? '● Cam Active' : 'Enable Cam'}
                  </button>
                </div>

                {/* Hype Reaction Triggers */}
                <div className="hud-reaction-bar">
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', paddingLeft: '8px' }}>HYPE:</span>
                  <button type="button" onClick={() => triggerHype('🔥')} className="hud-reaction-btn">🔥 Fire</button>
                  <button type="button" onClick={() => triggerHype('👑')} className="hud-reaction-btn">👑 Bars</button>
                  <button type="button" onClick={() => triggerHype('🌊')} className="hud-reaction-btn">🌊 Flow</button>
                  <button type="button" onClick={() => triggerHype('🔁')} className="hud-reaction-btn">🔁 Rewind</button>
                </div>
              </div>
            </PanelFrame>
          </PanelViewport>

          {/* ══════════════════════════════════════════════════════════════════════
              PANEL 02: COMMUNITY BATTLES & BLIND VOTING
              ══════════════════════════════════════════════════════════════════════ */}
          <PanelViewport>
            <PanelFrame
              eyebrow="Panel 02 • Arena Battles"
              title="Community Blind Battles"
              subtitle="Głosuj bezstronnie na flow, rymy i technikę. Nazwiska artystów ujawniane po głosowaniu!"
            >
              <div className="hud-flex-col-gap4">
                <div className="hud-info-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="hud-blind-badge">🔒 Blind Voting Mode</span>
                    <span style={{ fontSize: '11px', color: 'rgba(243,160,93,0.85)', fontWeight: 600 }}>1/4 Finals • #Freestyle</span>
                  </div>
                  <p style={{ marginTop: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                    Posłuchaj 20-sekundowego fragmentu obu zwrotek i oceń bez uprzedzeń.
                  </p>
                </div>

                {/* 1v1 Battle Cards */}
                <div className="hud-battle-container">
                  {/* Track A */}
                  <div
                    onClick={() => setSelectedVotedTrack('A')}
                    className={`hud-battle-card ${selectedVotedTrack === 'A' ? 'hud-battle-card-selected' : ''}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f3a05d' }}>TRACK A</span>
                      {selectedVotedTrack === 'A' && <span style={{ fontSize: '11px', color: '#fff' }}>✓ Wybrany</span>}
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: '6px' }}>
                      {voteSubmitted ? 'ShadowFlow MC' : 'Zawodnik A (Anonimowy)'}
                    </h3>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>94 BPM • BoomBap</p>
                    {voteSubmitted && (
                      <div className="hud-vote-bar">
                        <div className="hud-vote-bar-fill" style={{ width: '64%' }} />
                      </div>
                    )}
                  </div>

                  {/* Track B */}
                  <div
                    onClick={() => setSelectedVotedTrack('B')}
                    className={`hud-battle-card ${selectedVotedTrack === 'B' ? 'hud-battle-card-selected' : ''}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f3a05d' }}>TRACK B</span>
                      {selectedVotedTrack === 'B' && <span style={{ fontSize: '11px', color: '#fff' }}>✓ Wybrany</span>}
                    </div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: '6px' }}>
                      {voteSubmitted ? 'RawConcrete 808' : 'Zawodnik B (Anonimowy)'}
                    </h3>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>96 BPM • Trap</p>
                    {voteSubmitted && (
                      <div className="hud-vote-bar">
                        <div className="hud-vote-bar-fill" style={{ width: '36%', background: '#718096' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Voting Sliders */}
                <div className="hud-info-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                        <span>🌊 Flow & Rytmika:</span>
                        <strong style={{ color: '#f3a05d' }}>{flowScore}/10</strong>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={flowScore}
                        onChange={(e) => setFlowScore(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#f3a05d' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                        <span>✍️ Rymy & Punchlines:</span>
                        <strong style={{ color: '#f3a05d' }}>{lyricsScore}/10</strong>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={lyricsScore}
                        onChange={(e) => setLyricsScore(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#f3a05d' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                        <span>⚡ Energia & Delivery:</span>
                        <strong style={{ color: '#f3a05d' }}>{vibeScore}/10</strong>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={vibeScore}
                        onChange={(e) => setVibeScore(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#f3a05d' }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!selectedVotedTrack || voteSubmitted}
                  onClick={() => setVoteSubmitted(true)}
                  className="hud-primary-action-btn"
                >
                  {voteSubmitted ? '✓ Głos Zapisany (+50 XP)' : selectedVotedTrack ? `Oddaj Głos na Zawodnika ${selectedVotedTrack}` : 'Wybierz Zawodnika A lub B'}
                </button>
              </div>
            </PanelFrame>
          </PanelViewport>

          {/* ══════════════════════════════════════════════════════════════════════
              PANEL 03: DROP & UPLOAD (CREATOR SUITE)
              ══════════════════════════════════════════════════════════════════════ */}
          <PanelViewport>
            <PanelFrame
              eyebrow="Panel 03 • Creator Suite"
              title="Drop & Upload"
              subtitle="Prześlij utwór, przetestuj odsłuch na ekranie w pokoju 3D i opublikuj do ligi bitewnej."
            >
              <div className="hud-flex-col-gap4">
                {/* Drag & Drop Zone */}
                <div
                  className="hud-dropzone"
                  onDragOver={(e) => { e.preventDefault(); }}
                  onClick={() => {
                    setUploadedFileName('Nowy_Freestyle_Sesja_2026.wav');
                    setDetectedBpm(94);
                  }}
                >
                  <div className="hud-upload-icon-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                    {uploadedFileName ? uploadedFileName : 'Przeciągnij plik WAV / MP3 lub kliknij'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                    {detectedBpm ? `Wykryto tempo: ${detectedBpm} BPM • Key: D minor` : 'Obsługiwane formaty: WAV (24bit), MP3, MP4 do 50MB'}
                  </p>
                </div>

                {/* Track Metadata Input */}
                <div className="hud-info-card" style={{ padding: '16px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)' }}>
                    Tytuł Utworu / Freestyle:
                  </label>
                  <input
                    type="text"
                    placeholder="np. Cyber Cypher Vol. 2"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />

                  <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)', marginTop: '14px' }}>
                    Kategoria / Tag:
                  </p>
                  <div className="hud-tag-chips">
                    {['#Freestyle', '#BoomBap', '#Trap', '#Drill', '#Melodic'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setUploadCategory(tag)}
                        className={`hud-tag-chip ${uploadCategory === tag ? 'hud-tag-chip-active' : ''}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Send to Wall Studio Preview Trigger */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setWallPreviewActive(true)}
                    className="hud-secondary-action-btn"
                  >
                    📺 {wallPreviewActive ? 'Wyświetla na Ścianie' : 'Podgląd na Ekranie'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploading(true);
                      setTimeout(() => {
                        setIsUploading(false);
                        alert('Utwór zgłoszony pomyślnie do kolejki ligowej!');
                      }, 800);
                    }}
                    className="hud-primary-action-btn"
                    style={{ height: '100%', padding: '12px' }}
                  >
                    {isUploading ? 'Wysyłanie...' : 'Opublikuj w Bitwach'}
                  </button>
                </div>
              </div>
            </PanelFrame>
          </PanelViewport>

          {/* ══════════════════════════════════════════════════════════════════════
              PANEL 04: TOP 10 CHARTS & LEADERBOARD
              ══════════════════════════════════════════════════════════════════════ */}
          <PanelViewport>
            <PanelFrame
              eyebrow="Panel 04 • Hall of Fame"
              title="Top 10 Charts & Ranking"
              subtitle="Najwyżej oceniane utwory społeczności. Kliknij, aby puścić dowolny numer na ścianie studyjnej."
            >
              <div className="hud-flex-col-gap4">
                {/* Time Filter Tabs */}
                <div className="hud-filter-tabs">
                  <button
                    type="button"
                    onClick={() => setChartFilter('today')}
                    className={`hud-filter-tab ${chartFilter === 'today' ? 'hud-filter-tab-active' : ''}`}
                  >
                    Dzisiaj
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartFilter('weekly')}
                    className={`hud-filter-tab ${chartFilter === 'weekly' ? 'hud-filter-tab-active' : ''}`}
                  >
                    Top Tygodnia
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartFilter('alltime')}
                    className={`hud-filter-tab ${chartFilter === 'alltime' ? 'hud-filter-tab-active' : ''}`}
                  >
                    Legendy
                  </button>
                </div>

                {/* Top 10 Chart List */}
                <div className="hud-overflow-y hud-space-y-3" style={{ flex: 1, minHeight: 0 }}>
                  {chartsList.map((track, index) => {
                    const rankClass =
                      index === 0 ? 'hud-rank-gold' :
                      index === 1 ? 'hud-rank-silver' :
                      index === 2 ? 'hud-rank-bronze' : 'hud-rank-default';

                    return (
                      <div key={track.id} className="hud-chart-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div className={`hud-rank-badge ${rankClass}`}>
                            #{track.rank}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {track.title}
                            </p>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                              {track.artist} • {track.bpm} BPM • {track.category}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f3a05d' }}>
                              {track.winRate}% Win
                            </span>
                            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                              {track.votes} głosów
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectAndPlayMedia(track.id)}
                            className="hud-secondary-action-btn"
                            style={{ padding: '6px 12px', fontSize: '11px' }}
                          >
                            ▶ Na Ekran
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PanelFrame>
          </PanelViewport>

        </div>

        {/* Mobile Bottom Swipe Navigation Dots */}
        {isMobile && (
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
        )}
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
      {footer && <div className="hud-frame-footer">{footer}</div>}
    </div>
  );
}

function VideoCanvasPreview({
  masterVideoRef,
  activeMediaId,
  isActive,
  isPlaying,
  onClick,
}: {
  masterVideoRef: RefObject<HTMLVideoElement | null>;
  activeMediaId?: string;
  isActive: boolean;
  isPlaying: boolean;
  onClick?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId = 0;
    const drawFrame = () => {
      const video = masterVideoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    };

    const renderLoop = () => {
      drawFrame();
      if (isActive && isPlaying && document.visibilityState === 'visible') {
        animationFrameId = requestAnimationFrame(renderLoop);
      }
    };

    renderLoop();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [masterVideoRef, activeMediaId, isActive, isPlaying]);

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

function AudioWaveformVisualizer({
  analyserRef,
  isPlaying,
  onClick,
}: {
  analyserRef: RefObject<AnalyserNode | null>;
  isPlaying: boolean;
  onClick?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(64);

    const renderWaveform = () => {
      const analyser = analyserRef.current;
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = isPlaying ? 30 + Math.sin(Date.now() * 0.005 + i * 0.3) * 20 : 8;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#151210');
      bgGrad.addColorStop(1, '#08080a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Center Line
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Bars
      const barCount = 48;
      const barWidth = canvas.width / barCount - 2;
      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i % dataArray.length] / 255;
        const barH = Math.max(4, val * (canvas.height * 0.75));
        const x = i * (barWidth + 2);
        const y = (canvas.height - barH) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, '#f3a05d');
        grad.addColorStop(1, '#ff4b2b');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();
      }

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(renderWaveform);
      }
    };

    renderWaveform();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [analyserRef, isPlaying]);

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
