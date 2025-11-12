'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Settings, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdaptiveVideoPlayerProps {
  hlsUrl?: string;
  mp4Url?: string;
  title?: string;
  poster?: string;
  className?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
}

interface VideoQuality {
  height: number;
  bitrate: number;
  level: number;
}

export function AdaptiveVideoPlayer({
  hlsUrl,
  mp4Url,
  title,
  poster,
  className,
  onTimeUpdate,
  onDurationChange,
  autoPlay = false,
  muted = false,
  controls = true,
}: AdaptiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualities, setQualities] = useState<VideoQuality[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize HLS or fallback to progressive
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const initializeVideo = async () => {
      setIsLoading(true);
      setError(null);

      console.log('🎥 AdaptiveVideoPlayer initializing with:', {
        hlsUrl,
        mp4Url,
        hlsSupported: Hls.isSupported()
      });

      // Try HLS first if supported and URL is available
      if (hlsUrl && Hls.isSupported()) {
        try {
          console.log('🎬 Attempting HLS playback with URL:', hlsUrl);
          
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            debug: false, // Disable debug to reduce console noise
          });

          hls.loadSource(hlsUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('✅ HLS manifest loaded successfully');
            setIsLoading(false);
            
            // Extract quality levels
            const levels = hls.levels.map((level, index) => ({
              height: level.height || 0,
              bitrate: level.bitrate,
              level: index,
            }));
            setQualities(levels);
            console.log('📊 Available quality levels:', levels);
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('❌ HLS Error:', {
              type: data.type,
              details: data.details,
              fatal: data.fatal,
              url: data.url,
              response: data.response,
              reason: data.reason
            });
            
            if (data.fatal) {
              setError('Failed to load HLS stream');
              // Fallback to MP4 if available
                              if (mp4Url) {
                  console.log('🔄 Falling back to MP4:', mp4Url);
                  try {
                    hls.destroy();
                  } catch (destroyErr) {
                    console.warn('Error destroying HLS instance:', destroyErr);
                  }
                  hlsRef.current = null;
                  video.src = mp4Url;
                  setIsLoading(false);
                } else {
                  console.log('❌ No MP4 fallback available');
                  setIsLoading(false);
                }
            }
          });

          hlsRef.current = hls;
          return;
        } catch (err) {
          console.error('❌ HLS initialization failed:', err);
          // Continue to fallback
        }
      } else {
        console.log('⏭️ Skipping HLS:', {
          hasHlsUrl: !!hlsUrl,
          hlsSupported: Hls.isSupported()
        });
      }

      // Fallback to progressive download
      if (mp4Url) {
        video.src = mp4Url;
        setIsLoading(false);
      } else if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
        setIsLoading(false);
      } else {
        setError('No supported video format available');
        setIsLoading(false);
      }
    };

    initializeVideo();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, mp4Url]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      setCurrentTime(current);
      onTimeUpdate?.(current);
    };

    const handleDurationChange = () => {
      const dur = video.duration;
      setDuration(dur);
      onDurationChange?.(dur);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setError('Failed to load video');
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [onTimeUpdate, onDurationChange]);

  // Control visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Play/Pause
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);

  // Seek
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  }, [duration]);

  // Volume
  const handleVolumeChange = useCallback((newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Quality selection
  const changeQuality = useCallback((level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
    }
    setShowQualityMenu(false);
  }, []);

  // Format time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Download handler
  const handleDownload = useCallback(() => {
    if (mp4Url) {
      const a = document.createElement('a');
      a.href = mp4Url;
      a.download = title || 'video.mp4';
      a.click();
    }
  }, [mp4Url, title]);

  return (
    <div 
      className={cn(
        "relative bg-black rounded-lg overflow-hidden group",
        className
      )}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        onClick={togglePlayPause}
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75">
          <div className="text-white text-center">
            <p className="text-lg font-semibold">Video Error</p>
            <p className="text-sm opacity-75">{error}</p>
          </div>
        </div>
      )}

      {/* Custom controls */}
      {controls && !error && (
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Progress bar */}
          <div 
            className="w-full h-1 bg-white/20 rounded cursor-pointer mb-4"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-blue-500 rounded"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                className="text-white hover:text-blue-400 transition-colors"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>

              {/* Volume */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-white/20 rounded-lg"
                />
              </div>

              {/* Time */}
              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Quality selector */}
              {qualities.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="text-white hover:text-blue-400 transition-colors"
                  >
                    <Settings size={20} />
                  </button>
                  
                  {showQualityMenu && (
                    <div className="absolute bottom-8 right-0 bg-black/90 rounded-lg p-2 min-w-32">
                      <button
                        onClick={() => changeQuality(-1)}
                        className={cn(
                          "block w-full text-left px-3 py-1 rounded text-sm transition-colors",
                          currentQuality === -1 ? "bg-blue-500 text-white" : "text-white hover:bg-white/10"
                        )}
                      >
                        Auto
                      </button>
                      {qualities.map((quality) => (
                        <button
                          key={quality.level}
                          onClick={() => changeQuality(quality.level)}
                          className={cn(
                            "block w-full text-left px-3 py-1 rounded text-sm transition-colors",
                            currentQuality === quality.level ? "bg-blue-500 text-white" : "text-white hover:bg-white/10"
                          )}
                        >
                          {quality.height}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Download */}
              {mp4Url && (
                <button
                  onClick={handleDownload}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  <Download size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
