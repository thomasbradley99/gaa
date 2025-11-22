'use client'

import { Calendar, Users, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { GameEvent } from './video-player/types'
import { calculateScore } from '@/lib/score-calculator'

interface GameHeaderProps {
  game: any
  currentTime: number
  showRightSidebar: boolean
  showLeftSidebar: boolean
  onToggleRightSidebar: () => void
  onToggleLeftSidebar: () => void
  events?: GameEvent[]
}

export default function GameHeader({
  game,
  currentTime,
  showRightSidebar,
  showLeftSidebar,
  onToggleRightSidebar,
  onToggleLeftSidebar,
  events = [],
}: GameHeaderProps) {
  const router = useRouter()
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

  // Calculate score from events
  const score = calculateScore(events)

  return (
    <div className="bg-black/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Back Button + Toggle Left Sidebar + Game Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Back Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              router.push('/dashboard')
            }}
            className="flex items-center justify-center w-8 h-8 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>

          {/* Toggle Left Sidebar */}
          <button
            onClick={onToggleLeftSidebar}
            className="flex items-center justify-center w-8 h-8 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
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

        {/* Center: Score & Current Time */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Score Display */}
          {events.length > 0 && (score.home.goals > 0 || score.home.points > 0 || score.away.goals > 0 || score.away.points > 0) && (
            <div className="flex items-center gap-3 px-4 py-1.5 bg-black/60 rounded-xl border border-white/10">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 font-medium uppercase">Home</span>
                <span className="text-lg font-bold text-white font-mono">{score.home.display}</span>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 font-medium uppercase">Away</span>
                <span className="text-lg font-bold text-white font-mono">{score.away.display}</span>
              </div>
            </div>
          )}
          {/* Current Time */}
          <div className="text-white/70 font-mono text-xs">
            {formatTime(currentTime)}
          </div>
        </div>

        {/* Right: Toggle Right Sidebar Button */}
        <button
          onClick={onToggleRightSidebar}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 text-white rounded-xl transition-colors text-sm shadow-lg"
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

