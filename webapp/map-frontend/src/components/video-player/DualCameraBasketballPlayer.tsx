"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AdaptiveVideoPlayer } from './adaptive-video-player'
import { VideoPlaybackControls } from './video-playback-controls'
import { VideoOverlayTimeline } from './video-overlay-timeline'
import { GameScoreBanner } from './game-score-banner'
import { BasketballEventsManager } from './BasketballEventsManager'
import { useBasketballMatchTagging } from '@/hooks/use-basketball-match-tagging'
import { useGameVideos } from '@/hooks/use-videos'
import { useUpdateVideo } from '@/hooks/use-videos'
import { useVideoProcessingMonitor } from '@/hooks/use-videos'
import { TeamContextProvider } from '@/contexts/team-context'
import { toast } from 'sonner'
import { Monitor, MonitorOff, Layout, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Video } from '@/lib/api/generated/types.gen'
import type { BasketballTeamInfo } from '@/types/basketball'

interface DualCameraBasketballPlayerProps {
  gameId: string
  primaryVideoId: string
  secondaryVideoId?: string
  teamId?: string
  onVideoChange?: (video: Video) => void
  onEventsChange?: (events: any[]) => void
  onClose?: () => void
  className?: string
  showGameScoreBanner?: boolean
  showVideoTimeline?: boolean
  showVideoControls?: boolean
  showEventsManager?: boolean
  autoFullscreen?: boolean
}

type LayoutMode = 'side-by-side' | 'picture-in-picture' | 'primary-only' | 'secondary-only'

export function DualCameraBasketballPlayer({
  gameId,
  primaryVideoId,
  secondaryVideoId,
  teamId = "demo-team-1",
  onVideoChange,
  onEventsChange,
  onClose,
  className = "",
  showGameScoreBanner = true,
  showVideoTimeline = true,
  showVideoControls = true,
  showEventsManager = true,
  autoFullscreen = false
}: DualCameraBasketballPlayerProps) {
  const [primaryVideo, setPrimaryVideo] = useState<Video | null>(null)
  const [secondaryVideo, setSecondaryVideo] = useState<Video | null>(null)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('side-by-side')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [teams, setTeams] = useState<{ red: BasketballTeamInfo; blue: BasketballTeamInfo }>({
    red: { id: 'red', name: 'Red', color: 'red', score: 0 },
    blue: { id: 'blue', name: 'Blue', color: 'blue', score: 0 }
  })

  // Load videos
  const { data: videos = [], isLoading: videosLoading } = useGameVideos(gameId)
  
  // Initialize basketball tagging system (using primary video)
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
  } = useBasketballMatchTagging(primaryVideoId, teams)

  // Find and set videos
  useEffect(() => {
    if (videos.length > 0) {
      const primary = videos.find(v => v.id === primaryVideoId) || videos[0]
      const secondary = secondaryVideoId ? videos.find(v => v.id === secondaryVideoId) : null
      
      setPrimaryVideo(primary)
      setSecondaryVideo(secondary)
      onVideoChange?.(primary)
    }
  }, [videos, primaryVideoId, secondaryVideoId, onVideoChange])

  // Update teams in tagging system
  useEffect(() => {
    updateTeams(teams)
  }, [teams, updateTeams])

  // Notify parent of events changes
  useEffect(() => {
    onEventsChange?.(matchState.tagHistory)
  }, [matchState.tagHistory, onEventsChange])

  // Fullscreen functionality
  const toggleFullscreen = useCallback(async () => {
    const videoContainer = document.querySelector('[data-dual-video-container]') as HTMLElement

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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
        case '1':
          event.preventDefault()
          setLayoutMode('primary-only')
          break
        case '2':
          event.preventDefault()
          setLayoutMode('secondary-only')
          break
        case '3':
          event.preventDefault()
          setLayoutMode('side-by-side')
          break
        case '4':
          event.preventDefault()
          setLayoutMode('picture-in-picture')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleFullscreen, isFullscreen])

  // Auto-enter fullscreen when component mounts
  useEffect(() => {
    if (!autoFullscreen) return

    const enterFullscreen = async () => {
      const videoContainer = document.querySelector('[data-dual-video-container]') as HTMLElement
      if (videoContainer && !document.fullscreenElement) {
        try {
          await videoContainer.requestFullscreen()
          setIsFullscreen(true)
        } catch (error) {
          console.error('Auto-fullscreen error:', error)
        }
      }
    }

    const timer = setTimeout(enterFullscreen, 100)
    return () => clearTimeout(timer)
  }, [autoFullscreen])

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
    const videos = document.querySelectorAll('video')
    videos.forEach(video => {
      video.currentTime = time
    })
    updateVideoState({ currentTime: time })
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

  // Handle sidebar filter changes
  const handleSidebarFilterChange = useCallback((teamFilter: any, selectedActions: any[], selectedShotOutcomes: string[]) => {
    // Handle filter changes
  }, [])

  if (videosLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading videos...</p>
        </div>
      </div>
    )
  }

  if (!primaryVideo) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Primary video not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getLayoutClasses = () => {
    switch (layoutMode) {
      case 'side-by-side':
        return 'grid grid-cols-2 gap-2'
      case 'picture-in-picture':
        return 'relative'
      case 'primary-only':
        return 'w-full'
      case 'secondary-only':
        return 'w-full'
      default:
        return 'grid grid-cols-2 gap-2'
    }
  }

  const renderVideoPlayer = (video: Video, isPrimary: boolean = true) => {
    const processingFlow = useVideoProcessingMonitor(video?.id || undefined)
    
    return (
      <div className={`relative bg-black rounded-lg overflow-hidden ${isPrimary ? 'h-full' : 'h-full'}`}>
        {/* Game Score Banner Overlay */}
        {showGameScoreBanner && isPrimary && (
          <GameScoreBanner matchState={matchState} isFullscreen={isFullscreen} />
        )}
        
        {/* Adaptive Video Player */}
        {processingFlow.video?.hlsPlaylistUrl || processingFlow.video?.mp4StreamUrl ? (
          <AdaptiveVideoPlayer
            hlsUrl={processingFlow.video?.hlsPlaylistUrl}
            mp4Url={processingFlow.video?.mp4StreamUrl || video.s3Url}
            title={video.title}
            className="w-full h-full"
            controls={false}
            onTimeUpdate={(time) => {
              if (isPrimary) {
                handleVideoTimeUpdate(time, video.duration || 0, true)
              }
            }}
            onDurationChange={(duration) => {
              if (isPrimary) {
                handleVideoTimeUpdate(matchState.currentTime, duration, matchState.videoState.isPlaying)
              }
            }}
          />
        ) : (
          <video
            className="w-full h-full object-contain"
            src={video.s3Url}
            controls={false}
            onTimeUpdate={(e) => {
              const video = e.target as HTMLVideoElement
              if (isPrimary) {
                handleVideoTimeUpdate(video.currentTime, video.duration, !video.paused)
              }
            }}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement
              if (isPrimary) {
                handleVideoTimeUpdate(video.currentTime, video.duration, !video.paused)
              }
            }}
            onPlay={(e) => {
              const video = e.target as HTMLVideoElement
              if (isPrimary) {
                handleVideoTimeUpdate(video.currentTime, video.duration, true)
              }
            }}
            onPause={(e) => {
              const video = e.target as HTMLVideoElement
              if (isPrimary) {
                handleVideoTimeUpdate(video.currentTime, video.duration, false)
              }
            }}
          />
        )}
      </div>
    )
  }

  return (
    <TeamContextProvider>
      <div className={`min-h-screen flex items-center justify-center p-4 ${className}`}>
        <div className="max-w-7xl w-full">
          <Card className="shadow-lg border-0 bg-transparent">
            <CardContent className="p-2 space-y-0">
              <div data-dual-video-container className={`relative ${!isFullscreen ? 'flex' : ''}`}>
                <div className={!isFullscreen ? 'flex-1' : 'w-full'}>
                  {/* Layout Controls */}
                  {!isFullscreen && (
                    <div className="mb-4 flex justify-between items-center">
                      <ToggleGroup type="single" value={layoutMode} onValueChange={(value) => value && setLayoutMode(value as LayoutMode)}>
                        <ToggleGroupItem value="side-by-side" aria-label="Side by side">
                          <Layout className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="picture-in-picture" aria-label="Picture in picture">
                          <Maximize2 className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="primary-only" aria-label="Primary only">
                          <Monitor className="h-4 w-4" />
                        </ToggleGroupItem>
                        {secondaryVideo && (
                          <ToggleGroupItem value="secondary-only" aria-label="Secondary only">
                            <MonitorOff className="h-4 w-4" />
                          </ToggleGroupItem>
                        )}
                      </ToggleGroup>
                      
                      <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      </Button>
                    </div>
                  )}

                  {/* Video Layout */}
                  <div className={`${getLayoutClasses()} ${isFullscreen ? 'h-screen' : 'h-[800px]'}`}>
                    {/* Primary Video */}
                    {(layoutMode === 'primary-only' || layoutMode === 'side-by-side' || layoutMode === 'picture-in-picture') && (
                      <div className={layoutMode === 'picture-in-picture' ? 'relative w-full h-full' : ''}>
                        {renderVideoPlayer(primaryVideo, true)}
                        
                        {/* Picture-in-Picture Secondary Video */}
                        {layoutMode === 'picture-in-picture' && secondaryVideo && (
                          <div className="absolute bottom-4 right-4 w-64 h-48 bg-black rounded-lg overflow-hidden border-2 border-white shadow-lg">
                            {renderVideoPlayer(secondaryVideo, false)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Secondary Video (Side by Side) */}
                    {layoutMode === 'side-by-side' && secondaryVideo && (
                      <div>
                        {renderVideoPlayer(secondaryVideo, false)}
                      </div>
                    )}

                    {/* Secondary Video Only */}
                    {layoutMode === 'secondary-only' && secondaryVideo && (
                      <div className="w-full">
                        {renderVideoPlayer(secondaryVideo, false)}
                      </div>
                    )}
                  </div>

                  {/* Overlay Timeline */}
                  {showVideoTimeline && (
                    <div className="absolute left-0 right-0 bottom-16 z-50">
                      <VideoOverlayTimeline
                        events={getCombinedEvents()}
                        duration={matchState.videoState.duration}
                        currentTime={matchState.currentTime}
                        onSeek={handleTimelineClick}
                        teams={matchState.teams}
                        teamFilter="all"
                        selectedActions={[]}
                      />
                    </div>
                  )}

                  {/* Video Controls */}
                  {showVideoControls && (
                    <div className="absolute bottom-0 left-0 right-0 z-50">
                      <VideoPlaybackControls
                        isPlaying={matchState.videoState.isPlaying}
                        currentTime={matchState.currentTime}
                        duration={matchState.videoState.duration}
                        onPlayPause={() => {
                          const videos = document.querySelectorAll('video')
                          videos.forEach(video => {
                            if (matchState.videoState.isPlaying) {
                              video.pause()
                            } else {
                              video.play()
                            }
                          })
                        }}
                        onSeek={handleTimelineClick}
                        onToggleFullscreen={toggleFullscreen}
                        isFullscreen={isFullscreen}
                      />
                    </div>
                  )}
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
                      showEvents={true}
                      onShowEventsToggle={() => {}}
                      showEventKey={true}
                      onShowEventKeyToggle={() => {}}
                      showFilters={false}
                      onShowFiltersToggle={() => {}}
                      teamFilter="all"
                      onTeamFilterChange={() => {}}
                      actionFilter="all"
                      onActionFilterChange={() => {}}
                      onClearFilters={() => {}}
                      matchTimeMarkers={getMatchTimeMarkers()}
                      nextRequiredEvent={getNextRequiredMatchEvent()}
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