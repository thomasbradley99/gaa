export interface BasketballEvent {
  type: 'Shot' | 'Foul' | 'Rebound' | 'Turnover' | 'Assist' | 'Steal' | 'Block' | 'Timeout' | 'Substitution' | 'Technical' | 'Fast Break' | 'Charge' | 'Double Dribble' | 'Quarter End'
  team: 'red' | 'blue' | 'neutral'
  time_in_clip: number
  absolute_time: number
  outcome?: '2Point' | '3Point' | 'FreeThrow' | 'Miss'
  description: string
  clip_file: string
}

export interface BasketballMatchInfo {
  title: string
  total_events: number
  time_period: string
  method: string
}

export interface BasketballSchema {
  match_info: BasketballMatchInfo
  events: BasketballEvent[]
}

export interface BasketballTeamInfo {
  id: string
  name: string
  color: 'red' | 'blue'
  score: number
}

export interface BasketballMatchState {
  currentTime: number
  videoState: {
    isPlaying: boolean
    duration: number
    currentTime: number
  }
  teams: {
    red: BasketballTeamInfo
    blue: BasketballTeamInfo
  }
  quarter: number
  timeRemaining: string
}

export interface BasketballPartialEvent {
  type: BasketballEvent['type']
  team: BasketballEvent['team']
  time: number
  outcome?: BasketballEvent['outcome']
  description?: string
}

// Basketball-specific event colors for timeline
export const BASKETBALL_EVENT_COLORS = {
  'Shot': {
    '2Point': '#10B981', // green for made shots
    '3Point': '#3B82F6', // blue for three-pointers
    'FreeThrow': '#8B5CF6', // purple for free throws
    'Miss': '#EF4444' // red for misses
  },
  'Foul': '#F59E0B', // amber
  'Rebound': '#6B7280', // gray
  'Turnover': '#DC2626', // red
  'Assist': '#059669', // emerald
  'Steal': '#7C3AED', // violet
  'Block': '#1F2937', // gray-800
  'Timeout': '#374151', // gray-700
  'Substitution': '#4B5563', // gray-600
  'Technical': '#DC2626', // red
  'Fast Break': '#10B981', // green
  'Charge': '#F59E0B', // amber
  'Double Dribble': '#EF4444', // red
  'Quarter End': '#6B7280' // gray
} as const

export type BasketballEventType = keyof typeof BASKETBALL_EVENT_COLORS
export type BasketballShotOutcome = '2Point' | '3Point' | 'FreeThrow' | 'Miss' 