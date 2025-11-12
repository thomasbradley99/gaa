"use client"

import { useAuth } from "@/contexts/auth-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { AuthComponent } from "@/components/auth/auth-component"
import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import {
  HeroSection,
} from "@/components/landing-page/hero-section"
import {
  Navigation,
} from "@/components/landing-page/nav-bar"
import {
  VideoPlayerHeroSection
} from "@/components/landing-page/video-player-section"
import { PitchFinder } from "@/components/landing-page/pitch-finder/PitchFinder"

export default function LandingPage() {
  console.log('LandingPage env:', process.env.NEXT_PUBLIC_NO_AUTH_API_BASE_URL)
  
  const { isAuthenticated, loading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signin')

  // Close dialog when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && authDialogOpen) {
      setAuthDialogOpen(false)
    }
  }, [isAuthenticated, authDialogOpen])

  // Handle video analysis - triggers sign-in/sign-up
  const handleVideoAnalysis = () => {
    setAuthDialogOpen(true)
    setAuthInitialMode('signup')
  }

  // Handle sign in
  const handleSignIn = () => {
    setAuthDialogOpen(true)
    setAuthInitialMode('signin')
  }

  // Handle sign up
  const handleSignUp = () => {
    setAuthDialogOpen(true)
    setAuthInitialMode('signup')
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Full-page video background */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-0"
        src="/hero-video.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="relative z-20">
        {/* Auth Dialog */}
        <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
          <DialogContent className="max-w-md p-0">
            <DialogTitle className="sr-only">Sign In or Sign Up</DialogTitle>
            <AuthComponent initialMode={authInitialMode} />
          </DialogContent>
        </Dialog>

        {/* Navigation */}
        <Navigation 
          isAuthenticated={isAuthenticated}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />

        {/* Hero Section */}
        <HeroSection 
          isAuthenticated={isAuthenticated}
          onVideoAnalysis={handleVideoAnalysis}
        />

        {/* Video Player Hero Section */}
        <VideoPlayerHeroSection />

        {/* Pitch Finder Section */}
        <section className="py-12 bg-transparent">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center text-foreground">Connect your club</h2>
          <PitchFinder />
        </section>

        {/* Footer */}
        <footer className="border-t py-8 px-4 bg-transparent backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Sparkles className="w-6 h-6 text-primary" />
              <span className="font-semibold">ClannAi</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 ClannAi. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
} 