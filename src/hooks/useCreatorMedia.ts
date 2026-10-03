'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useHudStore } from '../stores/useHudStore';
import { useAudioStore } from '../stores/useAudioStore';
import { useTransitionStore } from '../store/useTransitionStore';
import { ROOM_ZONE } from '../3d/navigation/navigationConfig';
import { inspectSessionFile, mergeCreatorLibrary, type CreatorMediaItem, type PlaybackStatus } from '../lib/creatorMedia';

export function useCreatorMedia(videoRef: RefObject<HTMLVideoElement | null>, audioRef: RefObject<HTMLAudioElement | null>, cameraRef: RefObject<HTMLVideoElement | null>) {
  const selected = useRef<CreatorMediaItem | null>(null);
  const generation = useRef(0);
  const cameraGeneration = useRef(0);
  const libraryController = useRef<AbortController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const urls = useRef(new Map<string, string>());
  const [catalog, setCatalog] = useState<CreatorMediaItem[]>([]);
  const [session, setSession] = useState<CreatorMediaItem[]>([]);
  const [libraryStatus, setLibraryStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPending, setCameraPending] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const activeMedia = useHudStore(s => s.activeMedia);
  const status = useHudStore(s => s.playbackStatus);
  const camEnabled = useHudStore(s => s.camEnabled);
  const facing = useHudStore(s => s.camFacingMode);
  const zone = useTransitionStore(s => s.activeZone);

  const publish = useCallback((next: PlaybackStatus) => {
    useHudStore.getState().setMediaState(selected.current, next);
    useAudioStore.getState().setIsActive(next === 'playing' && contextRef.current?.state === 'running');
  }, []);

  const initAudio = useCallback(() => {
    if (!contextRef.current) {
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        // Both persistent elements share one graph, including after HUD close/reopen.
        for (const el of [videoRef.current, audioRef.current]) {
          if (el) ctx.createMediaElementSource(el).connect(analyser);
        }
        analyser.connect(ctx.destination);
        contextRef.current = ctx;
        useAudioStore.setState({ audioContext: ctx, analyserNode: analyser, connected: true });
      } catch {
        setError('Nie udało się uruchomić analizy audio. Spróbuj ponownie.');
      }
    }
    if (contextRef.current?.state === 'suspended') {
      void contextRef.current.resume().then(() => {
        useAudioStore.getState().setIsActive(useHudStore.getState().isPlaying);
      }).catch(() => setError('Przeglądarka wstrzymała dźwięk. Kliknij Odtwórz.'));
    }
  }, [videoRef, audioRef]);

  const play = useCallback(async () => {
    const item = selected.current;
    const el = item?.kind === 'video' ? videoRef.current : audioRef.current;
    if (!item || !el) return;
    const ticket = ++generation.current;
    initAudio();
    setError(null);
    publish('loading');
    try {
      // Call play in the gesture, without waiting for metadata or AudioContext.resume.
      await el.play();
      if (ticket === generation.current) publish('playing');
    } catch (cause) {
      if (ticket !== generation.current) return;
      const blocked = cause instanceof DOMException && cause.name === 'NotAllowedError';
      setError(blocked ? 'Kliknij Odtwórz, aby uruchomić dźwięk.' : 'Nie można odtworzyć tego pliku. Spróbuj MP3, WAV lub MP4 H.264.');
      publish('error');
    }
  }, [initAudio, publish, videoRef, audioRef]);

  const select = useCallback((item: CreatorMediaItem, autoplay = true) => {
    if (item.isVideoDisplayable === false) {
      setError(item.compatibilityNote ?? 'Ten materiał nie jest dostępny do odtworzenia.');
      return;
    }
    generation.current++;
    selected.current = null;
    // Detach the previous source before any object URL can be revoked.
    for (const el of [videoRef.current, audioRef.current]) {
      if (!el) continue;
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    selected.current = item;
    setError(null);
    setTime(0);
    setDuration(0);
    const el = item.kind === 'video' ? videoRef.current : audioRef.current;
    if (el) { el.src = item.src; el.load(); }
    publish('paused');
    if (autoplay) void play();
  }, [play, publish, videoRef, audioRef]);

  const refreshLibrary = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/media', { cache: 'no-store', signal });
      if (!response.ok) throw new Error();
      const data = await response.json() as { items: CreatorMediaItem[] };
      if (signal?.aborted) return;
      const items = Array.isArray(data.items) ? data.items : [];
      setCatalog(items);
      setLibraryStatus('ready');
      setLibraryError(null);
      if (!selected.current) {
        const first = items.find(item => item.isVideoDisplayable !== false);
        if (first) select(first, false);
      }
    } catch {
      if (signal?.aborted) return;
      setLibraryStatus('error');
      setLibraryError('Nie udało się wczytać biblioteki. Możesz dodać własny plik.');
    }
  }, [select]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const added: CreatorMediaItem[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      const checked = inspectSessionFile(file);
      if ('error' in checked) { errors.push(`${file.name}: ${checked.error}`); continue; }
      const id = `session:${crypto.randomUUID()}`;
      const src = URL.createObjectURL(file);
      urls.current.set(id, src);
      added.push({ id, src, kind: checked.kind, title: file.name.replace(/\.[^.]+$/, ''), size: file.size, local: true });
    }
    if (added.length) {
      setSession(previous => [...added, ...previous]);
      select(added[0]);
    }
    if (errors.length) setError(errors.join(' '));
  }, [select]);

  const remove = useCallback((item: CreatorMediaItem) => {
    if (selected.current?.id === item.id) {
      generation.current++;
      selected.current = null;
      for (const el of [videoRef.current, audioRef.current]) {
        if (el) { el.pause(); el.removeAttribute('src'); el.load(); }
      }
      setTime(0); setDuration(0); setError(null); publish('idle');
    }
    const url = urls.current.get(item.id);
    if (url) { URL.revokeObjectURL(url); urls.current.delete(item.id); }
    setSession(previous => previous.filter(entry => entry.id !== item.id));
  }, [publish, videoRef, audioRef]);

  const stopCamera = useCallback(() => {
    cameraGeneration.current++;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (cameraRef.current) { cameraRef.current.pause(); cameraRef.current.srcObject = null; }
    useHudStore.getState().setCamEnabled(false);
    setCameraPending(false);
  }, [cameraRef]);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    stopCamera();
    setCameraError(null);
    if (useTransitionStore.getState().activeZone !== ROOM_ZONE) {
      setCameraError('Kamera jest dostępna w Creator Roomie.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Kamera wymaga bezpiecznego połączenia i obsługi w przeglądarce.');
      return;
    }
    const ticket = ++cameraGeneration.current;
    setCameraPending(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (ticket !== cameraGeneration.current || !cameraRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      cameraRef.current.srcObject = stream;
      await cameraRef.current.play();
      if (ticket !== cameraGeneration.current) { stream.getTracks().forEach(t => t.stop()); return; }
      useHudStore.getState().setCamEnabled(true);
      setCameraPending(false);
    } catch {
      stream?.getTracks().forEach(t => t.stop());
      if (ticket !== cameraGeneration.current) return;
      stopCamera();
      setCameraError('Nie udało się włączyć kamery. Sprawdź uprawnienia i spróbuj ponownie.');
    }
  }, [stopCamera, cameraRef]);

  useEffect(() => {
    if (zone !== ROOM_ZONE) stopCamera();
  }, [zone, stopCamera]);

  useEffect(() => {
    const controller = new AbortController();
    libraryController.current = controller;
    const playbackToken = generation;
    const cameraToken = cameraGeneration;
    const objectUrls = urls.current;
    const video = videoRef.current;
    const audio = audioRef.current;
    const camera = cameraRef.current;
    useHudStore.setState({ masterVideoRef: video, camVideoElement: camera });
    const cleanups: (() => void)[] = [];
    for (const el of [video, audio]) {
      if (!el) continue;
      const isCurrent = () => !!selected.current && (selected.current.kind === 'video' ? video : audio) === el;
      const onPlaying = () => { if (isCurrent()) publish('playing'); };
      const onPause = () => { if (isCurrent() && useHudStore.getState().playbackStatus !== 'error') publish('paused'); };
      const onWaiting = () => { if (isCurrent() && !el.paused) publish('loading'); };
      const onTime = () => { if (isCurrent()) setTime(el.currentTime); };
      const onMetadata = () => { if (isCurrent()) setDuration(Number.isFinite(el.duration) ? el.duration : 0); };
      const onError = () => {
        if (!isCurrent() || !el.error) return;
        generation.current++;
        setError('Nie można odtworzyć tego pliku. Spróbuj MP3, WAV lub MP4 H.264.');
        publish('error');
      };
      const events = { playing: onPlaying, pause: onPause, waiting: onWaiting, timeupdate: onTime, loadedmetadata: onMetadata, error: onError };
      for (const [event, handler] of Object.entries(events)) el.addEventListener(event, handler);
      cleanups.push(() => { for (const [event, handler] of Object.entries(events)) el.removeEventListener(event, handler); });
    }
    void refreshLibrary(controller.signal);
    return () => {
      controller.abort(); playbackToken.current++; cameraToken.current++;
      cleanups.forEach(cleanup => cleanup());
      for (const el of [video, audio]) { if (el) { el.pause(); el.removeAttribute('src'); el.load(); } }
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (camera) camera.srcObject = null;
      objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls.clear();
      const ctx = contextRef.current; contextRef.current = null;
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
      selected.current = null;
      useAudioStore.setState({ audioContext: null, analyserNode: null, connected: false, isActive: false });
      useHudStore.setState({ activeMedia: null, playbackStatus: 'idle', isPlaying: false, camEnabled: false, masterVideoRef: null, camVideoElement: null });
    };
  }, [publish, refreshLibrary, videoRef, audioRef, cameraRef]);

  useEffect(() => {
    for (const el of [videoRef.current, audioRef.current]) if (el) el.volume = volume;
  }, [volume, videoRef, audioRef]);

  return {
    activeMedia, status, camEnabled, facing, cameraPending, cameraAllowed: zone === ROOM_ZONE,
    items: mergeCreatorLibrary(catalog, session), libraryStatus, libraryError, error, cameraError,
    time, duration, volume, setVolume, select, addFiles, remove,
    refresh: () => void refreshLibrary(libraryController.current?.signal),
    togglePlay: () => {
      const el = selected.current?.kind === 'video' ? videoRef.current : audioRef.current;
      if (el && (!el.paused || status === 'loading')) { generation.current++; el.pause(); publish('paused'); } else void play();
    },
    seek: (seconds: number) => {
      const el = selected.current?.kind === 'video' ? videoRef.current : audioRef.current;
      if (el && Number.isFinite(el.duration)) { el.currentTime = seconds; setTime(seconds); }
    },
    toggleCamera: () => { if (camEnabled || cameraPending) stopCamera(); else void startCamera(facing); },
    switchCamera: () => {
      const mode = facing === 'user' ? 'environment' : 'user';
      useHudStore.getState().setCamFacingMode(mode);
      if (camEnabled || cameraPending) void startCamera(mode);
    },
  };
}
