"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

export default function VoicePlayer({ mediaUrl, isMine }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Simulated waveform bar heights to create a clean, elegant visual voice signature
  const waveformBars = [
    12, 24, 8, 36, 16, 42, 28, 14, 30, 48, 20, 10, 32, 24, 16, 38, 44, 18, 26, 8,
    34, 12, 28, 40, 16, 22, 12, 30, 8, 24, 36, 14, 42, 18, 26
  ];

  useEffect(() => {
    if (!mediaUrl) return;

    const audio = new Audio(mediaUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    // Fetch duration in case it is loaded immediately from cache
    if (audio.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mediaUrl]);

  // Fallback timer if metadata loading is slow/cached differently
  useEffect(() => {
    if (isPlaying) {
      const update = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          if (audioRef.current.duration && !isNaN(audioRef.current.duration) && audioRef.current.duration !== Infinity) {
            setDuration(audioRef.current.duration);
          }
        }
        animationFrameRef.current = requestAnimationFrame(update);
      };
      animationFrameRef.current = requestAnimationFrame(update);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Audio playback error:", err);
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 p-2 rounded-xl bg-background/40 backdrop-blur-sm border border-border/40 min-w-[260px] sm:min-w-[310px]">
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-all shrink-0 shadow-md ${
            isMine
              ? "bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105"
              : "bg-teal-600 hover:bg-teal-500 text-white hover:scale-105"
          }`}
          title={isPlaying ? "Pause" : "Play voice message"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white translate-x-[1px]" />
          )}
        </button>

        {/* Custom Visual Waveform Container */}
        <div className="flex items-end gap-[2.5px] h-10 flex-1 px-1 overflow-hidden select-none">
          {waveformBars.map((barHeight, idx) => {
            const barProgress = (idx / waveformBars.length) * 100;
            const hasPlayed = progressPercent >= barProgress;

            // Compute dynamic height scale if playing to give an equalizer effect
            const randomPulse = isPlaying ? Math.sin((currentTime * 10) + idx) * 4 : 0;
            const computedHeight = Math.max(4, Math.min(46, barHeight + randomPulse));

            return (
              <div
                key={idx}
                className="w-[3px] rounded-full transition-all duration-150 shrink-0"
                style={{
                  height: `${computedHeight}%`,
                  backgroundColor: hasPlayed
                    ? isMine
                      ? "#059669" // emerald-600 for own voice active
                      : "#0d9488" // teal-600 for other voice active
                    : "rgba(156, 163, 175, 0.3)" // soft gray for unplayed
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Seekable Progress Timeline and Runtime Indicators */}
      <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground px-1">
        <span>{formatTime(currentTime)}</span>
        <div className="relative flex-1 group py-1 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
            style={{
              background: `linear-gradient(to right, ${
                isMine ? "#059669" : "#0d9488"
              } ${progressPercent}%, rgba(156, 163, 175, 0.2) ${progressPercent}%)`
            }}
          />
        </div>
        <span>{formatTime(duration || 0)}</span>
      </div>
    </div>
  );
}
