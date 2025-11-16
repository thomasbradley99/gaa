'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { EventList } from './EventList'
import { GameStats } from './GameStats'
import type { GameEvent } from './video-player/types'

interface UnifiedSidebarProps {
  isOpen: boolean
  onClose: () => void
  game: any
  events: GameEvent[]
  currentTime: number
  duration: number
  onEventClick: (event: GameEvent) => void
  teamFilter: 'all' | 'home' | 'away'
  onTeamFilterChange: (filter: 'all' | 'home' | 'away') => void
}

type TabType = 'events' | 'stats' | 'ai'

export default function UnifiedSidebar({
  isOpen,
  onClose,
  game,
  events,
  currentTime,
  duration,
  onEventClick,
  teamFilter,
  onTeamFilterChange,
}: UnifiedSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stats')

  return (
    <>
      {/* Backdrop (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-black/90 backdrop-blur-lg border-l border-white/10 z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '400px', maxWidth: '100vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {/* Tabs */}
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3 py-1.5 text-sm font-medium rounded-xl transition-all ${
                activeTab === 'stats'
                  ? 'bg-[#2D8B4D] text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 py-1.5 text-sm font-medium rounded-xl transition-all ${
                activeTab === 'events'
                  ? 'bg-[#2D8B4D] text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 text-sm font-medium rounded-xl transition-all ${
                activeTab === 'ai'
                  ? 'bg-[#2D8B4D] text-white shadow-lg'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              AI Coach
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-57px)] overflow-y-auto">
          {activeTab === 'events' && (
            <div className="p-4">
              <h2 className="text-xl font-semibold text-white mb-4">Game Events</h2>
              {events.length > 0 ? (
                <EventList
                  events={events}
                  currentTime={currentTime}
                  onEventClick={onEventClick}
                  teamFilter={teamFilter}
                  onTeamFilterChange={onTeamFilterChange}
                />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No events available
                  {game.status === 'pending' && (
                    <p className="mt-2 text-xs">Events will appear after analysis</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="p-4">
              {events.length > 0 ? (
                <GameStats
                  game={game}
                  events={events}
                  duration={duration}
                />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <p>No statistics available</p>
                  {game.status === 'pending' && (
                    <p className="mt-2 text-xs">Stats will appear after analysis</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="p-4">
              <div className="text-center py-12 text-white/60">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-[#2D8B4D]/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <p className="text-sm font-medium text-white mb-2">AI Coaching</p>
                <p className="text-xs text-white/50">
                  Personalized tactical insights and match recommendations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

