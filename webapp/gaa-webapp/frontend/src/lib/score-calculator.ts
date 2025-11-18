import type { GameEvent } from '@/components/games/video-player/types'

export interface TeamScore {
  goals: number
  points: number
  total: number // GAA scoring: goals * 3 + points
  display: string // Format: "2-14"
}

export interface GameScore {
  home: TeamScore
  away: TeamScore
}

/**
 * Calculate GAA scores from game events
 * Looks for event types: 'goal', 'point' and metadata.scoreType
 */
export function calculateScore(events: GameEvent[]): GameScore {
  const homeEvents = events.filter((e) => e.team === 'home')
  const awayEvents = events.filter((e) => e.team === 'away')

  // Count goals and points for home team
  const homeGoals = homeEvents.filter((e) => 
    e.type?.toLowerCase() === 'goal' || e.metadata?.scoreType === 'goal'
  ).length
  
  const homePoints = homeEvents.filter((e) => 
    e.type?.toLowerCase() === 'point' || e.metadata?.scoreType === 'point'
  ).length

  // Count goals and points for away team
  const awayGoals = awayEvents.filter((e) => 
    e.type?.toLowerCase() === 'goal' || e.metadata?.scoreType === 'goal'
  ).length
  
  const awayPoints = awayEvents.filter((e) => 
    e.type?.toLowerCase() === 'point' || e.metadata?.scoreType === 'point'
  ).length

  return {
    home: {
      goals: homeGoals,
      points: homePoints,
      total: homeGoals * 3 + homePoints,
      display: `${homeGoals}-${homePoints.toString().padStart(2, '0')}`
    },
    away: {
      goals: awayGoals,
      points: awayPoints,
      total: awayGoals * 3 + awayPoints,
      display: `${awayGoals}-${awayPoints.toString().padStart(2, '0')}`
    }
  }
}

