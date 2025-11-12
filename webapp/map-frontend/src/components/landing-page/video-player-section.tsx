"use client"

import { VideoPlayerWithEvents } from "@/components/video-player/VideoPlayerWithEvents"

export function VideoPlayerHeroSection() {
  return (
    <section className="py-8 px-4 text-center bg-black/60 backdrop-blur-sm">
      <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 text-white">See ClannAI in action</h2>
      <div className="w-full max-w-6xl mx-auto flex justify-center">
        <VideoPlayerWithEvents
          gameId="6ff42b36-a71f-47eb-a95e-416c7dbddbad"
          videoId="b8fe59c0-c596-476a-8050-79b30ca5d5d1"
          isPublic={true}
          className="!min-h-[600px] !flex !items-start !justify-center !p-0"
        />
      </div>
    </section>
  )
} 