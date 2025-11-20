// Video Player Types

/**
 * IMPORTANT: GameEvent now uses the master schema
 * See: shared/EVENT_SCHEMA.ts for complete definition
 * 
 * This re-export ensures all components use the same schema
 */
export type { GameEvent, EventAction, EventOutcome, EventMetadata } from '@/shared/EVENT_SCHEMA'

export interface AdaptiveVideoPlayerProps {
  hlsUrl?: string
  mp4Url: string
  onTimeUpdate: (time: number, duration: number, isPlaying: boolean) => void
  onDurationChange?: (duration: number) => void
  className?: string
  autoPlay?: boolean
  muted?: boolean
}

export interface VideoPlaybackControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onSeek: (time: number) => void
  onSkipBackward: () => void
  onSkipForward: () => void
  onMuteToggle: () => void
  isMuted: boolean
  showControls: boolean
}

export interface VideoOverlayTimelineProps {
  events: GameEvent[]
  duration: number
  currentTime: number
  onSeek: (time: number) => void
  teamFilter?: 'all' | 'home' | 'away'
  selectedEventTypes?: string[]
}

export interface VideoPlayerContainerProps {
  videoUrl: string
  hlsUrl?: string
  events?: GameEvent[]
  onTimeUpdate?: (time: number, duration: number, isPlaying: boolean) => void
  onSeek?: (time: number) => void
  className?: string
  showTimeline?: boolean
  showControls?: boolean
  teamFilter?: 'all' | 'home' | 'away'
}

