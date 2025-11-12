"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { VideoPlayerContainer } from './VideoPlayerContainer'
import { EventsManager } from './EventsManager'
import { useMatchTagging } from '@/hooks/use-match-tagging'
import { useGameVideos, useUpdateVideo, usePublicGameVideos } from '@/hooks/use-videos'
import { TeamContextProvider } from '@/contexts/team-context'
import { toast } from 'sonner'
import type { Video } from '@/lib/api/generated/types.gen'
import type { TeamInfo, PartialEvent } from '@/lib/types/tagging'
import type { VideoPlayerWithEventsProps } from './types'

export function VideoPlayerWithEvents({
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
  autoFullscreen = false,
  isPublic = false
}: VideoPlayerWithEventsProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [teams, setTeams] = useState<{ red: TeamInfo; blue: TeamInfo }>({
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
  const { data: videos = [], isLoading: videosLoading } = isPublic
    ? usePublicGameVideos(gameId)
    : useGameVideos(gameId)
  
  // Initialize tagging system
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
  
    generateGaaJsonEvents,
    toggleSecondHalf,
    updateTeams,
    updatePossession,
    getMatchTimeMarkers,
    getNextRequiredMatchEvent,
    getCombinedEvents
  } = useMatchTagging(videoId, teams)

  // Find and set the video
  useEffect(() => {
    if (videos.length > 0 && videoId) {
      console.log('Fetched videos:', videos)
      console.log('Looking for videoId:', videoId)
      const video = videos.find(v => v.id === videoId) || videos[0]
      console.log('Selected video:', video)
      setSelectedVideo(video)
      onVideoChange?.(video)
    } else if (videos.length === 0) {
      console.log('No videos fetched for gameId:', gameId)
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

  // Auto-update video with match time markers when completed
  useEffect(() => {
    if (matchTimeMarkers && selectedVideo?.id && !selectedVideo.matchTimeMarkers) {
      // Only update if video doesn't already have match time markers
      updateVideoMutation.mutate({
        id: selectedVideo.id,
        video: {
          matchTimeMarkers
        }
      }, {
        onSuccess: () => {
          toast.success('Video updated with match time markers')
        },
        onError: (error) => {
          console.error('Failed to update video with match time markers:', error)
          toast.error('Failed to update video with match time markers')
        }
      })
    }
  }, [matchTimeMarkers, selectedVideo?.id, selectedVideo?.matchTimeMarkers, updateVideoMutation])

  // Handle auto-filling video analysis form
  const handleAutoFillVideoAnalysis = useCallback((markers: any) => {
    // Scroll to video analysis section
    const analysisSection = document.querySelector('[data-analysis-section]')
    if (analysisSection) {
      analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    toast.success('Video analysis form auto-filled with match time markers!')
  }, [])

  // Handle AI analysis start
  const handleStartAnalysis = useCallback((params: {
    teamId: string
    promptTypes?: string[]
    maxSegments?: number
    geminiModel?: 'gemini-1.5-flash' | 'gemini-1.5-pro'
  }) => {
    if (!matchTimeMarkers || !selectedVideo) {
      toast.error('Please ensure match time markers are set and video is loaded')
      return
    }
    // Placeholder for AI analysis
    toast.info('AI analysis not implemented yet')
  }, [matchTimeMarkers, selectedVideo])

  // Handle video time updates
  const handleVideoTimeUpdate = useCallback((time: number, duration: number, isPlaying: boolean) => {
    updateVideoState({
      currentTime: time,
      duration,
      isPlaying,
      isLoaded: duration > 0
    })
  }, [updateVideoState])

  // Handle timeline clicks for tagging
  const handleTimelineClick = useCallback((time: number) => {
    const isFirstEvent = matchState.tagHistory.length === 0
    startTag(time, matchState.currentPossession || undefined)
    
    if (isFirstEvent) {
      toast.info(`Starting match with throw-up at ${Math.floor(time / 60)}:${(Math.floor(time % 60)).toString().padStart(2, '0')}`)
    } else {
      toast.info(`Creating event at ${Math.floor(time / 60)}:${(Math.floor(time % 60)).toString().padStart(2, '0')}`)
    }
  }, [startTag, matchState.currentPossession, matchState.tagHistory.length])

  // Handle event creation from tagging interface
  const handleEventCreate = useCallback((event: PartialEvent) => {
    if (event.time !== undefined) {
      startTag(event.time, event.team)
    }
  }, [startTag])

  // Handle event saving
  const handleEventSave = useCallback((cardInfo?: { cardType?: any; targetTeam?: any; foulAwardedTo?: any }) => {
    // If it's a foul, set the team to the foul awarded to team
    if (cardInfo?.foulAwardedTo && matchState.activeTag?.action === 'Foul') {
      updateActiveTag({ team: cardInfo.foulAwardedTo })
      setTimeout(() => {
        saveTag()
        
        // If a card was also selected, create the card event
        if (cardInfo.cardType) {
          setTimeout(() => {
            startTag(matchState.currentTime, cardInfo.targetTeam)
            updateActiveTag({ 
              action: cardInfo.cardType,
              outcome: 'N/A'
            })
            setTimeout(() => {
              saveTag()
            }, 50)
          }, 100)
        }
      }, 50)
    } else {
      saveTag()
      
      // If a card was selected with a foul, create the card event
      if (cardInfo?.cardType) {
        setTimeout(() => {
          startTag(matchState.currentTime, cardInfo.targetTeam)
          updateActiveTag({ 
            action: cardInfo.cardType,
            outcome: 'N/A'
          })
          setTimeout(() => {
            saveTag()
          }, 50)
        }, 100)
      }
    }
    
    toast.success('Event saved successfully!')
  }, [saveTag, startTag, matchState.currentTime, matchState.activeTag, updateActiveTag])

  // Handle event deletion
  const handleEventDelete = useCallback((eventId: string) => {
    deleteEvent(eventId)
    toast.success('Event deleted')
  }, [deleteEvent])

  // Handle delete all events
  const handleDeleteAllEvents = useCallback(() => {
    if (window.confirm('Are you sure you want to delete all events? This action cannot be undone.')) {
      deleteAllEvents()
      toast.success('All events deleted')
    }
  }, [deleteAllEvents])

  // Handle seeking to event time
  const handleEventSeek = useCallback((time: number) => {
    updateVideoState({ currentTime: time })
    toast.info(`Seeking to ${Math.floor(time / 60)}:${(Math.floor(time % 60)).toString().padStart(2, '0')}`)
  }, [updateVideoState])

  // Export match data
  const handleExportData = useCallback(() => {
    const data = {
      matchId: matchState.matchId,
      teams: matchState.teams,
      events: matchState.tagHistory,
      finalScore: matchState.currentScore,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `match_data_${matchState.matchId}_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    
    URL.revokeObjectURL(url)
    toast.success('Match data exported successfully!')
  }, [matchState])

  // Handle team name changes
  const handleTeamUpdate = (teamColor: 'red' | 'blue', name: string) => {
    setTeams(prev => ({
      ...prev,
      [teamColor]: { ...prev[teamColor], name }
    }))
  }

  // Handle GAA JSON events generation
  const handleGenerateGaaJsonEvents = useCallback(() => {
    generateGaaJsonEvents()
    toast.success('Events generated from GAA JSON schema!')
  }, [generateGaaJsonEvents])

  // Enhanced toggle second half handler with notification
  const handleToggleSecondHalf = useCallback(() => {
    const wasFirstHalf = !matchState.isSecondHalf
    toggleSecondHalf()
    
    if (wasFirstHalf) {
      toast.info('Second half started - Throw-up event created automatically')
    } else {
      toast.info('Switched back to first half')
    }
  }, [toggleSecondHalf, matchState.isSecondHalf])

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
                
                {showEventsManager && (
                  <div className={!isFullscreen ? 'w-80 flex-shrink-0' : ''}>
                    <EventsManager
                      matchState={matchState}
                      onEventSave={handleEventSave}
                      onEventDelete={handleEventDelete}
                      onDeleteAllEvents={handleDeleteAllEvents}
                      onEventSeek={handleEventSeek}
                      onGenerateSampleEvents={generateSampleEvents}
                      onGenerateGaaJsonEvents={handleGenerateGaaJsonEvents}
                      onTeamUpdate={handleTeamUpdate}
                      onToggleSecondHalf={handleToggleSecondHalf}
                      onExportData={handleExportData}
                      teams={teams}
                      isFullscreen={isFullscreen}
                      showEventsManager={showEventsManager}
                      onFilterChange={handleSidebarFilterChange}
                      sidebarOpen={sidebarOpen}
                      onSidebarOpenChange={setSidebarOpen}
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
