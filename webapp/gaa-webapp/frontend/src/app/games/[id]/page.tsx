'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { games, auth, getToken } from '@/lib/api-client'
import Sidebar from '@/components/shared/Sidebar'
import VideoPlayer from '@/components/games/VideoPlayer'
import GameHeader from '@/components/games/GameHeader'
import UnifiedSidebar from '@/components/games/UnifiedSidebar'
import type { GameEvent } from '@/components/games/video-player/types'
import { useOrientation } from '@/hooks/useOrientation'
import { calculateScore } from '@/lib/score-calculator'

// Mobile Video Player Component with auto-hide overlay (YouTube-style)
function MobileVideoPlayer({
  game,
  filteredEvents,
  allEvents,
  currentEventIndex,
  handleTimeUpdate,
  handleEventClick,
  seekToTimestamp,
  eventPaddings,
}: {
  game: any
  filteredEvents: GameEvent[]
  allEvents: GameEvent[]
  currentEventIndex: number
  handleTimeUpdate: (time: number, duration: number) => void
  handleEventClick: (event: GameEvent) => void
  seekToTimestamp: (timestamp: number) => void
  eventPaddings?: Map<number, { beforePadding: number, afterPadding: number }>
}) {
  const [showOverlay, setShowOverlay] = useState(true)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-hide overlay after 4 seconds
  const resetHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    
    setShowOverlay(true)
    hideTimeoutRef.current = setTimeout(() => {
      setShowOverlay(false)
    }, 4000)
  }, [])

  // Toggle overlay on tap
  const handleVideoTap = useCallback(() => {
    if (showOverlay) {
      setShowOverlay(false)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    } else {
      resetHideTimer()
    }
  }, [showOverlay, resetHideTimer])

  // Reset timer on mount
  useEffect(() => {
    resetHideTimer()
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [resetHideTimer])

  const score = calculateScore(allEvents)
  const hasScore = score.home.goals > 0 || score.home.points > 0 || score.away.goals > 0 || score.away.points > 0

  return (
    <div className="relative" onClick={handleVideoTap}>
      {/* Mobile Game Header - fades in/out */}
      <div 
        className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/90 to-transparent p-4 transition-opacity duration-300 ${
          showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="text-white">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold truncate flex-1">{game.title}</h1>
            {hasScore && (
              <div className="flex items-center gap-2 text-sm font-mono bg-black/60 px-3 py-1 rounded-lg border border-white/20">
                <span className="font-bold">{score.home.display}</span>
                <span className="text-white/40">-</span>
                <span className="font-bold">{score.away.display}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 10 Minute Analysis Banner - Mobile */}
      <div className="absolute top-16 left-0 right-0 z-10 bg-yellow-500/90 px-3 py-2 text-black text-xs flex items-center gap-2">
        <span>ℹ️</span>
        <span className="font-medium">Only first 10 minutes analyzed</span>
      </div>
      
      {/* Video Player - full width, aspect ratio maintained */}
      <div 
        className="w-full aspect-video bg-black relative"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <VideoPlayer
          game={game}
          events={filteredEvents}
          allEvents={allEvents}
          currentEventIndex={currentEventIndex}
          onTimeUpdate={handleTimeUpdate}
          onEventClick={handleEventClick}
          onSeekToTimestamp={seekToTimestamp}
          overlayVisible={showOverlay}
          onUserInteract={resetHideTimer}
          eventPaddings={eventPaddings}
        />
      </div>
    </div>
  )
}

export default function GameDetailPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.id as string
  const { isPortrait, isLandscape } = useOrientation()

  const [user, setUser] = useState<any>(null)
  const [game, setGame] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentEventIndex, setCurrentEventIndex] = useState(-1)
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [teamFilter, setTeamFilter] = useState<'all' | 'home' | 'away'>('all')
  const [eventPaddings, setEventPaddings] = useState<Map<number, { beforePadding: number, afterPadding: number }>>(new Map())
  const [autoplayEnabled, setAutoplayEnabled] = useState(false)

  // Events from database - now using master schema directly (no transformation needed)
  const gameEvents: GameEvent[] = game?.events && Array.isArray(game.events) 
    ? game.events 
    : []

  const fetchUserData = async () => {
    try {
      const userData = await auth.me()
      setUser(userData.user)
    } catch (err) {
      router.push('/')
    }
  }

  const fetchGame = async () => {
    try {
      const data = await games.get(gameId)
      setGame(data.game)
    } catch (err: any) {
      setError(err.message || 'Failed to load game')
      console.error('Failed to fetch game:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/')
      return
    }

    const init = async () => {
      await fetchUserData()
      await fetchGame()
    }

    init()
  }, [router, gameId])

  // Poll for game updates if status is 'pending' (Lambda is downloading)
  useEffect(() => {
    if (!game || game.status !== 'pending') return

    const pollInterval = setInterval(async () => {
      try {
        const data = await games.get(gameId)
        const updatedGame = data.game
        
        // If s3_key is now set, update the game and stop polling
        if (updatedGame.s3_key && !game.s3_key) {
          setGame(updatedGame)
          clearInterval(pollInterval)
        } else if (updatedGame.status !== 'pending') {
          // Status changed (analyzed/failed), update and stop polling
          setGame(updatedGame)
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error('Error polling game status:', err)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [game, gameId])

  const handleTimeUpdate = (time: number, dur: number) => {
    setCurrentTime(time)
    setDuration(dur)
    
    // Update current event index based on time
    if (gameEvents.length > 0) {
      const eventIndex = gameEvents.findIndex((event, index) => {
        const nextEvent = gameEvents[index + 1]
        return time >= event.time && (!nextEvent || time < nextEvent.time)
      })
      if (eventIndex !== -1) {
        setCurrentEventIndex(eventIndex)
      }
    }
  }

  const handleEventClick = (event: GameEvent) => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      // Find the event index to get its padding
      const eventIndex = gameEvents.findIndex(e => e.id === event.id)
      const padding = eventPaddings.get(eventIndex) || { beforePadding: 5, afterPadding: 3 }
      
      // Jump to trimmer start (5s before event by default)
      const startTime = Math.max(0, event.time - padding.beforePadding)
      video.currentTime = startTime
      
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(error => console.log('Play interrupted:', error))
      }
      // Don't manually set currentTime - let video's timeupdate event handle it
    }
  }

  const seekToTimestamp = (timestamp: number) => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      video.currentTime = timestamp
      if (video.paused) {
        const playPromise = video.play()
        if (playPromise !== undefined) {
          playPromise.catch(error => console.log('Play interrupted:', error))
        }
      }
    }
  }

  // Handle XML upload
  const handleEventsUploaded = (events: GameEvent[]) => {
    console.log(`📤 Uploaded ${events.length} events`)
    // Events are already in master schema format - just refresh from DB
    fetchGame()
  }

  // Handle event updates from edit mode
  const handleEventsUpdate = (updatedEvents: GameEvent[]) => {
    console.log(`📝 Updated ${updatedEvents.length} events`)
    // Events are already in master schema format - just refresh from DB
    fetchGame()
  }

  // Filter events based on team filter
  const filteredEvents = teamFilter === 'all' 
    ? gameEvents 
    : gameEvents.filter(event => event.team === teamFilter)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <img 
          src="/clann-logo-white.png" 
          alt="Clann AI" 
          className="w-20 h-20 animate-pulse"
        />
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error || 'Game not found'}</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 text-white rounded-lg"
          >
            Back to Matches
          </button>
        </div>
      </div>
    )
  }

  // Desktop/Landscape Layout
  if (isLandscape) {
    return (
      <div className="flex h-screen bg-black">
        {/* Left Navigation - Toggleable */}
        <div
          className={`transition-all duration-300 ${
            showLeftSidebar ? 'w-56' : 'w-0'
          } overflow-hidden`}
        >
          <Sidebar user={user} />
        </div>

        {/* Middle - Video Fullscreen */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <GameHeader
            game={game}
            currentTime={currentTime}
            showRightSidebar={showRightSidebar}
            showLeftSidebar={showLeftSidebar}
            onToggleRightSidebar={() => setShowRightSidebar(!showRightSidebar)}
            onToggleLeftSidebar={() => setShowLeftSidebar(!showLeftSidebar)}
            events={gameEvents}
          />

          {/* 10 Minute Analysis Banner */}
          <div className="bg-yellow-500/10 border-l-4 border-yellow-500 px-4 py-2 text-yellow-200 text-sm flex items-center gap-2">
            <span className="text-yellow-500">ℹ️</span>
            <span>Only the first 10 minutes of the match have been analyzed</span>
          </div>

          <div
            className="flex-1 relative transition-all duration-300"
            style={showRightSidebar ? { marginRight: '360px' } : { marginRight: '0' }}
          >
            {game.video_url ? (
              <VideoPlayer
                game={{
                  video_url: game.video_url,
                  hls_url: game.hls_url,
                  title: game.title,
                }}
                events={filteredEvents}
                allEvents={gameEvents}
                currentEventIndex={currentEventIndex}
                onTimeUpdate={handleTimeUpdate}
                onEventClick={handleEventClick}
                onSeekToTimestamp={seekToTimestamp}
                eventPaddings={eventPaddings}
                autoplayEvents={autoplayEnabled}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <p className="text-lg mb-2">Video not available</p>
                  <p className="text-sm">
                    {game.status === 'pending'
                      ? 'Video is being processed...'
                      : game.s3_key
                      ? 'Video URL is being generated...'
                      : 'No video URL found'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Toggleable */}
        <UnifiedSidebar
          isOpen={showRightSidebar}
          onClose={() => setShowRightSidebar(false)}
          game={game}
          events={filteredEvents}
          allEvents={gameEvents}
          currentTime={currentTime}
          duration={duration}
          onEventClick={handleEventClick}
          teamFilter={teamFilter}
          onTeamFilterChange={setTeamFilter}
          onEventsUploaded={handleEventsUploaded}
          onEventsUpdate={handleEventsUpdate}
          onEventPaddingsChange={setEventPaddings}
          onAutoplayChange={setAutoplayEnabled}
        />
      </div>
    )
  }

  // Mobile/Portrait Layout (YouTube-style)
  return (
    <div className="min-h-screen bg-black">
      <UnifiedSidebar
        isOpen={true} // Always open on mobile
        onClose={() => {}} // No close on mobile
        isMobile={true}
        mobileVideoComponent={
          game.video_url ? (
            <MobileVideoPlayer
              game={{
                video_url: game.video_url,
                hls_url: game.hls_url,
                title: game.title,
              }}
              filteredEvents={filteredEvents}
              allEvents={gameEvents}
              currentEventIndex={currentEventIndex}
              handleTimeUpdate={handleTimeUpdate}
              handleEventClick={handleEventClick}
              seekToTimestamp={seekToTimestamp}
              eventPaddings={eventPaddings}
            />
          ) : (
            <div className="w-full aspect-video bg-black flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-lg mb-2">Video not available</p>
                <p className="text-sm">
                  {game.status === 'pending'
                    ? 'Video is being processed...'
                    : 'No video URL found'}
                </p>
              </div>
            </div>
          )
        }
        game={game}
        events={filteredEvents}
        allEvents={gameEvents}
        currentTime={currentTime}
        duration={duration}
        onEventClick={handleEventClick}
        teamFilter={teamFilter}
        onTeamFilterChange={setTeamFilter}
        onEventsUploaded={handleEventsUploaded}
        onEventsUpdate={handleEventsUpdate}
        onEventPaddingsChange={setEventPaddings}
        onAutoplayChange={setAutoplayEnabled}
      />
    </div>
  )
}

