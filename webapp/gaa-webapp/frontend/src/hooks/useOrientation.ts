'use client'

import { useState, useEffect } from 'react'

export type Orientation = 'portrait' | 'landscape'

export function useOrientation() {
  const [orientation, setOrientation] = useState<Orientation>('landscape')
  const [isPortrait, setIsPortrait] = useState(false)
  const [isLandscape, setIsLandscape] = useState(true)

  useEffect(() => {
    // Function to update orientation state
    const updateOrientation = () => {
      const isPortraitMode = window.innerHeight > window.innerWidth
      const newOrientation: Orientation = isPortraitMode ? 'portrait' : 'landscape'
      
      setOrientation(newOrientation)
      setIsPortrait(isPortraitMode)
      setIsLandscape(!isPortraitMode)
    }

    // Initial check
    updateOrientation()

    // Listen for resize events
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  return { orientation, isPortrait, isLandscape }
}
