import { useState, useEffect } from 'react'

export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [isPortrait, setIsPortrait] = useState(false)
  const [isLandscape, setIsLandscape] = useState(true)

  useEffect(() => {
    const updateOrientation = () => {
      const isPortraitMode = window.innerHeight > window.innerWidth
      setOrientation(isPortraitMode ? 'portrait' : 'landscape')
      setIsPortrait(isPortraitMode)
      setIsLandscape(!isPortraitMode)
    }

    // Initial check
    updateOrientation()

    // Listen for resize
    window.addEventListener('resize', updateOrientation)
    
    // Listen for orientation change
    window.addEventListener('orientationchange', updateOrientation)

    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  return { orientation, isPortrait, isLandscape }
}

