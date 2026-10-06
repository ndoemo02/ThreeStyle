"use client";

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Camera, Check, Film, FolderOpen, Headphones, Music2, Pause, Play, RefreshCw, RotateCcw, Upload, Volume2, X } from 'lucide-react';
import { useHudStore } from '../stores/useHudStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useCreatorMedia } from '../hooks/useCreatorMedia';
import { formatMediaTime } from '../lib/creatorMedia';
import { CreatorLightingPanel } from './CreatorLightingPanel';

const statusLabels = { idle: 'Wybierz materiał', loading: 'Ładowanie…', playing: 'Odtwarzanie', paused: 'Gotowe do odsłuchu', error: 'Problem z odtwarzaniem' };

export function HudOverlay() {
  const isOpen = useHudStore(s => s.isOpen);
  const closeHud = useHudStore(s => s.closeHud);
  const [tab, setTab] = useState<'media' | 'light'>('media');
  const bodyRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const media = useCreatorMedia(videoRef, audioRef, cameraRef);
  const panelRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [tab]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeHud(); }
      if (event.key !== 'Tab') return;
      const targets = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([type="file"]):not(:disabled)') ?? []).filter(el => el.offsetParent !== null);
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); previous?.focus({ preventScroll: true }); dragDepth.current = 0; };
  }, [isOpen, closeHud]);

  return (
    <>
      <div className="creator-media-host" aria-hidden="true">
        <video ref={videoRef} playsInline preload="metadata" crossOrigin="anonymous" loop />
        <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" loop />
        <video ref={cameraRef} playsInline muted />
      </div>
      <div className={`creator-deck-layer ${isOpen ? 'is-open' : ''}`} inert={!isOpen} aria-hidden={!isOpen} onClick={event => { if (event.target === event.currentTarget) closeHud(); }}>
        <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="creator-deck-title" className={`creator-deck ${tab === 'light' ? 'is-light-page' : ''}`}>
          <header className="creator-deck-header">
            <div className="creator-deck-wordmark">3<span>S</span></div>
            <div className="creator-deck-heading"><p>TWÓJ POKÓJ · TWOJE MEDIA</p><h1 id="creator-deck-title">Creator Room</h1></div>
            <button ref={closeRef} type="button" className="creator-icon-button" onClick={closeHud} aria-label="Zamknij panel" title="Zamknij · Escape"><X size={20} /></button>
          </header>
          <div className="creator-deck-tabs" role="tablist" aria-label="Panel Creator Room">
            {([{ id: 'media', label: 'Media' }, { id: 'light', label: 'Światło' }] as const).map(item => <button type="button" key={item.id} id={`creator-tab-${item.id}`} role="tab" aria-controls={`creator-panel-${item.id}`} aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 'media' : event.key === 'End' ? 'light' : tab === 'media' ? 'light' : 'media';
              setTab(next); document.getElementById(`creator-tab-${next}`)?.focus();
            }}>{item.label}</button>)}
          </div>
          <div ref={bodyRef} className="creator-deck-body">
            <div id="creator-panel-media" className="creator-tab-panel" role="tabpanel" aria-labelledby="creator-tab-media" hidden={tab !== 'media'}>
            <div className="creator-deck-actions">
              <button type="button" className="creator-add-button" onClick={() => fileRef.current?.click()}><Upload size={17} />Dodaj plik</button>
              <button type="button" className="creator-secondary-button" onClick={() => libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}><FolderOpen size={17} />Biblioteka</button>
              <input ref={fileRef} type="file" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus,.mp4,.webm,.mov,.m4v,.ogv" multiple hidden onChange={event => { if (event.target.files) media.addFiles(event.target.files); event.target.value = ''; }} />
            </div>
            <div ref={libraryRef} className={`creator-library ${dragging ? 'is-dragging' : ''}`}
              onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true); }}
              onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
              onDragLeave={event => { event.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } }}
              onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); media.addFiles(event.dataTransfer.files); }}>
              <div className="creator-library-heading"><h2>Twoje media <span>{media.items.length}</span></h2><button type="button" className="creator-icon-button" onClick={media.refresh} aria-label="Odśwież bibliotekę"><RefreshCw size={15} /></button></div>
              <p className="creator-session-note">Przeciągnij audio lub wideo · do 200 MB<br />Dodane pliki pozostają w tej sesji przeglądarki.</p>
              {media.libraryStatus === 'loading' && <p className="creator-empty" role="status">Wczytywanie biblioteki…</p>}
              {media.libraryError && <p className="creator-message" role="status">{media.libraryError}</p>}
              {media.libraryStatus !== 'loading' && media.items.length === 0 && <p className="creator-empty">Zacznij od własnego beatu lub klipu.</p>}
              <div className="creator-media-grid">
                {media.items.map(item => {
                  const selected = media.activeMedia?.id === item.id;
                  const unavailable = item.isVideoDisplayable === false;
                  return (
                    <div key={item.id} className={`creator-media-tile ${selected ? 'is-selected' : ''}`}>
                      <button type="button" className="creator-media-select" aria-label={`Odtwórz ${item.title}`} aria-pressed={selected} disabled={unavailable} title={unavailable ? item.compatibilityNote : item.title} onClick={() => media.select(item)}>
                        <span className={`creator-media-cover ${item.kind}`}>
                          {item.kind === 'video' ? <Film size={28} strokeWidth={1.4} /> : <Music2 size={28} strokeWidth={1.4} />}
                          <span className="creator-media-cover-lines" /><span className="creator-media-kind">{item.kind === 'video' ? 'VIDEO' : 'AUDIO'}</span>
                          {selected && <span className="creator-media-selected"><Check size={12} /></span>}
                        </span>
                        <span className="creator-media-name">{item.title}</span>
                        <span className="creator-media-detail">{unavailable ? 'Niedostępne' : item.local ? 'W tej sesji' : 'Biblioteka'} · {(item.size / 1048576).toFixed(1)} MB</span>
                      </button>
                      {item.local && <button type="button" className="creator-media-remove" aria-label={`Usuń ${item.title} z sesji`} onClick={() => media.remove(item)}><X size={13} /></button>}
                    </div>
                  );
                })}
              </div>
              {dragging && <div className="creator-drop-hint"><Upload size={25} /><strong>Upuść plik w swoim pokoju</strong></div>}
            </div>
            {media.error && <p className="creator-message error" role="alert">{media.error}</p>}
            <div className="creator-source-controls">
              <div><p className="creator-label">EKRAN W POKOJU</p><strong>{media.camEnabled ? 'Kamera' : 'Twoje media'}</strong></div>
              <button type="button" className={`creator-secondary-button ${media.camEnabled ? 'is-active' : ''}`} aria-pressed={media.camEnabled} disabled={!media.cameraAllowed} title={media.cameraAllowed ? undefined : 'Kamera jest dostępna w Creator Roomie'} onClick={media.toggleCamera}><Camera size={16} />{media.cameraPending ? 'Anuluj' : media.camEnabled ? 'Wyłącz kamerę' : 'Kamera'}</button>
              {(media.camEnabled || media.cameraPending) && <button type="button" className="creator-icon-button" aria-label="Zmień kamerę przednią lub tylną" onClick={media.switchCamera}><RotateCcw size={17} /></button>}
            </div>
            {media.cameraError && <p className="creator-message error" role="alert">{media.cameraError}</p>}
            {media.camEnabled && <p className="creator-session-note">Kamera pozostaje włączona po zamknięciu panelu. Wyłączysz ją tutaj; wyjście z pokoju ją zatrzymuje.</p>}
            </div>
            <div id="creator-panel-light" className="creator-tab-panel" role="tabpanel" aria-labelledby="creator-tab-light" hidden={tab !== 'light'}><CreatorLightingPanel /></div>
          </div>
          <footer className="creator-player">
            <div className="creator-player-top">
              <div className="creator-player-art">{(media.activeMedia?.kind === 'video' || media.camEnabled) ? <MediaPreview videoRef={media.camEnabled ? cameraRef : videoRef} active={isOpen && tab === 'media'} mediaId={media.camEnabled ? 'camera' : media.activeMedia?.id} /> : <Headphones size={23} />}</div>
              <div className="creator-player-info"><p role="status">{statusLabels[media.status]}</p><h2 title={media.activeMedia?.title}>{media.activeMedia?.title ?? 'Twój pierwszy odsłuch'}</h2></div>
              <button type="button" className="creator-play-button" disabled={!media.activeMedia} onClick={media.togglePlay} aria-label={media.status === 'playing' || media.status === 'loading' ? 'Wstrzymaj' : 'Odtwórz'}>{media.status === 'playing' || media.status === 'loading' ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
            </div>
            <input className="creator-seek" type="range" aria-label="Pozycja odtwarzania" min={0} max={media.duration || 1} step={0.1} value={Math.min(media.time, media.duration || 1)} disabled={!media.duration} onChange={event => media.seek(Number(event.target.value))} />
            <div className="creator-player-bottom"><span>{formatMediaTime(media.time)} / {formatMediaTime(media.duration)}</span><label><Volume2 size={15} /><input type="range" aria-label="Głośność" min={0} max={1} step={0.01} value={media.volume} onChange={event => media.setVolume(Number(event.target.value))} /></label></div>
            <AudioMeter active={isOpen && tab === 'media' && media.status === 'playing'} />
          </footer>
          <button type="button" className="creator-return" onClick={closeHud}>Wróć do pokoju <span>ESC</span></button>
        </section>
      </div>
    </>
  );
}

function MediaPreview({ videoRef, active, mediaId }: { videoRef: RefObject<HTMLVideoElement | null>; active: boolean; mediaId?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active) return;
    const canvas = ref.current, ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    let frame = 0;
    const draw = () => {
      const video = videoRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (video && video.readyState >= 2 && video.videoWidth) {
        const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
        const w = video.videoWidth * scale, h = video.videoHeight * scale;
        ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [active, videoRef, mediaId]);
  return <canvas ref={ref} width={160} height={100} aria-hidden="true" />;
}

function AudioMeter({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    const data = new Uint8Array(128);
    const draw = () => {
      const analyser = useAudioStore.getState().analyserNode;
      if (active && analyser) analyser.getByteFrequencyData(data); else data.fill(0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f3a05d';
      for (let i = 0; i < 40; i++) { const h = Math.max(2, data[i] / 255 * canvas.height); ctx.fillRect(i * 10, (canvas.height - h) / 2, 3, h); }
      if (active) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return <canvas ref={ref} className="creator-audio-meter" width={400} height={22} aria-hidden="true" />;
}
