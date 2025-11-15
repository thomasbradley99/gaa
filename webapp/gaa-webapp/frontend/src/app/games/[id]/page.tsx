'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { games, auth, getToken } from '@/lib/api-client'
import Sidebar from '@/components/shared/Sidebar'
import VideoPlayer from '@/components/games/VideoPlayer'
import GameHeader from '@/components/games/GameHeader'
import UnifiedSidebar from '@/components/games/UnifiedSidebar'
import type { GameEvent } from '@/components/games/video-player/types'
import { transformDatabaseEventsToGameEvents } from '@/lib/event-transformer'

export default function GameDetailPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.id as string

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

  // Parse events from game data
  // Check if events are in GAA Events Schema format (from AI pipeline)
  const gameEvents: GameEvent[] = game?.events
    ? (() => {
        // If events is an object with 'events' array (GAA Events Schema format)
        if (game.events && typeof game.events === 'object' && 'events' in game.events) {
          return transformDatabaseEventsToGameEvents(game.events as any)
        }
        // If events is already an array (legacy format)
        if (Array.isArray(game.events)) {
          return game.events.map((e: any, index: number) => ({
            id: e.id || `event-${index}`,
            type: e.type || 'shot',
            timestamp: e.timestamp || e.time || 0,
            team: e.team === 'home' || e.team === 'red' ? 'home' : 'away',
            player: e.player,
            description: e.description || e.action,
            metadata: e.metadata,
          }))
        }
        return []
      })()
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
        return time >= event.timestamp && (!nextEvent || time < nextEvent.timestamp)
      })
      if (eventIndex !== -1) {
        setCurrentEventIndex(eventIndex)
      }
    }
  }

  const handleEventClick = (event: GameEvent) => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      video.currentTime = event.timestamp
      video.play()
      setCurrentTime(event.timestamp)
    }
  }

  const seekToTimestamp = (timestamp: number) => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      video.currentTime = timestamp
      if (video.paused) {
        video.play()
      }
    }
  }

  // Filter events based on team filter
  const filteredEvents = teamFilter === 'all' 
    ? gameEvents 
    : gameEvents.filter(event => event.team === teamFilter)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading game...</div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error || 'Game not found'}</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            Back to Games
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-black">
      {/* Left Navigation - Toggleable */}
      <div
        className={`transition-all duration-300 ${
          showLeftSidebar ? 'w-64' : 'w-0'
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
        />

        <div 
          className="flex-1 relative transition-all duration-300"
          style={{
            marginRight: showRightSidebar ? '400px' : '0'
          }}
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
        currentTime={currentTime}
        duration={duration}
        onEventClick={handleEventClick}
        teamFilter={teamFilter}
        onTeamFilterChange={setTeamFilter}
      />
    </div>
  )
}

