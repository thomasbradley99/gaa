"use client"

import { VideoPlayerWithBasketballEvents } from '@/components/video-player/VideoPlayerWithBasketballEvents'

interface BasketballVideoPageProps {
  params: {
    gameId: string
    videoId: string
  }
}

export default function BasketballVideoPage({ params }: BasketballVideoPageProps) {
  const { gameId, videoId } = params

  return (
    <VideoPlayerWithBasketballEvents
      gameId={gameId}
      videoId={videoId}
      className="min-h-screen bg-gray-50"
    />
  )
} 