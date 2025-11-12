"use client"

import { DualCameraBasketballPlayerDirect } from '@/components/video-player/DualCameraBasketballPlayerDirect'

export default function TestDualCameraPage() {
  // Firebase video URLs provided by user
  const leftCameraUrl = "https://firebasestorage.googleapis.com/v0/b/hooper-ac7b0.appspot.com/o/sessions%2FHGRnfBNFWKR5tUJokUHF?alt=media&token=c54da24b-d465-4e10-a936-5d380b65cbb9"
  const rightCameraUrl = "https://firebasestorage.googleapis.com/v0/b/hooper-ac7b0.appspot.com/o/sessions%2Fe2nPtR6FznYcSmaGSKGL?alt=media&token=2a336399-d1f8-427e-b62b-8dfdaa5dc924"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Basketball Dual Camera Test</h1>
        <p className="text-gray-600 mb-6">
          Testing dual camera functionality with your Firebase video URLs
        </p>
        
        <DualCameraBasketballPlayerDirect
          primaryVideoUrl={leftCameraUrl}
          secondaryVideoUrl={rightCameraUrl}
          primaryVideoTitle="Left Camera"
          secondaryVideoTitle="Right Camera"
          className="min-h-screen"
          showGameScoreBanner={true}
          showVideoTimeline={true}
          showVideoControls={true}
          showEventsManager={true}
          autoFullscreen={false}
        />
      </div>
    </div>
  )
} 