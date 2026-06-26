import { useRef, useCallback, useEffect, useState } from 'react';
import { useAudioStore } from '../stores/useAudioStore';

export interface BeatState {
  isBeat: boolean;
  bassEnergy: number;
  midEnergy: number;
  trebleEnergy: number;
  bpm: number;
}

/**
 * Beat detection hook — analyzes audio frequency data to detect beats.
 * Uses rolling average with ratio-based onset detection (works at any volume).
 * 
 * @param options Configuration options
 * @param options.threshold Ratio threshold for beat detection (default 1.3)
 * @param options.cooldownMs Minimum ms between beats (default 150)
 * @param options.bpmSmoothing BPM smoothing factor (default 0.9)
 */
export function useBeatDetection(options?: {
  threshold?: number;
  cooldownMs?: number;
  bpmSmoothing?: number;
}) {
  const { threshold = 1.3, cooldownMs = 150, bpmSmoothing = 0.9 } = options ?? {};
  
  const analyserNode = useAudioStore(s => s.analyserNode);
  const [beatState, setBeatState] = useState<BeatState>({
    isBeat: false, bassEnergy: 0, midEnergy: 0, trebleEnergy: 0, bpm: 0,
  });

  const bassAvgRef = useRef(0);
  const lastBeatTimeRef = useRef(0);
  const beatIntervalsRef = useRef<number[]>([]);
  const dataArrayRef = useRef(new Uint8Array(0));

  const detectBeat = useCallback(() => {
    if (!analyserNode) {
      setBeatState({ isBeat: false, bassEnergy: 0, midEnergy: 0, trebleEnergy: 0, bpm: 0 });
      return;
    }

    if (dataArrayRef.current.length !== analyserNode.frequencyBinCount) {
      dataArrayRef.current = new Uint8Array(analyserNode.frequencyBinCount);
    }
    const data = dataArrayRef.current;
    analyserNode.getByteFrequencyData(data);

    // Bass: bins 0-3
    let bassSum = 0;
    for (let i = 0; i < 4; i++) bassSum += data[i];
    const bassEnergy = bassSum / 4 / 255;

    // Mids: bins 4-20
    let midSum = 0;
    const midEnd = Math.min(20, data.length);
    for (let i = 4; i < midEnd; i++) midSum += data[i];
    const midEnergy = midSum / Math.max(1, midEnd - 4) / 255;

    // Treble: bins 20-40
    let trebleSum = 0;
    const trebleEnd = Math.min(40, data.length);
    for (let i = 20; i < trebleEnd; i++) trebleSum += data[i];
    const trebleEnergy = trebleSum / Math.max(1, trebleEnd - 20) / 255;

    // Onset detection: ratio-based (works at any volume)
    const bassSmooth = bassAvgRef.current * 0.97 + bassEnergy * 0.03;
    bassAvgRef.current = bassSmooth;
    const bassRatio = bassSmooth > 0.01 ? bassEnergy / bassSmooth : 1.0;

    const now = performance.now();
    const isBeat = bassRatio > threshold && bassEnergy > 0.05 && 
                   (now - lastBeatTimeRef.current) > cooldownMs;

    if (isBeat) {
      lastBeatTimeRef.current = now;
      // Track BPM
      if (beatIntervalsRef.current.length > 0) {
        const interval = now - beatIntervalsRef.current[beatIntervalsRef.current.length - 1];
        if (interval > 200 && interval < 2000) {
          beatIntervalsRef.current.push(now);
          if (beatIntervalsRef.current.length > 8) beatIntervalsRef.current.shift();
        }
      } else {
        beatIntervalsRef.current.push(now);
      }
    }

    // Calculate BPM from intervals
    let bpm = 0;
    if (beatIntervalsRef.current.length > 2) {
      const intervals: number[] = [];
      for (let i = 1; i < beatIntervalsRef.current.length; i++) {
        intervals.push(beatIntervalsRef.current[i] - beatIntervalsRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      bpm = Math.round(60000 / avgInterval);
    }

    setBeatState({ isBeat, bassEnergy, midEnergy, trebleEnergy, bpm });
  }, [analyserNode, threshold, cooldownMs]);

  return { beatState, detectBeat };
}
