'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Hls from 'hls.js'
import type { GameEvent } from './video-player/types'

interface VideoPlayerProps {
  game: {
    video_url: string
    hls_url?: string
    title: string
    metadata?: {
      teams?: {
        home_team?: { name: string; jersey_color: string }
        away_team?: { name: string; jersey_color: string }
      }
    }
  }
  events: GameEvent[]
  allEvents: GameEvent[]
  currentEventIndex: number
  onTimeUpdate: (currentTime: number, duration: number) => void
  onEventClick: (event: GameEvent) => void
  onSeekToTimestamp: (timestamp: number) => void
  onCurrentEventChange?: (eventIndex: number) => void
  overlayVisible?: boolean
  onUserInteract?: () => void
  // Event padding for autoplay mode
  eventPaddings?: Map<number, {
    beforePadding: number  // 0-15 seconds before event
    afterPadding: number   // 0-15 seconds after event
  }>
  activeTab?: string
  autoplayEvents?: boolean
}

export default function VideoPlayer({
  game,
  events,
  allEvents,
  currentEventIndex,
  onTimeUpdate,
  onEventClick,
  onSeekToTimestamp,
  onCurrentEventChange,
  overlayVisible = true,
  onUserInteract,
  eventPaddings,
  activeTab,
  autoplayEvents = false,
}: VideoPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [flashRegion, setFlashRegion] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const autoplayInitializedRef = useRef(false)
  const userSeekingRef = useRef(false)
  const lastSeekTimeRef = useRef(0)
  const userSeekTargetRef = useRef<number | null>(null)
  const paddingAdjustmentRef = useRef(false)
  
  // Preview segments state for autoplay mode
  const [previewSegments, setPreviewSegments] = useState<Array<{
    id: number
    start: number
    end: number
    event: GameEvent
  }>>([])
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0)

  // Check if we're in autoplay mode
  const isPreviewMode = autoplayEvents

  // Calculate preview segments when autoplay changes
  useEffect(() => {
    if (isPreviewMode && allEvents) {
      let segments: Array<{
        id: number
        start: number
        end: number
        event: GameEvent
      }> = []

      // Autoplay mode: use all events with individual padding
      segments = allEvents
        .map((event, index) => {
          // Get individual padding from event paddings or use defaults
          const padding = eventPaddings?.get(index) || { beforePadding: 5, afterPadding: 3 }
          return {
            id: index,
            start: Math.max(0, event.time - padding.beforePadding),
            end: event.time + padding.afterPadding,
            event
          }
        })
      
      // Sort segments by start time
      segments.sort((a, b) => a.start - b.start)
      
      // Preserve current segment context when recalculating
      const currentTime = videoRef.current?.currentTime || 0
      let newSegmentIndex = 0
      
      // Find which segment contains the current time
      if (segments.length > 0) {
        const currentSegIdx = segments.findIndex(seg => 
          currentTime >= seg.start && currentTime <= seg.end
        )
        if (currentSegIdx !== -1) {
          newSegmentIndex = currentSegIdx
        } else {
          // If not in any segment, find the closest upcoming segment
          const nextSegIdx = segments.findIndex(seg => seg.start > currentTime)
          newSegmentIndex = nextSegIdx !== -1 ? nextSegIdx : 0
        }
      }
      
      setPreviewSegments(segments)
      setCurrentSegmentIndex(newSegmentIndex)
      
      // Set padding adjustment flag to prevent immediate jumping
      paddingAdjustmentRef.current = true
      setTimeout(() => {
        paddingAdjustmentRef.current = false
      }, 1000)
    } else {
      setPreviewSegments([])
      setCurrentSegmentIndex(0)
    }
  }, [allEvents, isPreviewMode, autoplayEvents, eventPaddings])

  // Jump to first segment when autoplay is enabled
  useEffect(() => {
    if (autoplayEvents) {
      if (!autoplayInitializedRef.current && previewSegments.length > 0 && videoRef.current) {
        const firstSegment = previewSegments[0]
        videoRef.current.currentTime = firstSegment.start
        setCurrentSegmentIndex(0)
        autoplayInitializedRef.current = true
        if (onCurrentEventChange) {
          onCurrentEventChange(firstSegment.id)
        }
      }
    } else {
      autoplayInitializedRef.current = false
    }
  }, [autoplayEvents, previewSegments, onCurrentEventChange])

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Store video ref globally for external control
    ;(window as any).videoElement = video

    console.log('🎬 VideoPlayer initializing with:', {
      video_url: game.video_url,
      hls_url: game.hls_url,
      hasHlsSupport: Hls.isSupported(),
    })

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    // Try HLS first if supported and URL is available
    if (game.hls_url && Hls.isSupported()) {
      console.log('🎬 Initializing HLS with URL:', game.hls_url)
      
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        debug: false,
      })

      hls.loadSource(game.hls_url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest loaded successfully')
        // Autoplay when video is ready
        video.play().catch(err => console.log('Autoplay prevented:', err))
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS Error:', data)
        if (data.fatal) {
          console.log('🔄 HLS fatal error, falling back to MP4')
          video.src = game.video_url
        }
      })

      hlsRef.current = hls
    } else if (game.hls_url && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      console.log('🍎 Using native HLS support:', game.hls_url)
      video.src = game.hls_url
      video.onloadeddata = () => {
        video.play().catch(err => console.log('Autoplay prevented:', err))
      }
    } else {
      // Fallback to MP4
      console.log('📹 Using MP4 fallback:', game.video_url)
      if (game.video_url) {
        video.src = game.video_url
        video.onloadeddata = () => {
          video.play().catch(err => console.log('Autoplay prevented:', err))
        }
      } else {
        console.error('❌ No video URL available')
      }
    }

    // Cleanup on unmount
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [game.hls_url, game.video_url])

  // Jump to next segment in autoplay mode
  const jumpToNextSegment = useCallback(() => {
    const nextIndex = currentSegmentIndex + 1
    if (nextIndex < previewSegments.length) {
      setCurrentSegmentIndex(nextIndex)
      if (videoRef.current) {
        videoRef.current.currentTime = previewSegments[nextIndex].start
      }
      if (onCurrentEventChange && autoplayEvents) {
        onCurrentEventChange(previewSegments[nextIndex].id)
      }
    } else {
      // Loop back to first clip
      setCurrentSegmentIndex(0)
      if (videoRef.current) {
        videoRef.current.currentTime = previewSegments[0].start
      }
      if (onCurrentEventChange && autoplayEvents) {
        onCurrentEventChange(previewSegments[0].id)
      }
    }
  }, [currentSegmentIndex, previewSegments, onCurrentEventChange, autoplayEvents])

  // Jump to previous segment in autoplay mode
  const jumpToPrevSegment = useCallback(() => {
    const prevIndex = currentSegmentIndex - 1
    if (prevIndex >= 0) {
      setCurrentSegmentIndex(prevIndex)
      if (videoRef.current) {
        videoRef.current.currentTime = previewSegments[prevIndex].start
      }
      if (onCurrentEventChange && autoplayEvents) {
        onCurrentEventChange(previewSegments[prevIndex].id)
      }
    } else {
      // Loop to last clip
      const lastIndex = previewSegments.length - 1
      setCurrentSegmentIndex(lastIndex)
      if (videoRef.current) {
        videoRef.current.currentTime = previewSegments[lastIndex].start
      }
      if (onCurrentEventChange && autoplayEvents) {
        onCurrentEventChange(previewSegments[lastIndex].id)
      }
    }
  }, [currentSegmentIndex, previewSegments, onCurrentEventChange, autoplayEvents])

  // Keyboard shortcuts for event navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          if (isPreviewMode && previewSegments.length > 0) {
            jumpToNextSegment()
          } else {
            handleNextEvent()
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (isPreviewMode && previewSegments.length > 0) {
            jumpToPrevSegment()
          } else {
            handlePreviousEvent()
          }
          break
        case ' ':
          e.preventDefault()
          handlePlayPause()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPreviewMode, previewSegments.length, jumpToNextSegment, jumpToPrevSegment])

  // Get team colors from metadata
  const homeTeam = game.metadata?.teams?.home_team || { name: 'Home', jersey_color: '#000000' }
  const awayTeam = game.metadata?.teams?.away_team || { name: 'Away', jersey_color: '#FFFFFF' }
  
  // Convert team color descriptions to CSS colors
  const getTeamCSSColor = (jerseyColor: string) => {
    const color = jerseyColor.toLowerCase().trim()
    
    // Handle common GAA colors
    const colorMap: Record<string, string> = {
      'green': '#22C55E',
      'blue': '#3B82F6',
      'red': '#DC2626',
      'white': '#FFFFFF',
      'black': '#000000',
      'yellow': '#EAB308',
      'orange': '#F97316',
      'purple': '#A855F7',
      'navy': '#1E40AF',
    }
    
    const primaryColor = color.split(' ')[0]
    return colorMap[primaryColor] || jerseyColor
  }

  // Generate smart timeline background with team colors
  const generateSmartTimelineBackground = () => {
    if (!duration) return 'rgba(255,255,255,0.3)'
    
    // If no events, show simple progress
    if (!allEvents.length) {
      const progressPercent = (currentTime / duration) * 100
      return `linear-gradient(to right, #016F32 0%, #016F32 ${progressPercent}%, rgba(255,255,255,0.3) ${progressPercent}%, rgba(255,255,255,0.3) 100%)`
    }
    
    // Create timeline segments with team colors
    let gradientStops = []
    let lastEnd = 0
    
    // Sort events by timestamp
    const sortedEvents = [...allEvents].sort((a, b) => a.time - b.time)
    
    sortedEvents.forEach((event) => {
      const eventPercent = (event.time / duration) * 100
      const eventColor = getEventColor(event)
      
      // Add grey background before this event
      if (eventPercent > lastEnd) {
        gradientStops.push(`rgba(255,255,255,0.3) ${lastEnd}%`)
        gradientStops.push(`rgba(255,255,255,0.3) ${Math.max(0, eventPercent - 0.5)}%`)
      }
      
      // Add colored segment for this event
      const segmentStart = Math.max(0, eventPercent - 0.5)
      const segmentEnd = Math.min(100, eventPercent + 0.5)
      
      gradientStops.push(`${eventColor} ${segmentStart}%`)
      gradientStops.push(`${eventColor} ${segmentEnd}%`)
      
      lastEnd = segmentEnd
    })
    
    // Fill remainder with grey
    if (lastEnd < 100) {
      gradientStops.push(`rgba(255,255,255,0.3) ${lastEnd}%`)
      gradientStops.push(`rgba(255,255,255,0.3) 100%`)
    }
    
    return `linear-gradient(to right, ${gradientStops.join(', ')})`
  }

  // Get event color based on team
  const getEventColor = (event: GameEvent) => {
    const eventTeam = event.team?.toLowerCase() || ''
    
    // First check if event team is a direct color match (e.g., "black", "white")
    const eventTeamColor = getTeamCSSColor(eventTeam)
    if (eventTeamColor !== eventTeam) {
      // If getTeamCSSColor returned a hex color, it means it recognized the color
      return eventTeamColor
    }
    
    // Check if event team matches home team
    if (eventTeam === homeTeam.name.toLowerCase() || 
        eventTeam.includes(homeTeam.name.toLowerCase()) ||
        homeTeam.name.toLowerCase().includes(eventTeam) ||
        eventTeam === 'home') {
      return getTeamCSSColor(homeTeam.jersey_color)
    }
    
    // Check if event team matches away team
    if (eventTeam === awayTeam.name.toLowerCase() || 
        eventTeam.includes(awayTeam.name.toLowerCase()) ||
        awayTeam.name.toLowerCase().includes(eventTeam) ||
        eventTeam === 'away') {
      return getTeamCSSColor(awayTeam.jersey_color)
    }
    
    // Try to match by jersey color name
    const homeColorName = homeTeam.jersey_color.toLowerCase().trim()
    const awayColorName = awayTeam.jersey_color.toLowerCase().trim()
    if (eventTeam === homeColorName || eventTeam.includes(homeColorName) || homeColorName.includes(eventTeam)) {
      return getTeamCSSColor(homeTeam.jersey_color)
    }
    if (eventTeam === awayColorName || eventTeam.includes(awayColorName) || awayColorName.includes(eventTeam)) {
      return getTeamCSSColor(awayTeam.jersey_color)
    }
    
    // Fallback to home team color
    return getTeamCSSColor(homeTeam.jersey_color)
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime
      const dur = videoRef.current.duration || 0
      setCurrentTime(time)
      setDuration(dur)
      onTimeUpdate(time, dur)
      
      // Autoplay mode logic
      if (isPreviewMode && previewSegments.length > 0 && isPlaying) {
        if (userSeekingRef.current) {
          return
        }
        
        // Block if near user's recent seek target
        if (userSeekTargetRef.current !== null && Math.abs(time - userSeekTargetRef.current) < 2) {
          return
        }
        
        // Block if padding adjustment in progress
        if (paddingAdjustmentRef.current) {
          return
        }
        
        const currentSegment = previewSegments[currentSegmentIndex]
        
        // Check if we're in a clip segment
        const inClipSegment = previewSegments.some(seg => 
          time >= seg.start && time <= seg.end
        )
        
        if (!inClipSegment) {
          // We're in grey area - jump to next clip
          const nextSegment = previewSegments.find(seg => seg.start > time)
          if (nextSegment) {
            videoRef.current.currentTime = nextSegment.start
            const nextIndex = previewSegments.findIndex(seg => seg.id === nextSegment.id)
            setCurrentSegmentIndex(nextIndex)
            if (onCurrentEventChange && autoplayEvents) {
              onCurrentEventChange(nextSegment.id)
            }
          } else {
            // No more segments - stop playing
            videoRef.current.pause()
            setIsPlaying(false)
            setCurrentSegmentIndex(0)
          }
        } else if (currentSegment && time >= currentSegment.end) {
          // Hit end of current segment - advance
          const nextIndex = currentSegmentIndex + 1
          if (nextIndex < previewSegments.length) {
            setCurrentSegmentIndex(nextIndex)
            videoRef.current.currentTime = previewSegments[nextIndex].start
            if (onCurrentEventChange && autoplayEvents) {
              onCurrentEventChange(previewSegments[nextIndex].id)
            }
          } else {
            // No more segments - stop
            videoRef.current.pause()
            setIsPlaying(false)
          }
        }
      }
    }
  }

  const triggerFlash = (region: string, action: () => void) => {
    setFlashRegion(region)
    setTimeout(() => setFlashRegion(null), 150)
    action()
    if (onUserInteract) onUserInteract()
  }

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        // When starting in autoplay mode, ensure we're in a valid segment
        if (isPreviewMode && previewSegments.length > 0) {
          const currentTime = videoRef.current.currentTime
          const currentSegment = previewSegments.find(seg => 
            currentTime >= seg.start && currentTime <= seg.end
          )
          
          if (!currentSegment) {
            const firstSegment = previewSegments[0]
            videoRef.current.currentTime = firstSegment.start
            setCurrentSegmentIndex(0)
          }
        }
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(videoRef.current.muted)
    }
  }

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      setPlaybackSpeed(speed)
    }
  }

  const handleZoomChange = (zoom: number) => {
    setZoomLevel(zoom)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleJumpBackward = () => {
    if (videoRef.current && duration > 0) {
      const newTime = Math.max(0, currentTime - 5)
      if (videoRef.current.readyState >= 2) {
        videoRef.current.currentTime = newTime
        setCurrentTime(newTime)
      }
    }
  }

  const handleJumpForward = () => {
    if (videoRef.current && duration > 0) {
      const newTime = Math.min(duration, currentTime + 5)
      if (videoRef.current.readyState >= 2) {
        videoRef.current.currentTime = newTime
        setCurrentTime(newTime)
      }
    }
  }

  const handlePreviousEvent = () => {
    if (!events || events.length === 0) return
    const currentFilteredIndex = events.findIndex(event => 
      allEvents.indexOf(event) === currentEventIndex
    )
    if (currentFilteredIndex > 0) {
      const prevEvent = events[currentFilteredIndex - 1]
      onEventClick(prevEvent)
    }
  }

  const handleNextEvent = () => {
    if (!events || events.length === 0) return
    const currentFilteredIndex = events.findIndex(event => 
      allEvents.indexOf(event) === currentEventIndex
    )
    if (currentFilteredIndex < events.length - 1) {
      const nextEvent = events[currentFilteredIndex + 1]
      onEventClick(nextEvent)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Expose seek function with user seeking protection
  useEffect(() => {
    const seek = (timestamp: number) => {
      if (videoRef.current) {
        const now = Date.now()
        
        // Debounce rapid clicks
        if (now - lastSeekTimeRef.current < 100) {
          return
        }
        
        lastSeekTimeRef.current = now
        
        // Set user seeking flag to prevent autoplay interference
        userSeekingRef.current = true
        userSeekTargetRef.current = timestamp
        
        // If in autoplay mode, update segment index
        if (isPreviewMode && previewSegments.length > 0) {
          const targetSegmentIndex = previewSegments.findIndex(seg => 
            timestamp >= seg.start && timestamp <= seg.end
          )
          if (targetSegmentIndex !== -1) {
            setCurrentSegmentIndex(targetSegmentIndex)
          }
        }
        
        videoRef.current.currentTime = timestamp
        if (videoRef.current.paused) {
          videoRef.current.play()
        }
        
        // Clear flag after delay
        setTimeout(() => {
          userSeekingRef.current = false
        }, 1000)
        
        // Clear seek target after longer delay
        setTimeout(() => {
          userSeekTargetRef.current = null
        }, 5000)
      }
    }
    
    ;(window as any).videoPlayerSeek = seek
  }, [isPreviewMode, previewSegments])

  return (
    <div
      className="relative h-full flex items-center justify-center overflow-hidden bg-black"
      onMouseMove={onUserInteract}
      onClick={onUserInteract}
      onKeyDown={onUserInteract as any}
      role="presentation"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-[105%] h-[105%] object-contain transition-transform duration-200"
        style={{ 
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center'
        }}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => {
          const target = e.target as HTMLVideoElement
          console.error('❌ Video loading failed:', {
            error: target.error,
            errorCode: target.error?.code,
            errorMessage: target.error?.message,
            src: target.src,
          })
        }}
        preload="metadata"
        autoPlay
        playsInline
        controls={false}
        webkit-playsinline="true"
        x-webkit-airplay="deny"
      />

      {/* Voronoi Diagram - Invisible Tap Regions */}
      <div className="absolute inset-0 z-20 pointer-events-auto">
        {/* Previous Event Region - Left 20% */}
        <div
          className="absolute top-0 left-0 w-1/5 h-full cursor-pointer"
          onClick={() => triggerFlash('prev', handlePreviousEvent)}
        >
          <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ${
            flashRegion === 'prev' ? 'opacity-20' : 'opacity-0'
          }`} />
        </div>

        {/* -5s Region - Left-Center 20% */}
        <div
          className="absolute top-0 left-1/5 w-1/5 h-full cursor-pointer"
          onClick={() => triggerFlash('back', handleJumpBackward)}
        >
          <div className={`absolute inset-0 bg-yellow-500 pointer-events-none transition-opacity duration-150 ${
            flashRegion === 'back' ? 'opacity-20' : 'opacity-0'
          }`} />
        </div>

        {/* Play/Pause Region - Center 20% */}
        <div
          className="absolute top-0 left-2/5 w-1/5 h-full cursor-pointer"
          onClick={() => triggerFlash('play', handlePlayPause)}
        >
          <div className={`absolute inset-0 bg-green-500 pointer-events-none transition-opacity duration-150 ${
            flashRegion === 'play' ? 'opacity-30' : 'opacity-0'
          }`} />
        </div>

        {/* +5s Region - Right-Center 20% */}
        <div
          className="absolute top-0 left-3/5 w-1/5 h-full cursor-pointer"
          onClick={() => triggerFlash('forward', handleJumpForward)}
        >
          <div className={`absolute inset-0 bg-orange-500 pointer-events-none transition-opacity duration-150 ${
            flashRegion === 'forward' ? 'opacity-20' : 'opacity-0'
          }`} />
        </div>

        {/* Next Event Region - Right 20% */}
        <div
          className="absolute top-0 left-4/5 w-1/5 h-full cursor-pointer"
          onClick={() => triggerFlash('next', handleNextEvent)}
        >
          <div className={`absolute inset-0 bg-purple-500 pointer-events-none transition-opacity duration-150 ${
            flashRegion === 'next' ? 'opacity-20' : 'opacity-0'
          }`} />
        </div>
      </div>

      {/* Floating Play Controls */}
      <div
        className={`absolute bottom-16 left-0 right-0 flex items-center justify-center z-30 transition-opacity duration-300 ${
          overlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center space-x-8">
          {/* Previous Event */}
          <button
            onClick={() => triggerFlash('prev', handlePreviousEvent)}
            disabled={events.length === 0}
            className="flex items-center justify-center text-white hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous Event"
            style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.8))' }}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Jump Backward 5s */}
          <button
            onClick={() => triggerFlash('back', handleJumpBackward)}
            className="flex items-center justify-center text-white hover:text-gray-300 transition-colors text-lg font-bold"
            title="Jump Backward 5s"
            style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.8))' }}
          >
            -5s
          </button>

          {/* Play/Pause - LARGE CENTER BUTTON */}
          <button
            onClick={() => triggerFlash('play', handlePlayPause)}
            className="flex items-center justify-center text-white hover:text-gray-300 transition-colors"
            style={{ filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.9))' }}
          >
            {isPlaying ? (
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-16 h-16 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Jump Forward 5s */}
          <button
            onClick={() => triggerFlash('forward', handleJumpForward)}
            className="flex items-center justify-center text-white hover:text-gray-300 transition-colors text-lg font-bold"
            title="Jump Forward 5s"
            style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.8))' }}
          >
            +5s
          </button>

          {/* Next Event */}
          <button
            onClick={() => triggerFlash('next', handleNextEvent)}
            disabled={events.length === 0}
            className="flex items-center justify-center text-white hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next Event"
            style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.8))' }}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress Bar + Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 transition-opacity duration-300 ${
          overlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-transparent">
          {/* Bottom Timeline Bar */}
          <div className="mx-3 sm:mx-6 mb-[max(env(safe-area-inset-bottom),8px)]">
            <div className="flex items-center space-x-3">
              {/* Current Time */}
              <span className="text-white text-sm font-mono whitespace-nowrap">
                {formatTime(currentTime)}
              </span>

              {/* Progress Bar */}
              <div className="flex-1 relative min-w-0">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
                  style={{
                    background: generateSmartTimelineBackground()
                  }}
                />
              </div>

              {/* Duration */}
              <span className="text-white/80 text-sm font-mono whitespace-nowrap">
                {formatTime(duration)}
              </span>

              {/* Volume */}
              <button
                onClick={handleMuteToggle}
                className="flex items-center justify-center w-6 h-6 text-white hover:text-gray-300 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>

              {/* Playback Speed */}
              <div className="relative group">
                <button
                  className="flex items-center justify-center w-8 h-6 text-white hover:text-gray-300 transition-colors text-xs font-mono"
                  title="Playback Speed"
                >
                  {playbackSpeed}x
                </button>
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-8 h-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"></div>
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/90 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shadow-lg">
                  <div className="flex flex-col gap-1">
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-3 py-2 text-xs rounded transition-colors whitespace-nowrap ${
                          playbackSpeed === speed 
                            ? 'bg-[#2D8B4D] text-white' 
                            : 'text-white hover:bg-white/20'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Zoom */}
              <div className="relative group">
                <button
                  className="flex items-center justify-center w-6 h-6 text-white hover:text-gray-300 transition-colors"
                  title="Zoom"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-6 h-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"></div>
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/90 rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto shadow-lg">
                  <div className="flex flex-col gap-3 items-center">
                    <span className="text-xs text-white font-mono">{Math.round(zoomLevel * 100)}%</span>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={zoomLevel}
                      onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                      className="w-24 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <button
                      onClick={() => handleZoomChange(1)}
                      className="px-3 py-1 text-xs rounded bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
