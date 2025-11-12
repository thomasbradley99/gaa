"use client"

import { Badge } from '@/components/ui/badge'
import { Clock, Trophy } from 'lucide-react'
import { MatchState } from '@/lib/types/tagging'

interface GameScoreBannerProps {
  matchState: MatchState
  className?: string
  isFullscreen?: boolean
}

export function GameScoreBanner({ matchState, className = "", isFullscreen = false }: GameScoreBannerProps) {
  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate GAA scores from events
  const calculateGaaScore = (team: 'red' | 'blue') => {
    const teamEvents = matchState.tagHistory.filter(event => 
      event.team === team && event.action === 'Shot'
    )
    
    let goals = 0
    let points = 0
    
    teamEvents.forEach(event => {
      switch (event.outcome) {
        case 'Goal':
          goals += 1
          break
        case '1Point':
          points += 1
          break
        case '2Point':
          points += 2
          break
      }
    })
    
    return { goals, points, total: (goals * 3) + points }
  }

  const redScore = calculateGaaScore('red')
  const blueScore = calculateGaaScore('blue')

  return (
    <div className={`absolute top-4 z-50 ${isFullscreen ? 'left-16' : 'left-4'} ${className}`}>
      {/* Main Score Banner */}
      <div className={`bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg ${isFullscreen ? 'scale-125 transform-gpu' : ''}`}>
        <div className={`flex items-center gap-4 px-4 py-2 ${isFullscreen ? 'gap-6 px-6 py-3' : ''}`}>
          {/* Left Team */}
          <div className="flex items-center gap-2">
            <Badge className={`bg-red-500 text-white px-3 py-1 font-bold ${isFullscreen ? 'text-lg px-4 py-2' : 'text-sm'}`}>
              {matchState.teams.red.name}
            </Badge>
            <div className={`bg-white/90 text-black px-3 py-1 rounded font-bold text-lg min-w-[3rem] text-center ${isFullscreen ? 'text-2xl px-4 py-2 min-w-[4rem]' : ''}`}>
              {redScore.goals}:{redScore.points.toString().padStart(2, '0')}
            </div>
          </div>

          {/* VS Separator */}
          <div className={`text-white/70 font-semibold ${isFullscreen ? 'text-lg' : 'text-sm'}`}>vs</div>

          {/* Right Team */}
          <div className="flex items-center gap-2">
            <div className={`bg-white/90 text-black px-3 py-1 rounded font-bold text-lg min-w-[3rem] text-center ${isFullscreen ? 'text-2xl px-4 py-2 min-w-[4rem]' : ''}`}>
              {blueScore.goals}:{blueScore.points.toString().padStart(2, '0')}
            </div>
            <Badge className={`bg-blue-500 text-white px-3 py-1 font-bold ${isFullscreen ? 'text-lg px-4 py-2' : 'text-sm'}`}>
              {matchState.teams.blue.name}
            </Badge>
          </div>

          {/* Time Display */}
          <div className={`flex items-center gap-2 ml-4 pl-4 border-l border-white/20 ${isFullscreen ? 'ml-6 pl-6 gap-3' : ''}`}>
            <Clock className={`text-white/70 ${isFullscreen ? 'h-6 w-6' : 'h-4 w-4'}`} />
            <div className={`bg-white/90 text-black px-2 py-1 rounded font-mono font-bold text-sm ${isFullscreen ? 'text-lg px-3 py-2' : ''}`}>
              {formatTime(matchState.currentTime)}
            </div>
          </div>

          {/* Half Indicator - Grey Color */}
          <div className="flex items-center gap-1 ml-2">
            <div className={`bg-gray-500/80 text-white px-2 py-1 rounded text-xs font-semibold ${isFullscreen ? 'text-sm px-3 py-2' : ''}`}>
              {matchState.isSecondHalf ? '2nd' : '1st'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
