"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, ArrowRight, AppWindow, Link as LinkIcon, Zap } from "lucide-react"
import Link from "next/link"
import { TypingEffect } from "@/components/ui/typing-effect"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"


// Configurable array of tracking capabilities
const trackingCapabilities = [
  "counter attacks",
  "energy expended", 
  "player positioning",
  "pass accuracy",
  "sprint distances",
  "tackle success rates",
  "possession time",
  "shot accuracy",
  "defensive formations",
  "attacking patterns"
]

interface HeroSectionProps {
  isAuthenticated: boolean
  onVideoAnalysis: () => void
}

export function HeroSection({ isAuthenticated, onVideoAnalysis }: HeroSectionProps) {
  const [videoUrl, setVideoUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a video URL')
      return
    }

    // Basic URL validation
    try {
      new URL(videoUrl)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    setIsAnalyzing(true)
    
    // Simulate analysis process
    setTimeout(() => {
      setIsAnalyzing(false)
      onVideoAnalysis() // This will trigger the sign-in/sign-up flow
      toast.success('Video analysis started! Please sign in to continue.')
    }, 2000)
  }

  return (
    <section className="py-20 px-4 text-center relative overflow-hidden">
        {/* Removed video and overlay for transparency */}
        <div className="max-w-6xl mx-auto relative z-20">
          <Badge className="mb-6" variant="secondary">
            <Sparkles className="w-4 h-4 mr-2" />
            AI-Powered Sports Analytics
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="text-white">
              ClannAI can now track
            </span>
            <br />
            <span className="text-4xl md:text-6xl lg:text-7xl font-bold" style={{ color: '#06b6d4' }}>
              <TypingEffect 
                words={trackingCapabilities}
                speed={80}
                delay={2500}
                className=""
                cursorClassName="text-white"
              />
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Transform footage into winning game insights with our advanced AI-powered video analysis platform.
          </p>
          {/* Match Cameras Image and Analyze Card remain here */}
          <div className="relative max-w-lg mx-auto">
            <div className="relative rounded-lg overflow-hidden shadow-md">
              <Image
                src="/veo-trace-spideo.png"
                alt="Match cameras equipment for video analysis"
                width={400}
                height={200}
                className="w-full h-auto object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-[70%]">
              <Card className="w-full border-0 shadow-xl bg-gray-700 backdrop-blur-sm border border-gray-600">
                <CardContent className="p-3">
                  <div className="space-y-0">
                    <div>
                      <label htmlFor="video-url-overlay" className="block text-sm font-medium text-left text-gray-300">
                        Input link to your game
                      </label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="video-url-overlay"
                          type="url"
                          placeholder="https://app.veo.co/matches/1234567890abcdef"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          className="pl-10 text-sm bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !videoUrl.trim()}
                      size="sm"
                      className="w-full text-sm bg-cyan-600 hover:bg-cyan-700 text-white border-0"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Analyze
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
  )
} 
