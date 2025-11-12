"use client"

import { useRef, useEffect, useCallback } from 'react'
import { AdaptiveVideoPlayer } from './adaptive-video-player'
import { VideoPlaybackControls } from '@/components/video-player/video-playback-controls'
import { VideoOverlayTimeline } from '@/components/video-player/video-overlay-timeline'
import { GameScoreBanner } from '@/components/video-player/game-score-banner'
import { useVideoProcessingMonitor } from '@/hooks/use-videos'
import type { VideoPlayerContainerProps } from './types'

export function VideoPlayerContainer({
  video,
  matchState,
  isFullscreen,
  onTimeUpdate,
  onToggleFullscreen,
  onTimelineClick,
  getCombinedEvents,
  updateVideoState,
  teams,
  // Add these new props with defaults
  showGameScoreBanner = true,
  showVideoTimeline = true,
  showVideoControls = true,
  sidebarTeamFilter = 'all',
  sidebarSelectedActions = [],
  sidebarSelectedShotOutcomes = []
}: VideoPlayerContainerProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const adaptiveVideoRef = useRef<HTMLVideoElement>(null)
  const fallbackVideoRef = useRef<HTMLVideoElement>(null)

  // Check for processed video status
  const processingFlow = useVideoProcessingMonitor(video?.id || undefined)

  // Get current video element (adaptive or fallback)
  const getCurrentVideoElement = useCallback(() => {
    // Try adaptive player first, then fallback
    if (processingFlow.video?.hlsPlaylistUrl || processingFlow.video?.mp4StreamUrl) {
      return adaptiveVideoRef.current || (window as any).videoElement
    }
    return fallbackVideoRef.current || (window as any).videoElement
  }, [processingFlow.video])

  // Set up video element reference for adaptive player
  useEffect(() => {
    if (processingFlow.video?.hlsPlaylistUrl || processingFlow.video?.mp4StreamUrl) {
      // Find the video element within the adaptive player
      const findVideoElement = () => {
        const videoEl = videoContainerRef.current?.querySelector('video') as HTMLVideoElement;
        if (videoEl) {
          (window as any).videoElement = videoEl;
          adaptiveVideoRef.current = videoEl;
        }
      };
      
      // Try immediately and then with a small delay for DOM updates
      findVideoElement();
      const timeout = setTimeout(findVideoElement, 100);
      const interval = setInterval(findVideoElement, 500); // Check periodically until found
      
      // Clear interval once video element is found
      const checkInterval = setInterval(() => {
        if ((window as any).videoElement) {
          clearInterval(interval);
          clearInterval(checkInterval);
        }
      }, 100);
      
      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
        clearInterval(checkInterval);
      };
    }
  }, [processingFlow.video?.hlsPlaylistUrl, processingFlow.video?.mp4StreamUrl, video])

  return (
    <div 
      ref={videoContainerRef}
      className={`relative bg-black ${isFullscreen ? 'h-screen w-screen rounded-lg' : 'rounded-l-lg'}`} 
      style={isFullscreen ? { position: 'relative' } : { height: '800px', overflow: 'hidden', position: 'relative' }}
    >
      {/* Game Score Banner Overlay */}
      {showGameScoreBanner && (
        <GameScoreBanner matchState={matchState} isFullscreen={isFullscreen} />
      )}
      
      {/* Adaptive Video Player - Uses processed videos when available */}
      {processingFlow.video?.hlsPlaylistUrl || processingFlow.video?.mp4StreamUrl ? (
        <div className="w-full h-full">
          <AdaptiveVideoPlayer
            hlsUrl={processingFlow.video?.hlsPlaylistUrl}
            mp4Url={processingFlow.video?.mp4StreamUrl || video.s3Url}
            title={video.title}
            className={`w-full ${isFullscreen ? 'h-full' : 'h-[800px]'}`}
            controls={false}
            onTimeUpdate={(time) => {
              const videoEl = videoContainerRef.current?.querySelector('video') as HTMLVideoElement;
              if (videoEl) {
                onTimeUpdate(time, videoEl.duration || matchState.videoState.duration, !videoEl.paused);
              }
            }}
            onDurationChange={(duration) => {
              onTimeUpdate(matchState.currentTime, duration, matchState.videoState.isPlaying);
            }}
          />
        </div>
      ) : (
        <video
          ref={(el) => {
            fallbackVideoRef.current = el
            if (el) {
              (window as any).videoElement = el
            }
          }}
          className="w-full h-full object-contain"
          src={video.s3Url}
          controls={false}
          style={isFullscreen ? {} : { maxHeight: '800px', height: '800px' }}
          onTimeUpdate={(e) => {
            const video = e.target as HTMLVideoElement
            onTimeUpdate(video.currentTime, video.duration, !video.paused)
          }}
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement
            onTimeUpdate(video.currentTime, video.duration, !video.paused)
          }}
          onPlay={(e) => {
            const video = e.target as HTMLVideoElement
            onTimeUpdate(video.currentTime, video.duration, true)
          }}
          onPause={(e) => {
            const video = e.target as HTMLVideoElement
            onTimeUpdate(video.currentTime, video.duration, false)
          }}
        />
      )}
      
      {/* Overlay Timeline */}
      {showVideoTimeline && (
        <div className="absolute left-0 right-0 bottom-16 z-50">
          <VideoOverlayTimeline
            events={getCombinedEvents()}
            duration={matchState.videoState.duration}
            currentTime={matchState.currentTime}
            onSeek={(time) => {
              const video = (window as any).videoElement as HTMLVideoElement
              if (video) {
                video.currentTime = time
                updateVideoState({ currentTime: time })
              }
            }}
            teams={matchState.teams}
            teamFilter={sidebarTeamFilter}
            selectedActions={sidebarSelectedActions}
          />
        </div>
      )}
      
      {/* Overlaid Video Playback Controls */}
      {showVideoControls && (
        <div className="absolute bottom-4 left-4 right-4">
          <VideoPlaybackControls
            isPlaying={matchState.videoState.isPlaying}
            currentTime={matchState.currentTime}
            duration={matchState.videoState.duration}
            events={getCombinedEvents()}
            isFullscreen={isFullscreen}
            onSeek={(time) => {
              const video = (window as any).videoElement as HTMLVideoElement
              if (video) {
                video.currentTime = time
                updateVideoState({ currentTime: time })
              }
            }}
            onToggleFullscreen={onToggleFullscreen}
          />
        </div>
      )}
    </div>
  )
}
