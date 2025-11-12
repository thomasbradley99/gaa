import type { Video } from '@/lib/api/generated/types.gen'
import type { TeamInfo, PartialEvent } from '@/lib/types/tagging'
import type { BasketballTeamInfo, BasketballPartialEvent } from '@/types/basketball'

export interface VideoPlayerWithEventsProps {
  gameId: string
  videoId: string
  teamId?: string
  onVideoChange?: (video: Video) => void
  onEventsChange?: (events: any[]) => void
  onClose?: () => void
  className?: string
  // Add these new visibility controls
  showGameScoreBanner?: boolean
  showVideoTimeline?: boolean  
  showVideoControls?: boolean
  showEventsManager?: boolean
  autoFullscreen?: boolean
}

export interface VideoPlayerWithBasketballEventsProps {
  gameId: string
  videoId: string
  teamId?: string
  onVideoChange?: (video: Video) => void
  onEventsChange?: (events: any[]) => void
  onClose?: () => void
  className?: string
  // Add these new visibility controls
  showGameScoreBanner?: boolean
  showVideoTimeline?: boolean  
  showVideoControls?: boolean
  showEventsManager?: boolean
  autoFullscreen?: boolean
}

export interface VideoPlayerContainerProps {
  video: Video
  matchState: any
  isFullscreen: boolean
  onTimeUpdate: (time: number, duration: number, isPlaying: boolean) => void
  onToggleFullscreen: () => void
  onTimelineClick: (time: number) => void
  getCombinedEvents: () => any[]
  updateVideoState: (state: any) => void
  teams: { red: TeamInfo; blue: TeamInfo } | { red: BasketballTeamInfo; blue: BasketballTeamInfo }
  // Add these new visibility controls
  showGameScoreBanner?: boolean
  showVideoTimeline?: boolean
  showVideoControls?: boolean
  // Add sidebar filter state
  sidebarTeamFilter?: 'all' | any
  sidebarSelectedActions?: string[]
  sidebarSelectedShotOutcomes?: string[]
}

export interface EventsManagerProps {
  matchState: any
  onEventSave: (cardInfo?: any) => void
  onEventDelete: (eventId: string) => void
  onDeleteAllEvents: () => void
  onEventSeek: (time: number) => void
  onGenerateSampleEvents: () => void
  onGenerateCastletownEvents?: () => void
  onGenerateGaaJsonEvents: () => void
  onTeamUpdate: (teamColor: 'red' | 'blue', name: string) => void
  onToggleSecondHalf: () => void
  onExportData: () => void
  teams: { red: TeamInfo; blue: TeamInfo }
  isFullscreen: boolean
  // Add this new visibility control
  showEventsManager?: boolean
  onFilterChange?: (teamFilter: any, selectedActions: any[], selectedShotOutcomes: string[]) => void
  sidebarOpen?: boolean
  onSidebarOpenChange?: (open: boolean) => void
}

export interface BasketballEventsManagerProps {
  matchState: any
  teams: { red: BasketballTeamInfo; blue: BasketballTeamInfo }
  onStartTag: (type: string, team: string) => void
  onUpdateActiveTag: (data: any) => void
  onCancelTag: () => void
  onSaveTag: () => void
  onDeleteEvent: (eventId: string) => void
  onDeleteAllEvents: () => void
  onGenerateSampleEvents: () => void
  onGenerateBasketballJsonEvents: () => void
  onToggleQuarter: () => void
  onUpdateTeams: (teamColor: 'red' | 'blue', name: string) => void
  onUpdatePossession: (team: string) => void
  onUpdateScore: (teamColor: 'red' | 'blue', score: number) => void
  onFilterChange: (teamFilter: any, selectedActions: any[], selectedShotOutcomes: string[]) => void
  sidebarOpen: boolean
  onSidebarToggle: (open: boolean) => void
  showEvents: boolean
  onShowEventsToggle: (show: boolean) => void
  showEventKey: boolean
  onShowEventKeyToggle: (show: boolean) => void
  showFilters: boolean
  onShowFiltersToggle: (show: boolean) => void
  teamFilter: 'red' | 'blue' | 'all'
  onTeamFilterChange: (filter: 'red' | 'blue' | 'all') => void
  actionFilter: string
  onActionFilterChange: (filter: string) => void
  onClearFilters: () => void
  matchTimeMarkers: any
  nextRequiredEvent: any
  getCombinedEvents: () => any[]
}
