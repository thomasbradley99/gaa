'use client'

import { useRef, useEffect, useState } from 'react'
import Hls from 'hls.js'
import type { AdaptiveVideoPlayerProps } from './types'

export function AdaptiveVideoPlayer({
  hlsUrl,
  mp4Url,
  onTimeUpdate,
  onDurationChange,
  className = '',
  autoPlay = false,
  muted = false,
}: AdaptiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize HLS or fallback to MP4
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const initializeVideo = async () => {
      setIsLoading(true)
      setError(null)

      // Try HLS first if supported and URL is available
      if (hlsUrl && Hls.isSupported()) {
        try {
          console.log('🎬 Initializing HLS with URL:', hlsUrl)

          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            debug: false,
          })

          hls.loadSource(hlsUrl)
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('✅ HLS manifest loaded successfully')
            setIsLoading(false)
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('❌ HLS Error:', data)
            if (data.fatal) {
              console.log('🔄 HLS fatal error, falling back to MP4')
              // Fallback to MP4
              try {
                hls.destroy()
              } catch (destroyErr) {
                console.warn('Error destroying HLS instance:', destroyErr)
              }
              hlsRef.current = null
              video.src = mp4Url
              setIsLoading(false)
            }
          })

          hlsRef.current = hls
          return
        } catch (err) {
          console.error('❌ HLS initialization failed:', err)
          // Continue to fallback
        }
      } else if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        console.log('🍎 Using native HLS support')
        video.src = hlsUrl
        setIsLoading(false)
      } else {
        // Fallback to MP4
        console.log('📹 Using MP4 fallback')
        video.src = mp4Url
        setIsLoading(false)
      }
    }

    initializeVideo()

    // Cleanup on unmount
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [hlsUrl, mp4Url])

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime, video.duration || 0, !video.paused)
    }

    const handleDurationChange = () => {
      const dur = video.duration || 0
      onDurationChange?.(dur)
      onTimeUpdate(video.currentTime, dur, !video.paused)
    }

    const handlePlay = () => {
      onTimeUpdate(video.currentTime, video.duration || 0, true)
    }

    const handlePause = () => {
      onTimeUpdate(video.currentTime, video.duration || 0, false)
    }

    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleError = () => {
      setError('Failed to load video')
      setIsLoading(false)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('loadedmetadata', handleDurationChange)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)

    // Expose video element to window for external access
    ;(window as any).videoElement = video

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('loadedmetadata', handleDurationChange)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
    }
  }, [onTimeUpdate, onDurationChange])

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        controls={false}
        preload="metadata"
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75">
          <div className="text-white text-center">
            <p className="text-lg font-semibold">Video Error</p>
            <p className="text-sm opacity-75">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

