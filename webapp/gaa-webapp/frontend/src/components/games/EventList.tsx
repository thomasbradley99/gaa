'use client'

import { useState, useMemo } from 'react'
import { Clock, Users, Filter } from 'lucide-react'
import type { GameEvent } from './video-player/types'

interface EventListProps {
  events: GameEvent[]
  currentTime: number
  onEventClick: (event: GameEvent) => void
  teamFilter?: 'all' | 'home' | 'away'
  onTeamFilterChange?: (filter: 'all' | 'home' | 'away') => void
}

export function EventList({
  events,
  currentTime,
  onEventClick,
  teamFilter = 'all',
  onTeamFilterChange,
}: EventListProps) {
  const [selectedEventType, setSelectedEventType] = useState<string>('all')

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const teamMatch = teamFilter === 'all' || e.team === teamFilter
      const typeMatch = selectedEventType === 'all' || e.type === selectedEventType
      return teamMatch && typeMatch
    })
  }, [events, teamFilter, selectedEventType])

  // Get event type label
  const getEventTypeLabel = (event: GameEvent) => {
    if (event.type === 'shot') {
      const scoreType = event.metadata?.scoreType
      if (scoreType === 'goal') return 'Goal'
      if (scoreType === 'point') return 'Point'
      if (scoreType === 'wide') return 'Wide'
      if (scoreType === 'saved') return 'Saved'
      return 'Shot'
    }
    if (event.type === 'card') {
      const cardType = event.metadata?.cardType
      if (cardType === 'yellow') return 'Yellow Card'
      if (cardType === 'black') return 'Black Card'
      if (cardType === 'red') return 'Red Card'
      return 'Card'
    }
    return event.type.charAt(0).toUpperCase() + event.type.slice(1).replace('-', ' ')
  }

  // Check if event is near current time
  const isEventActive = (event: GameEvent) => {
    return Math.abs(event.timestamp - currentTime) < 2
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2">
        {/* Team Filter */}
        {onTeamFilterChange && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={teamFilter}
              onChange={(e) => onTeamFilterChange(e.target.value as 'all' | 'home' | 'away')}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Teams</option>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </div>
        )}

        {/* Event Type Filter */}
        <select
          value={selectedEventType}
          onChange={(e) => setSelectedEventType(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Events</option>
          <option value="shot">Shots</option>
          <option value="kickout">Kickouts</option>
          <option value="turnover">Turnovers</option>
          <option value="throw-up">Throw-ups</option>
          <option value="foul">Fouls</option>
          <option value="card">Cards</option>
          <option value="whistle">Whistles</option>
        </select>
      </div>

      {/* Events List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No events found
          </div>
        ) : (
          filteredEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isEventActive(event)
                  ? 'bg-[#2D8B4D]/20 border-[#2D8B4D]'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        event.team === 'home' ? 'bg-white text-black' : 'bg-black text-white'
                      }`}
                    >
                      {event.team === 'home' ? 'Home' : 'Away'}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {getEventTypeLabel(event)}
                    </span>
                  </div>

                  {event.player && (
                    <div className="flex items-center gap-1 mb-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-300">{event.player}</span>
                    </div>
                  )}

                  {event.description && (
                    <p className="text-xs text-gray-400 mb-1">{event.description}</p>
                  )}

                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{formatTime(event.timestamp)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

