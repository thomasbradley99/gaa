import React, { useState, useMemo } from 'react'
import { Event, TeamType } from '@/lib/types/tagging'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Target,
  ArrowLeftRight,
  RotateCcw,
  Play,
  Circle,
  AlertTriangle,
  Square,
  Clock
} from 'lucide-react'

interface VideoOverlayTimelineProps {
  events: Event[]
  duration: number
  currentTime: number
  onSeek: (time: number) => void
  teams: { red: { name: string }; blue: { name: string } }
  teamFilter?: 'all' | TeamType
  selectedActions?: string[]
}

export function VideoOverlayTimeline({
  events,
  duration,
  currentTime,
  onSeek,
  teams,
  teamFilter = 'all',
  selectedActions = []
}: VideoOverlayTimelineProps) {
  const [hoveredEvent, setHoveredEvent] = useState<Event | null>(null)

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get color for team
  const getTeamColor = (team: TeamType) =>
    team === 'red' ? 'bg-red-500 border-red-700' : 'bg-blue-500 border-blue-700'

  // Icon mapping for different action types
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Throw-up':
        return <Target className="h-3 w-3" />
      case 'Turnover':
        return <ArrowLeftRight className="h-3 w-3" />
      case 'Kickout':
        return <RotateCcw className="h-3 w-3" />
      case 'Kick-in':
        return <Play className="h-3 w-3" />
      case 'Shot':
        return <Circle className="h-3 w-3" />
      case 'Foul':
        return <AlertTriangle className="h-3 w-3" />
      case 'Yellow Card':
      case 'Black Card':
      case 'Red Card':
        return <Square className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }



  // Filtered events
  const filteredEvents = useMemo(() =>
    events.filter(e => {
      const teamMatch = teamFilter === 'all' || e.team === teamFilter
      if (selectedActions.length === 0) return teamMatch
      return teamMatch && selectedActions.includes(e.action)
    }),
    [events, teamFilter, selectedActions]
  )

  // Current event (last event at or before currentTime)
  const currentEvent = useMemo(() => {
    return filteredEvents
      .filter(e => e.time <= currentTime)
      .sort((a, b) => b.time - a.time)[0] || null
  }, [filteredEvents, currentTime])

  // Next/previous event
  const prevEvent = useMemo(() => {
    return filteredEvents
      .filter(e => e.time < (currentEvent?.time ?? currentTime))
      .sort((a, b) => b.time - a.time)[0] || null
  }, [filteredEvents, currentEvent, currentTime])
  const nextEvent = useMemo(() => {
    return filteredEvents
      .filter(e => e.time > (currentEvent?.time ?? currentTime))
      .sort((a, b) => a.time - b.time)[0] || null
  }, [filteredEvents, currentEvent, currentTime])



  // Handle click on timeline
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * duration
    onSeek(time)
  }

  // Handle marker click
  const handleMarkerClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation()
    onSeek(event.time)
  }

  return (
    <div className="relative w-full flex flex-col items-center select-none px-2" style={{ zIndex: 50 }}>
      {/* HUD Controls */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center w-fit">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg bg-black/70 backdrop-blur-md border border-white/10 mt-2">
          {/* Prev event */}
          <button
            className="p-1 rounded-full hover:bg-white/10 disabled:opacity-40"
            onClick={() => prevEvent && onSeek(prevEvent.time)}
            disabled={!prevEvent}
            title="Previous event"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          {/* Current event info */}
          <div className="flex items-center gap-2 min-w-[180px]">
            {currentEvent ? (
              <>
                <Badge className={`${currentEvent.team === 'red' ? 'bg-red-500' : 'bg-blue-500'} whitespace-nowrap`}>
                  {teams[currentEvent.team].name}
                </Badge>
                <span className="text-xs font-medium text-white whitespace-nowrap">{currentEvent.action}</span>
                {currentEvent.outcome !== 'N/A' && (
                  <>
                    <span className="text-gray-300">→</span>
                    <span className="text-xs text-green-300 whitespace-nowrap">{currentEvent.outcome}</span>
                  </>
                )}
                <span className="text-xs text-gray-200 ml-2 whitespace-nowrap">
                  ({formatTime(currentEvent.time)})
                </span>
              </>
            ) : (
              <span className="text-gray-400 text-xs">No event</span>
            )}
          </div>
          {/* Next event */}
          <button
            className="p-1 rounded-full hover:bg-white/10 disabled:opacity-40"
            onClick={() => nextEvent && onSeek(nextEvent.time)}
            disabled={!nextEvent}
            title="Next event"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
      {/* Timeline Bar */}
      <div className="relative w-full h-12 flex items-center mt-16" onClick={handleTimelineClick}>
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 bg-black/40 rounded-full overflow-hidden">
          {/* Current Time Indicator */}
          <div
            className="absolute top-0 w-0.5 h-2 bg-white z-20"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
          {/* Event Markers */}
          {filteredEvents.map(event => (
            <div
              key={event.id}
              className={`absolute top-0 w-2 h-2 rounded-full border-2 cursor-pointer transition-transform duration-75 ${getTeamColor(event.team)} ${hoveredEvent?.id === event.id ? 'scale-125' : ''}`}
              style={{ left: `${(event.time / duration) * 100}%` }}
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
              onClick={e => handleMarkerClick(event, e)}
              title={`${event.action} (${formatTime(event.time)})`}
            />
          ))}
        </div>
        {/* Hover Tooltip */}
        {hoveredEvent && (
          <div
            className="absolute left-1/2 bottom-8 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
            style={{ left: `${(hoveredEvent.time / duration) * 100}%` }}
          >
            <div className="font-bold">{hoveredEvent.action}</div>
            <div>{hoveredEvent.team === 'red' ? teams.red.name : teams.blue.name}</div>
            <div>{formatTime(hoveredEvent.time)}</div>
          </div>
        )}
        {/* Current Time Label */}
        <div
          className="absolute -bottom-6 left-0 text-xs text-white bg-black/70 px-2 py-0.5 rounded"
          style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translateX(-50%)' }}
        >
          {formatTime(currentTime)}
        </div>
      </div>
    </div>
  )
} 