'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioWaveformPlayerProps {
  duration?: number; // duration in seconds
  isSelf?: boolean;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  duration = 12,
  isSelf = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Pre-calculated bar heights for visual waveform
  const barHeights = [4, 8, 14, 18, 12, 22, 16, 10, 20, 14, 8, 16, 24, 18, 12, 6, 14, 18, 10, 6];

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-2xl max-w-xs transition-colors ${
        isSelf ? 'bg-blue-600/10 text-blue-900' : 'bg-zinc-100 text-zinc-900'
      }`}
    >
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
          isSelf
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1.5 min-w-[130px]">
        {/* Waveform visual bars */}
        <div className="flex items-center gap-0.5 h-6">
          {barHeights.map((h, i) => {
            const progressRatio = duration > 0 ? currentTime / duration : 0;
            const barRatio = i / barHeights.length;
            const isPlayed = barRatio <= progressRatio;

            return (
              <span
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isPlayed
                    ? isSelf
                      ? 'bg-blue-600'
                      : 'bg-zinc-800'
                    : isSelf
                    ? 'bg-blue-300'
                    : 'bg-zinc-300'
                }`}
                style={{
                  height: `${isPlaying && isPlayed ? Math.min(24, h + Math.sin(i) * 4) : h}px`,
                }}
              />
            );
          })}
        </div>

        {/* Time display */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>{isPlaying ? formatSecs(currentTime) : formatSecs(duration)}</span>
          <Volume2 className="w-3.5 h-3.5 opacity-60" />
        </div>
      </div>
    </div>
  );
};
