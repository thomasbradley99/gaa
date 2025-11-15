'use client'

import { useEffect, useRef } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'
import type { VideoPlaybackControlsProps } from './types'

export function VideoPlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onSkipBackward,
  onSkipForward,
  onMuteToggle,
  isMuted,
  showControls,
}: VideoPlaybackControlsProps) {
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isHoveringRef = useRef(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = clickX / rect.width
    const seekTime = percent * duration
    onSeek(seekTime)
  }

  const showControlsTemporarily = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    hideTimeoutRef.current = setTimeout(() => {
      if (!isHoveringRef.current && isPlaying) {
        // Controls will hide via showControls prop
      }
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  if (!showControls && isPlaying) {
    return null
  }

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onMouseEnter={() => {
        isHoveringRef.current = true
        showControlsTemporarily()
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false
      }}
      onMouseMove={showControlsTemporarily}
    >
      {/* Progress Bar */}
      <div
        className="w-full h-2 bg-white/20 rounded-full cursor-pointer mb-4 group"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        />
        {/* Progress indicator dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 8px)` }}
        />
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <button
            onClick={onPlayPause}
            className="text-white hover:text-green-400 transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </button>

          {/* Skip Backward */}
          <button
            onClick={onSkipBackward}
            className="text-white hover:text-green-400 transition-colors flex items-center gap-1"
            title="Skip backward 5s"
          >
            <SkipBack className="w-5 h-5" />
            <span className="text-sm font-semibold">5s</span>
          </button>

          {/* Skip Forward */}
          <button
            onClick={onSkipForward}
            className="text-white hover:text-green-400 transition-colors flex items-center gap-1"
            title="Skip forward 5s"
          >
            <span className="text-sm font-semibold">5s</span>
            <SkipForward className="w-5 h-5" />
          </button>

          {/* Mute/Unmute */}
          <button
            onClick={onMuteToggle}
            className="text-white hover:text-green-400 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>

          {/* Time Display */}
          <div className="text-white text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  )
}

