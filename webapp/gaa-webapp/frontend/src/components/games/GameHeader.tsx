'use client'

import { Calendar, Users } from 'lucide-react'

interface GameHeaderProps {
  game: any
  currentTime: number
  showRightSidebar: boolean
  showLeftSidebar: boolean
  onToggleRightSidebar: () => void
  onToggleLeftSidebar: () => void
}

export default function GameHeader({
  game,
  currentTime,
  showRightSidebar,
  showLeftSidebar,
  onToggleRightSidebar,
  onToggleLeftSidebar,
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
        {/* Left: Toggle Left Sidebar + Game Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Toggle Left Sidebar */}
          <button
            onClick={onToggleLeftSidebar}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title={showLeftSidebar ? 'Hide Navigation' : 'Show Navigation'}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {showLeftSidebar ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              )}
            </svg>
          </button>

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

        {/* Right: Toggle Right Sidebar Button */}
        <button
          onClick={onToggleRightSidebar}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {showRightSidebar ? (
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
            {showRightSidebar ? 'Hide' : 'Show'} Details
          </span>
        </button>
      </div>
    </div>
  )
}

