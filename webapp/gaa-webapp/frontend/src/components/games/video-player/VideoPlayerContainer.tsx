'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AdaptiveVideoPlayer } from './AdaptiveVideoPlayer'
import { VideoPlaybackControls } from './VideoPlaybackControls'
import { VideoOverlayTimeline } from './VideoOverlayTimeline'
import type { VideoPlayerContainerProps } from './types'

export function VideoPlayerContainer({
  videoUrl,
  hlsUrl,
  events = [],
  onTimeUpdate,
  onSeek,
  className = '',
  showTimeline = true,
  showControls = true,
  teamFilter = 'all',
}: VideoPlayerContainerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [showControlsOverlay, setShowControlsOverlay] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [flashRegion, setFlashRegion] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isHoveringRef = useRef(false)

  // Handle time updates from video
  const handleTimeUpdate = useCallback(
    (time: number, dur: number, playing: boolean) => {
      setCurrentTime(time)
      setDuration(dur)
      setIsPlaying(playing)
      onTimeUpdate?.(time, dur, playing)
    },
    [onTimeUpdate]
  )

  // Handle seek
  const handleSeek = useCallback(
    (time: number) => {
      const video = (window as any).videoElement as HTMLVideoElement
      if (video) {
        video.currentTime = time
        setCurrentTime(time)
        onSeek?.(time)
      }
    },
    [onSeek]
  )

  // Play/pause
  const handlePlayPause = useCallback(() => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      if (video.paused) {
        const playPromise = video.play()
        if (playPromise !== undefined) {
          playPromise.catch(error => console.log('Play interrupted:', error))
        }
      } else {
        video.pause()
      }
    }
  }, [])

  // Skip backward/forward
  const handleSkipBackward = useCallback(() => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      const newTime = Math.max(0, video.currentTime - 5)
      video.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [])

  const handleSkipForward = useCallback(() => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      const newTime = Math.min(video.duration || 0, video.currentTime + 5)
      video.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [])

  // Mute toggle
  const handleMuteToggle = useCallback(() => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      video.muted = !video.muted
      setIsMuted(video.muted)
    }
  }, [])

  // Playback speed control
  const handleSpeedChange = useCallback((speed: number) => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      video.playbackRate = speed
      setPlaybackSpeed(speed)
    }
  }, [])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.25, 1))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1)
  }, [])

  // Event navigation
  const handleNextEvent = useCallback(() => {
    if (events.length === 0) return
    const currentEventIndex = events.findIndex(e => e.time > currentTime)
    if (currentEventIndex !== -1 && events[currentEventIndex]) {
      handleSeek(events[currentEventIndex].time)
    }
  }, [events, currentTime, handleSeek])

  const handlePrevEvent = useCallback(() => {
    if (events.length === 0) return
    const prevEvents = events.filter(e => e.time < currentTime - 2)
    if (prevEvents.length > 0) {
      const lastPrevEvent = prevEvents[prevEvents.length - 1]
      handleSeek(lastPrevEvent.time)
    }
  }, [events, currentTime, handleSeek])

  // Flash feedback for tap regions
  const triggerFlash = useCallback((region: string, callback: () => void) => {
    setFlashRegion(region)
    setTimeout(() => setFlashRegion(null), 150)
    callback()
  }, [])

  // Auto-hide controls logic
  const showControlsTemporarily = useCallback(() => {
    setShowControlsOverlay(true)
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (!isHoveringRef.current && isPlaying) {
        setShowControlsOverlay(false)
      }
    }, 3000)
  }, [isPlaying])

  // Handle container interactions
  const handlePointerEnter = () => {
    isHoveringRef.current = true
    setShowControlsOverlay(true)
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
  }

  const handlePointerLeave = () => {
    isHoveringRef.current = false
    if (isPlaying) {
      setShowControlsOverlay(false)
    }
  }

  const handlePointerMove = () => {
    showControlsTemporarily()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          handlePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleSkipBackward()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleSkipForward()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          handleMuteToggle()
          break
        case '+':
        case '=':
          e.preventDefault()
          handleZoomIn()
          break
        case '-':
        case '_':
          e.preventDefault()
          handleZoomOut()
          break
        case '0':
          e.preventDefault()
          handleZoomReset()
          break
        case ',':
        case '<':
          e.preventDefault()
          handlePrevEvent()
          break
        case '.':
        case '>':
          e.preventDefault()
          handleNextEvent()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    handlePlayPause,
    handleSkipBackward,
    handleSkipForward,
    handleMuteToggle,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handlePrevEvent,
    handleNextEvent,
  ])

  // Cleanup
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden aspect-video w-full ${className}`}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      onClick={showControlsTemporarily}
    >
      {/* Video Player with Zoom */}
      <div
        className="w-full h-full transition-transform duration-200"
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
        }}
      >
        <AdaptiveVideoPlayer
          hlsUrl={hlsUrl}
          mp4Url={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={(dur) => setDuration(dur)}
          className="w-full h-full"
        />
      </div>

      {/* Voronoi Tap Regions - Invisible touch zones for mobile */}
      <div className="absolute inset-0 z-20 pointer-events-auto md:hidden">
        {/* Previous Event Region - Left 20% */}
        <div
          className="absolute top-0 left-0 w-1/5 h-full cursor-pointer"
          onClick={() => triggerFlash('prev', handlePrevEvent)}
        >
          <div
            className={`absolute inset-0 bg-[#2D8B4D] pointer-events-none transition-opacity duration-150 ${
              flashRegion === 'prev' ? 'opacity-20' : 'opacity-0'
            }`}
          />
        </div>

        {/* -5s Region - Left-Center 20% */}
        <div
          className="absolute top-0 left-1/5 w-1/5 h-full cursor-pointer"
          onClick={() => triggerFlash('back', handleSkipBackward)}
        >
          <div
            className={`absolute inset-0 bg-yellow-500 pointer-events-none transition-opacity duration-150 ${
              flashRegion === 'back' ? 'opacity-20' : 'opacity-0'
            }`}
          />
        </div>

        {/* Play/Pause Region - Center 20% */}
        <div
          className="absolute top-0 left-2/5 w-1/5 h-full cursor-pointer"
          onClick={() => triggerFlash('play', handlePlayPause)}
        >
          <div
            className={`absolute inset-0 bg-green-500 pointer-events-none transition-opacity duration-150 ${
              flashRegion === 'play' ? 'opacity-30' : 'opacity-0'
            }`}
          />
        </div>

        {/* +5s Region - Right-Center 20% */}
        <div
          className="absolute top-0 left-3/5 w-1/5 h-full cursor-pointer"
          onClick={() => triggerFlash('forward', handleSkipForward)}
        >
          <div
            className={`absolute inset-0 bg-orange-500 pointer-events-none transition-opacity duration-150 ${
              flashRegion === 'forward' ? 'opacity-20' : 'opacity-0'
            }`}
          />
        </div>

        {/* Next Event Region - Right 20% */}
        <div
          className="absolute top-0 left-4/5 w-1/5 h-full cursor-pointer"
          onClick={() => triggerFlash('next', handleNextEvent)}
        >
          <div
            className={`absolute inset-0 bg-purple-500 pointer-events-none transition-opacity duration-150 ${
              flashRegion === 'next' ? 'opacity-20' : 'opacity-0'
            }`}
          />
        </div>
      </div>

      {/* Zoom & Speed Controls - Top Right */}
      <div
        className={`absolute top-4 right-4 z-30 flex flex-col gap-2 transition-opacity duration-300 ${
          showControlsOverlay || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Playback Speed */}
        <div className="bg-black/80 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-white text-xs font-medium">Speed:</span>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`text-xs px-2 py-1 rounded ${
                playbackSpeed === speed
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="bg-black/80 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-white text-xs font-medium">Zoom:</span>
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel === 1}
            className="text-white text-lg px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            −
          </button>
          <span className="text-white text-xs font-mono min-w-[3rem] text-center">
            {(zoomLevel * 100).toFixed(0)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel === 2}
            className="text-white text-lg px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            +
          </button>
          {zoomLevel !== 1 && (
            <button
              onClick={handleZoomReset}
              className="text-white text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-700"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Event Timeline Overlay */}
      {showTimeline && events.length > 0 && (
        <VideoOverlayTimeline
          events={events}
          duration={duration}
          currentTime={currentTime}
          onSeek={handleSeek}
          teamFilter={teamFilter}
        />
      )}

      {/* Playback Controls Overlay */}
      {showControls && (
        <VideoPlaybackControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onSkipBackward={handleSkipBackward}
          onSkipForward={handleSkipForward}
          onMuteToggle={handleMuteToggle}
          isMuted={isMuted}
          showControls={showControlsOverlay || !isPlaying}
        />
      )}

      {/* Click overlay to show controls */}
      {!showControlsOverlay && isPlaying && (
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={showControlsTemporarily}
          aria-label="Show controls"
        />
      )}
    </div>
  )
}

