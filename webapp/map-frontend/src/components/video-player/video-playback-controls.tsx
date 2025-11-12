"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Event } from '@/lib/types/tagging'
import { 
  Play,
  Pause,
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  Settings,
  Maximize,
  Minimize
} from 'lucide-react'

interface VideoPlaybackControlsProps {
  isPlaying?: boolean
  currentTime: number
  duration: number
  events?: Event[]
  isFullscreen?: boolean
  onSeek?: (time: number) => void
  onToggleFullscreen?: () => void
  className?: string
}

export function VideoPlaybackControls({
  isPlaying = false,
  currentTime,
  duration,
  events = [],
  isFullscreen = false,
  onSeek,
  onToggleFullscreen,
  className = ""
}: VideoPlaybackControlsProps) {
  
  // Video state
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  
  // Video control functions
  const handlePlayPause = () => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      if (video.paused) {
        video.play()
      } else {
        video.pause()
      }
    }
  }

  const handleSkip = (seconds: number) => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds))
      video.currentTime = newTime
    }
  }

  const handleVolumeToggle = () => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      if (isMuted) {
        video.volume = volume
        setIsMuted(false)
      } else {
        video.volume = 0
        setIsMuted(true)
      }
    }
  }

  const handleSpeedChange = (speed: number) => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      video.playbackRate = speed
      setPlaybackSpeed(speed)
      setShowSpeedMenu(false)
    }
  }

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }



  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  return (
    <div className={`grid grid-cols-3 items-end w-full ${className}`}>
      {/* Left Side: Time Display */}
      <div className="flex justify-start">
        <div className="bg-black/70 backdrop-blur-md rounded-lg border border-white/20 px-3 py-1.5 shadow-lg">
          <span className="text-xs font-mono text-white whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Center: Main Playback Controls */}
      <div className="flex justify-center">
        <div className="bg-black/70 backdrop-blur-md rounded-lg border border-white/20 px-3 py-1.5 shadow-lg">
          <div className="flex items-center gap-1">
            {/* Skip Back 5 seconds */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSkip(-5)}
              title="Back 5 seconds"
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>

            {/* Play/Pause - Main Control */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              className="h-8 w-10 mx-1 text-white hover:bg-white/20"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            {/* Skip Forward 5 seconds */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSkip(5)}
              title="Forward 5 seconds"
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side: Audio, Fullscreen and Playback Speed Controls */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          {/* Volume Control */}
          <div className="bg-black/70 backdrop-blur-md rounded-lg border border-white/20 p-1.5 shadow-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVolumeToggle}
              title={isMuted ? "Unmute" : "Mute"}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </Button>
          </div>

          {/* Fullscreen Control */}
          {onToggleFullscreen && (
            <div className="bg-black/70 backdrop-blur-md rounded-lg border border-white/20 p-1.5 shadow-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
              >
                {isFullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
              </Button>
            </div>
          )}

          {/* Playback Speed */}
          <div className="bg-black/70 backdrop-blur-md rounded-lg border border-white/20 p-1.5 shadow-lg relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              title="Playback speed"
              className="h-6 w-8 p-0 text-white hover:bg-white/20 text-xs"
            >
              {playbackSpeed}x
            </Button>
            
            {showSpeedMenu && (
              <div className="absolute bottom-10 right-0 bg-black/90 border border-white/20 rounded-md py-1 min-w-[60px]">
                {speedOptions.map(speed => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`block w-full px-2 py-1 text-xs text-white hover:bg-white/20 ${
                      speed === playbackSpeed ? 'bg-white/10' : ''
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 