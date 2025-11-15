'use client'

import { Calendar, Users } from 'lucide-react'

interface GameHeaderProps {
  game: any
  currentTime: number
  showSidebar: boolean
  onToggleSidebar: () => void
}

export default function GameHeader({
  game,
  currentTime,
  showSidebar,
  onToggleSidebar,
}: GameHeaderProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Game Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <h1 className="text-white font-semibold text-sm sm:text-base truncate">
            {game.title}
          </h1>
          
          <div className="hidden md:flex items-center gap-4 text-xs text-gray-400">
            {game.team_name && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{game.team_name}</span>
              </div>
            )}
            {game.created_at && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(game.created_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Current Time */}
        <div className="hidden sm:flex items-center gap-2 text-white font-mono text-sm">
          {formatTime(currentTime)}
        </div>

        {/* Right: Toggle Sidebar Button */}
        <button
          onClick={onToggleSidebar}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {showSidebar ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
          <span className="hidden sm:inline">
            {showSidebar ? 'Hide' : 'Show'} Details
          </span>
        </button>
      </div>
    </div>
  )
}

