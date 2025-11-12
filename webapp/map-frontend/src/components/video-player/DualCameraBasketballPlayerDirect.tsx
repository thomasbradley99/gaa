"use client"

import { useRef, useState } from 'react'

interface DualCameraBasketballPlayerDirectProps {
  primaryVideoUrl: string
  secondaryVideoUrl: string
  primaryVideoTitle?: string
  secondaryVideoTitle?: string
  className?: string
}

export function DualCameraBasketballPlayerDirect({
  primaryVideoUrl,
  secondaryVideoUrl,
  primaryVideoTitle = "Left Camera",
  secondaryVideoTitle = "Right Camera",
  className = ""
}: DualCameraBasketballPlayerDirectProps) {
  const primaryRef = useRef<HTMLVideoElement>(null)
  const secondaryRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Sync play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      primaryRef.current?.pause()
      secondaryRef.current?.pause()
      setIsPlaying(false)
    } else {
      primaryRef.current?.play()
      secondaryRef.current?.play()
      setIsPlaying(true)
    }
  }

  // Sync seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value)
    if (primaryRef.current) primaryRef.current.currentTime = time
    if (secondaryRef.current) secondaryRef.current.currentTime = time
    setCurrentTime(time)
  }

  // When main video time updates, sync the other
  const handleTimeUpdate = () => {
    if (primaryRef.current) {
      setCurrentTime(primaryRef.current.currentTime)
      if (secondaryRef.current && Math.abs(secondaryRef.current.currentTime - primaryRef.current.currentTime) > 0.1) {
        secondaryRef.current.currentTime = primaryRef.current.currentTime
      }
    }
  }

  // When loaded, set duration
  const handleLoadedMetadata = () => {
    if (primaryRef.current) setDuration(primaryRef.current.duration)
  }

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center ${className}`}>
      <div className="w-full flex flex-row gap-2 items-center justify-center">
        <div className="flex-1 flex flex-col items-center">
          <span className="mb-1 text-xs text-gray-500">{primaryVideoTitle}</span>
          <video
            ref={primaryRef}
            src={primaryVideoUrl}
            className="w-full max-h-[400px] bg-black rounded"
            controls={false}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />
        </div>
        <div className="flex-1 flex flex-col items-center">
          <span className="mb-1 text-xs text-gray-500">{secondaryVideoTitle}</span>
          <video
            ref={secondaryRef}
            src={secondaryVideoUrl}
            className="w-full max-h-[400px] bg-black rounded"
            controls={false}
            // Only update play/pause state, don't sync time from here
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      </div>
      <div className="w-full max-w-2xl flex flex-col items-center mt-4">
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="w-full"
        />
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={handlePlayPause}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <span className="text-xs text-gray-600">
            {Math.floor(currentTime)} / {Math.floor(duration)} sec
          </span>
        </div>
      </div>
    </div>
  )
} 