'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Target, AlertTriangle, Square, Circle } from 'lucide-react'
import type { VideoOverlayTimelineProps, GameEvent } from './types'

export function VideoOverlayTimeline({
  events,
  duration,
  currentTime,
  onSeek,
  teamFilter = 'all',
  selectedEventTypes = [],
}: VideoOverlayTimelineProps) {
  const [hoveredEvent, setHoveredEvent] = useState<GameEvent | null>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get color for team
  const getTeamColor = (team?: string) => {
    if (team === 'home' || team === 'red') return 'bg-green-500 border-green-700'
    if (team === 'away' || team === 'blue') return 'bg-yellow-400 border-yellow-600'
    return 'bg-gray-500 border-gray-700' // Default for unknown teams
  }

  // Get icon for event type
  const getEventIcon = (type: GameEvent['type']) => {
    switch (type) {
      case 'score':
        return <Target className="h-3 w-3" />
      case 'point':
        return <Circle className="h-3 w-3" />
      case 'foul':
        return <AlertTriangle className="h-3 w-3" />
      case 'card':
        return <Square className="h-3 w-3" />
      case 'substitution':
        return <ChevronRight className="h-3 w-3" />
      default:
        return <Circle className="h-3 w-3" />
    }
  }

  // Filtered events
  const filteredEvents = useMemo(
    () =>
      events.filter((e) => {
        const teamMatch = teamFilter === 'all' || e.team === teamFilter
        if (selectedEventTypes.length === 0) return teamMatch
        return teamMatch && selectedEventTypes.includes(e.type)
      }),
    [events, teamFilter, selectedEventTypes]
  )

  // Current event (last event at or before currentTime)
  const currentEvent = useMemo(() => {
    return (
      filteredEvents
        .filter((e) => e.timestamp <= currentTime)
        .sort((a, b) => b.timestamp - a.timestamp)[0] || null
    )
  }, [filteredEvents, currentTime])

  // Next/previous event
  const prevEvent = useMemo(() => {
    return (
      filteredEvents
        .filter((e) => e.timestamp < (currentEvent?.timestamp ?? currentTime))
        .sort((a, b) => b.timestamp - a.timestamp)[0] || null
    )
  }, [filteredEvents, currentEvent, currentTime])

  const nextEvent = useMemo(() => {
    return (
      filteredEvents
        .filter((e) => e.timestamp > (currentEvent?.timestamp ?? currentTime))
        .sort((a, b) => a.timestamp - b.timestamp)[0] || null
    )
  }, [filteredEvents, currentEvent, currentTime])

  // Handle click on timeline
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * duration
    onSeek(time)
  }

  // Handle marker click
  const handleMarkerClick = (event: GameEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    onSeek(event.timestamp)
  }

  if (duration === 0) return null

  return (
    <div className="absolute left-0 right-0 bottom-20 z-40 px-4">
      {/* Event Navigation HUD */}
      {currentEvent && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg bg-black/80 backdrop-blur-sm border border-white/20">
            {/* Prev event */}
            <button
              className="p-1 rounded-full hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => prevEvent && onSeek(prevEvent.timestamp)}
              disabled={!prevEvent}
              title="Previous event"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>

            {/* Current event info */}
            <div className="flex items-center gap-2 min-w-[180px]">
              <div
                className={`px-2 py-1 rounded text-xs font-semibold text-white ${
                  currentEvent.team === 'home' ? 'bg-green-600' : 'bg-yellow-500'
                }`}
              >
                {currentEvent.team === 'home' ? 'Home' : 'Away'}
              </div>
              <span className="text-xs font-medium text-white whitespace-nowrap">
                {currentEvent.type}
              </span>
              {currentEvent.description && (
                <>
                  <span className="text-gray-300">→</span>
                  <span className="text-xs text-green-300 whitespace-nowrap">
                    {currentEvent.description}
                  </span>
                </>
              )}
              <span className="text-xs text-gray-200 ml-2 whitespace-nowrap">
                ({formatTime(currentEvent.timestamp)})
              </span>
            </div>

            {/* Next event */}
            <button
              className="p-1 rounded-full hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => nextEvent && onSeek(nextEvent.timestamp)}
              disabled={!nextEvent}
              title="Next event"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Timeline Bar */}
      <div className="relative w-full h-8 flex items-center" onClick={handleTimelineClick}>
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 bg-gray-800/60 rounded-full overflow-hidden">
          {/* Current Time Indicator */}
          <div
            className="absolute top-0 w-0.5 h-2 bg-white z-20 pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />

          {/* Progress Fill */}
          <div
            className="absolute top-0 h-2 bg-green-500/50 z-10 pointer-events-none"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />

          {/* Event Markers */}
          {filteredEvents.map((event) => (
            <button
              key={event.id}
              className={`absolute top-0 w-3 h-3 rounded-full border-2 cursor-pointer transition-transform duration-75 ${getTeamColor(
                event.team
              )} ${hoveredEvent?.id === event.id ? 'scale-125 z-30' : 'z-20'} -translate-x-1/2 -translate-y-1/2`}
              style={{ left: `${(event.timestamp / duration) * 100}%`, top: '50%' }}
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
              onClick={(e) => handleMarkerClick(event, e)}
              title={`${event.type} - ${formatTime(event.timestamp)}`}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white">
                {getEventIcon(event.type)}
              </div>
            </button>
          ))}
        </div>

        {/* Hover Tooltip */}
        {hoveredEvent && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 text-white text-xs px-3 py-2 rounded shadow-lg pointer-events-none whitespace-nowrap"
            style={{ left: `${(hoveredEvent.timestamp / duration) * 100}%` }}
          >
            <div className="font-bold">{hoveredEvent.type}</div>
            <div>{hoveredEvent.team === 'home' ? 'Home' : 'Away'}</div>
            {hoveredEvent.player && <div>{hoveredEvent.player}</div>}
            <div>{formatTime(hoveredEvent.timestamp)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

