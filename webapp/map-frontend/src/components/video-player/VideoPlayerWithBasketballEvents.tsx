"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { VideoPlayerContainer } from './VideoPlayerContainer'
import { BasketballEventsManager } from './BasketballEventsManager'
import { useBasketballMatchTagging } from '@/hooks/use-basketball-match-tagging'
import { useGameVideos } from '@/hooks/use-videos'
import { useUpdateVideo } from '@/hooks/use-videos'
import { TeamContextProvider } from '@/contexts/team-context'
import { toast } from 'sonner'
import type { Video } from '@/lib/api/generated/types.gen'
import type { BasketballTeamInfo, BasketballPartialEvent } from '@/types/basketball'
import type { VideoPlayerWithBasketballEventsProps } from './types'

export function VideoPlayerWithBasketballEvents({
  gameId,
  videoId,
  teamId = "demo-team-1",
  onVideoChange,
  onEventsChange,
  onClose,
  className = "",
  // Add these with default values
  showGameScoreBanner = true,
  showVideoTimeline = true,
  showVideoControls = true,
  showEventsManager = true,
  autoFullscreen = false
}: VideoPlayerWithBasketballEventsProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [teams, setTeams] = useState<{ red: BasketballTeamInfo; blue: BasketballTeamInfo }>({
    red: { id: 'red', name: 'Red', color: 'red', score: 0 },
    blue: { id: 'blue', name: 'Blue', color: 'blue', score: 0 }
  })

  // Timeline view state
  const [showEvents, setShowEvents] = useState(true)
  const [showEventKey, setShowEventKey] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [teamFilter, setTeamFilter] = useState<'red' | 'blue' | 'all'>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')

  // Sidebar filter state to pass to timeline
  const [sidebarTeamFilter, setSidebarTeamFilter] = useState<'red' | 'blue' | 'all'>('all')
  const [sidebarSelectedActions, setSidebarSelectedActions] = useState<string[]>([])
  const [sidebarSelectedShotOutcomes, setSidebarSelectedShotOutcomes] = useState<string[]>([])

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Clear all filters
  const clearFilters = () => {
    setTeamFilter('all')
    setActionFilter('all')
  }

  // Handle sidebar filter changes
  const handleSidebarFilterChange = useCallback((teamFilter: any, selectedActions: any[], selectedShotOutcomes: string[]) => {
    setSidebarTeamFilter(teamFilter)
    setSidebarSelectedActions(selectedActions.map(action => action.toString()))
    setSidebarSelectedShotOutcomes(selectedShotOutcomes)
  }, [])

  // Fullscreen functionality
  const toggleFullscreen = useCallback(async () => {
    const videoContainer = document.querySelector('[data-video-container]') as HTMLElement

    try {
      if (!document.fullscreenElement) {
        await videoContainer?.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
      toast.error('Fullscreen not supported or failed')
    }
  }, [])

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const wasFullscreen = isFullscreen
      const isNowFullscreen = !!document.fullscreenElement
      setIsFullscreen(isNowFullscreen)
      
      // If we were in fullscreen and now we're not, and we have an onClose callback, call it
      if (wasFullscreen && !isNowFullscreen && onClose) {
        onClose()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isFullscreen, onClose])

  // Auto-enter fullscreen when component mounts
  useEffect(() => {
    if (!autoFullscreen) return

    const enterFullscreen = async () => {
      const videoContainer = document.querySelector('[data-video-container]') as HTMLElement
      if (videoContainer && !document.fullscreenElement) {
        try {
          await videoContainer.requestFullscreen()
          setIsFullscreen(true)
        } catch (error) {
          console.error('Auto-fullscreen error:', error)
          // Don't show error toast for auto-fullscreen, just log it
        }
      }
    }

    // Small delay to ensure the component is fully rendered
    const timer = setTimeout(enterFullscreen, 100)
    return () => clearTimeout(timer)
  }, [autoFullscreen])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when the video player is focused or when not in a text input
      const activeElement = document.activeElement
      const isInInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA'
      
      if (isInInput) return

      switch (event.key.toLowerCase()) {
        case 'f':
          event.preventDefault()
          toggleFullscreen()
          break
        case 'escape':
          if (isFullscreen) {
            event.preventDefault()
            toggleFullscreen()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleFullscreen, isFullscreen])

  // Load videos using the actual game and team IDs
  const { data: videos = [], isLoading: videosLoading } = useGameVideos(gameId)
  
  // Initialize basketball tagging system
  const {
    matchState,
    updateVideoState,
    startTag,
    updateActiveTag,
    cancelTag,
    saveTag,
    deleteEvent,
    deleteAllEvents,
    generateSampleEvents,
    generateBasketballJsonEvents,
    toggleQuarter,
    updateTeams,
    updatePossession,
    getMatchTimeMarkers,
    getNextRequiredMatchEvent,
    getCombinedEvents
  } = useBasketballMatchTagging(videoId, teams)

  // Find and set the video
  useEffect(() => {
    if (videos.length > 0 && videoId) {
      const video = videos.find(v => v.id === videoId) || videos[0]
      setSelectedVideo(video)
      onVideoChange?.(video)
    }
  }, [videos, videoId, onVideoChange])

  // Update teams in tagging system
  useEffect(() => {
    updateTeams(teams)
  }, [teams, updateTeams])

  // Notify parent of events changes
  useEffect(() => {
    onEventsChange?.(matchState.tagHistory)
  }, [matchState.tagHistory, onEventsChange])

  // Initialize video update hook
  const updateVideoMutation = useUpdateVideo()

  // Get current match time markers from tagging
  const matchTimeMarkers = getMatchTimeMarkers()
  const nextRequiredEvent = getNextRequiredMatchEvent()

  // Handle video state updates
  const handleVideoTimeUpdate = useCallback((currentTime: number, duration: number, isPlaying: boolean) => {
    updateVideoState({
      currentTime,
      duration,
      isPlaying
    })
  }, [updateVideoState])

  // Handle timeline clicks
  const handleTimelineClick = useCallback((time: number) => {
    const video = (window as any).videoElement as HTMLVideoElement
    if (video) {
      video.currentTime = time
      updateVideoState({ currentTime: time })
    }
  }, [updateVideoState])

  // Handle team updates
  const handleTeamUpdate = (teamColor: 'red' | 'blue', name: string) => {
    setTeams(prev => ({
      ...prev,
      [teamColor]: { ...prev[teamColor], name }
    }))
  }

  // Handle score updates
  const handleScoreUpdate = (teamColor: 'red' | 'blue', score: number) => {
    setTeams(prev => ({
      ...prev,
      [teamColor]: { ...prev[teamColor], score }
    }))
  }

  if (videosLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    )
  }

  if (!selectedVideo) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Video not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TeamContextProvider>
      <div className={`min-h-screen flex items-center justify-center p-4 ${className}`}>
        <div className="max-w-7xl w-full">
          <Card className="shadow-lg border-0 bg-transparent">
            <CardContent className="p-2 space-y-0">
              <div data-video-container className={`relative ${!isFullscreen ? 'flex' : ''}`}>
                <div className={!isFullscreen ? 'flex-1' : 'w-full'}>
                  <VideoPlayerContainer
                    video={selectedVideo}
                    matchState={matchState}
                    isFullscreen={isFullscreen}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onToggleFullscreen={toggleFullscreen}
                    onTimelineClick={handleTimelineClick}
                    getCombinedEvents={getCombinedEvents}
                    updateVideoState={updateVideoState}
                    teams={teams}
                    showGameScoreBanner={showGameScoreBanner}
                    showVideoTimeline={showVideoTimeline}
                    showVideoControls={showVideoControls}
                    sidebarTeamFilter={sidebarTeamFilter}
                    sidebarSelectedActions={sidebarSelectedActions}
                    sidebarSelectedShotOutcomes={sidebarSelectedShotOutcomes}
                  />
                </div>
                
                {/* Events Manager Sidebar */}
                {showEventsManager && !isFullscreen && (
                  <div className="w-80 bg-white border-l border-gray-200 rounded-r-lg">
                    <BasketballEventsManager
                      matchState={matchState}
                      teams={teams}
                      onStartTag={startTag}
                      onUpdateActiveTag={updateActiveTag}
                      onCancelTag={cancelTag}
                      onSaveTag={saveTag}
                      onDeleteEvent={deleteEvent}
                      onDeleteAllEvents={deleteAllEvents}
                      onGenerateSampleEvents={generateSampleEvents}
                      onGenerateBasketballJsonEvents={generateBasketballJsonEvents}
                      onToggleQuarter={toggleQuarter}
                      onUpdateTeams={handleTeamUpdate}
                      onUpdatePossession={updatePossession}
                      onUpdateScore={handleScoreUpdate}
                      onFilterChange={handleSidebarFilterChange}
                      sidebarOpen={sidebarOpen}
                      onSidebarToggle={setSidebarOpen}
                      showEvents={showEvents}
                      onShowEventsToggle={setShowEvents}
                      showEventKey={showEventKey}
                      onShowEventKeyToggle={setShowEventKey}
                      showFilters={showFilters}
                      onShowFiltersToggle={setShowFilters}
                      teamFilter={teamFilter}
                      onTeamFilterChange={setTeamFilter}
                      actionFilter={actionFilter}
                      onActionFilterChange={setActionFilter}
                      onClearFilters={clearFilters}
                      matchTimeMarkers={matchTimeMarkers}
                      nextRequiredEvent={nextRequiredEvent}
                      getCombinedEvents={getCombinedEvents}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TeamContextProvider>
  )
} 