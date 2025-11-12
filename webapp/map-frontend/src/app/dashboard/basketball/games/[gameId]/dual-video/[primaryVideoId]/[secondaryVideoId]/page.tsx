"use client"

import { DualCameraBasketballPlayer } from '@/components/video-player/DualCameraBasketballPlayer'

interface DualCameraBasketballVideoPageProps {
  params: {
    gameId: string
    primaryVideoId: string
    secondaryVideoId: string
  }
}

export default function DualCameraBasketballVideoPage({ params }: DualCameraBasketballVideoPageProps) {
  const { gameId, primaryVideoId, secondaryVideoId } = params

  return (
    <DualCameraBasketballPlayer
      gameId={gameId}
      primaryVideoId={primaryVideoId}
      secondaryVideoId={secondaryVideoId}
      className="min-h-screen bg-gray-50"
    />
  )
} 