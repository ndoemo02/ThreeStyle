import { useHudStore } from '../stores/useHudStore';
import { useEffect, useState, useRef, useCallback } from 'react';

export function HudOverlay() {
  const { isOpen, closeHud, activeScreenId, isPlaying, setIsPlaying } = useHudStore();
  const setMasterVideoRef = useHudStore(s => s.setMasterVideoRef);
  const [isMobile, setIsMobile] = useState(false);
  
  // Stable ref callback – called once when video mounts / null when unmounts
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
    setMasterVideoRef(node);
  }, [setMasterVideoRef]);

  // Audio/Video state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || window.matchMedia('(pointer: coarse)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Format time utility
  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const hudContentProps = {
    activeScreenId,
    isPlaying,
    currentTime,
    duration,
    formatTime,
    togglePlay,
    videoRef,
    videoCallbackRef,
    setCurrentTime,
    setDuration,
    setIsPlaying,
  };

  // Wrapper classes for visibility without unmounting (to keep audio playing)
  const visibilityClass = isOpen 
    ? 'opacity-100 pointer-events-auto' 
    : 'opacity-0 pointer-events-none';

  return (
    <>
      {/* Mobile Overlay */}
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
        /* Desktop Overlay */
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-end pr-8 bg-black/40 transition-opacity duration-300 ${visibilityClass}`}
          onClick={closeHud}
        >
          <div 
            className={`w-[520px] h-[90vh] bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_40px_rgba(255,140,66,0.15)] flex flex-col font-sans shadow-2xl transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
            onClick={(e) => e.stopPropagation()}
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
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  formatTime: (time: number) => string;
  togglePlay: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoCallbackRef: (node: HTMLVideoElement | null) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
}

function HudContent({ activeScreenId, isPlaying, currentTime, duration, formatTime, togglePlay, videoRef, videoCallbackRef, setCurrentTime, setDuration, setIsPlaying }: HudContentProps) {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-full flex flex-col relative w-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2" />

      {/* Header */}
      <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center font-black text-3xl text-black shadow-lg">V</div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-md">VIF VIEW</h1>
            <p className="text-orange-400 text-xs font-mono tracking-widest mt-1">CINEMA HUD // VEO3</p>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-mono text-[10px] border border-green-500/30 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
          </span>
        </div>
      </div>
      
      {/* Video Viewport Area */}
      <div className="flex-1 min-h-0 flex flex-col justify-start w-full relative mb-6">
        <div className="w-full aspect-video bg-black/60 rounded-xl overflow-hidden shadow-xl border border-white/10 relative group" suppressHydrationWarning>
          <video 
            id="room-master-video"
            ref={videoCallbackRef}
            src="/media/video/Veo3 Generated Video.mp4"
            playsInline
            loop
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-cover transition-opacity duration-500"
            suppressHydrationWarning
          ></video>
          {/* Play/Pause Overlay */}
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
        </div>
        
        {/* Track Info Section */}
        <div className="mt-6">
          <p className="text-white/40 text-xs font-mono tracking-widest uppercase mb-4">Video Assets</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={togglePlay}
              className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 p-4 rounded-xl transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex justify-center items-center group-hover:bg-orange-500 transition">
                  {isPlaying ? (
                    <span className="w-3 h-3 border-l-4 border-r-4 border-white ml-[1px]" />
                  ) : (
                    <span className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[8px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-white font-bold tracking-wide text-sm line-clamp-1">Veo3 Generated Video</p>
                  <p className="text-white/40 text-[10px] mt-1 font-mono">1080P • AI GENERATED</p>
                </div>
              </div>
              <span className="text-orange-400 font-mono text-[10px] opacity-0 group-hover:opacity-100 transition">
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-black/50 rounded-xl border border-white/5 p-5 mt-6 shrink-0 relative overflow-hidden">
        <div className="flex items-center justify-between z-10 relative">
          <div>
            <p className="text-white/40 font-mono text-[10px] tracking-[0.2em] mb-1">{isPlaying ? 'NOW PLAYING' : 'PAUSED'}</p>
            <p className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500 drop-shadow-md">Veo3 Generated Video</p>
          </div>
          <div className="flex items-end h-8 gap-0.5 z-10 opacity-80">
            {Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i} 
                className="w-1 bg-orange-500 rounded-t-sm transition-all duration-300"
                style={{ height: isPlaying ? `${20 + Math.random() * 80}%` : '20%' }}
              />
            ))}
          </div>
        </div>
        
        <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden z-10 relative">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-pink-500 relative transition-all duration-100" 
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
