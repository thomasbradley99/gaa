'use client'

import { useState, useRef, useEffect } from 'react'

interface AppleStyleTrimmerProps {
  eventTimestamp: number
  beforePadding: number
  afterPadding: number
  maxPadding?: number
  currentTime?: number
  onPaddingChange: (before: number, after: number) => void
  className?: string
}

export default function AppleStyleTrimmer({
  eventTimestamp,
  beforePadding,
  afterPadding,
  maxPadding = 15,
  currentTime = 0,
  onPaddingChange,
  className = ''
}: AppleStyleTrimmerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, initialBefore: 0, initialAfter: 0 })

  // Calculate positions and dimensions
  const totalDuration = maxPadding * 2 // Total possible duration (15s before + 15s after)
  const containerWidth = 280 // Fixed width for consistent behavior
  const pixelsPerSecond = containerWidth / totalDuration
  
  // Calculate positions
  const eventPosition = maxPadding * pixelsPerSecond // Event is always at center
  const startPosition = eventPosition - (beforePadding * pixelsPerSecond)
  const endPosition = eventPosition + (afterPadding * pixelsPerSecond)
  const selectedWidth = endPosition - startPosition
  
  // Calculate playhead position (green marker showing current time)
  const timelineStartTime = eventTimestamp - maxPadding
  const playheadOffset = currentTime - timelineStartTime
  const playheadPosition = playheadOffset * pixelsPerSecond
  const showPlayhead = playheadOffset >= 0 && playheadOffset <= totalDuration

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent, handle: 'left' | 'right') => {
    e.preventDefault()
    setIsDragging(handle)
    setDragStart({
      x: e.clientX,
      initialBefore: beforePadding,
      initialAfter: afterPadding
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const deltaX = e.clientX - dragStart.x
    const deltaSeconds = deltaX / pixelsPerSecond

    if (isDragging === 'left') {
      // Left handle: moving left increases before padding, moving right decreases it
      const newBefore = Math.max(0, Math.min(maxPadding, dragStart.initialBefore - deltaSeconds))
      onPaddingChange(Math.round(newBefore), dragStart.initialAfter)
    } else if (isDragging === 'right') {
      // Right handle: moving right increases after padding, moving left decreases it
      const newAfter = Math.max(0, Math.min(maxPadding, dragStart.initialAfter + deltaSeconds))
      onPaddingChange(dragStart.initialBefore, Math.round(newAfter))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(null)
  }

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart, beforePadding, afterPadding])

  // Generate tick marks
  const generateTicks = () => {
    const ticks = []
    for (let i = 0; i <= totalDuration; i++) {
      const position = (i / totalDuration) * containerWidth
      const isEventTick = i === maxPadding
      const isSecondMark = i % 5 === 0
      
      ticks.push(
        <div
          key={i}
          className={`absolute bottom-0 ${
            isEventTick 
              ? 'w-0.5 h-6 bg-white' 
              : isSecondMark 
                ? 'w-px h-4 bg-white/60' 
                : 'w-px h-2 bg-white/40'
          }`}
          style={{ left: `${position}px` }}
        />
      )
    }
    return ticks
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-3 ${className}`}>
      {/* Header with time info */}
      <div className="flex justify-between items-center mb-3 text-xs">
        <span className="text-gray-400 font-medium">-{beforePadding}s</span>
        <span className="text-white font-bold flex items-center gap-1">
          <span>⚽</span>
          {formatTime(eventTimestamp)}
        </span>
        <span className="text-gray-400 font-medium">+{afterPadding}s</span>
      </div>

      {/* Timeline Container */}
      <div 
        ref={containerRef}
        className="relative bg-gray-900 rounded-lg h-12 mx-auto cursor-pointer select-none overflow-visible"
        style={{ width: `${containerWidth}px` }}
      >
        {/* Tick marks - at bottom edge of timeline */}
        <div className="absolute -bottom-2 left-0 right-0 pointer-events-none">
          {generateTicks()}
        </div>

        {/* Selected region */}
        <div
          className="absolute top-2 bottom-2 bg-white/20 border border-white/40 rounded"
          style={{
            left: `${startPosition}px`,
            width: `${selectedWidth}px`
          }}
        />

        {/* Event marker (center line) */}
        <div
          className="absolute top-1 bottom-1 w-0.5 bg-white z-10 pointer-events-none"
          style={{ left: `${eventPosition}px` }}
        />

        {/* Playhead marker (current time) */}
        {showPlayhead && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-white z-20 pointer-events-none transition-all duration-100"
            style={{ left: `${playheadPosition}px` }}
          />
        )}

        {/* Left handle */}
        <div
          className={`absolute top-0 bottom-0 w-3 bg-white/80 rounded-l cursor-ew-resize flex items-center justify-center group hover:bg-white transition-colors ${
            isDragging === 'left' ? 'bg-white' : ''
          }`}
          style={{ left: `${startPosition - 6}px` }}
          onMouseDown={(e) => handleMouseDown(e, 'left')}
        >
          <div className="w-0.5 h-4 bg-gray-800 rounded-full" />
        </div>

        {/* Right handle */}
        <div
          className={`absolute top-0 bottom-0 w-3 bg-white/80 rounded-r cursor-ew-resize flex items-center justify-center group hover:bg-white transition-colors ${
            isDragging === 'right' ? 'bg-white' : ''
          }`}
          style={{ left: `${endPosition - 6}px` }}
          onMouseDown={(e) => handleMouseDown(e, 'right')}
        >
          <div className="w-0.5 h-4 bg-gray-800 rounded-full" />
        </div>
      </div>
    </div>
  )
}
