'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { EventList } from './EventList'
import { GameStats } from './GameStats'
import AppleStyleTrimmer from './AppleStyleTrimmer'
import { GAA_COACHES, getDefaultCoach, type Coach } from './gaa-coaches'
import type { GameEvent } from './video-player/types'
import * as apiClient from '@/lib/api-client'

interface UnifiedSidebarProps {
  isOpen: boolean
  onClose: () => void
  game: any
  gameId?: string
  events: GameEvent[]
  currentTime: number
  duration: number
  onEventClick: (event: GameEvent) => void
  teamFilter: 'all' | 'home' | 'away'
  onTeamFilterChange: (filter: 'all' | 'home' | 'away') => void
  isMobile?: boolean
  mobileVideoComponent?: React.ReactNode
  onRefresh?: () => void
  onEventsUploaded?: (events: GameEvent[]) => void
  allEvents: GameEvent[]
  onEventsUpdate?: (events: GameEvent[]) => void
  onEventPaddingsChange?: (paddings: Map<number, { beforePadding: number, afterPadding: number }>) => void
  onAutoplayChange?: (enabled: boolean) => void
}

type TabType = 'events' | 'stats' | 'ai'

export default function UnifiedSidebar({
  isOpen,
  onClose,
  game,
  gameId,
  events,
  currentTime,
  duration,
  onEventClick,
  teamFilter,
  onTeamFilterChange,
  isMobile = false,
  mobileVideoComponent,
  onRefresh,
  onEventsUploaded,
  allEvents,
  onEventsUpdate,
  onEventPaddingsChange,
  onAutoplayChange,
}: UnifiedSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stats')
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editModeEvents, setEditModeEvents] = useState<Map<number, GameEvent>>(new Map())
  const [binnedEvents, setBinnedEvents] = useState<Set<number>>(new Set())
  const [isSavingEvents, setIsSavingEvents] = useState(false)
  
  // Event padding state (for visual trimmer)
  const [eventPaddings, setEventPaddings] = useState<Map<number, {
    beforePadding: number
    afterPadding: number
  }>>(new Map())
  const [showTrimmers, setShowTrimmers] = useState(false)
  const [autoplayMode, setAutoplayMode] = useState(false)
  
  // AI Chat state
  const [selectedCoach, setSelectedCoach] = useState<Coach>(getDefaultCoach())
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [isAIChatLoading, setIsAIChatLoading] = useState(false)
  
  // Auto-scroll state
  const eventListRef = useRef<HTMLDivElement>(null)
  const lastUserScrollRef = useRef<number>(0)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  
  // Event type filters for GAA
  const [eventTypeFilters, setEventTypeFilters] = useState({
    // Shot outcomes (what we actually detect)
    point: true,
    wide: true,
    goal: true,
    saved: true,
    // Actions (what we actually detect)
    kickout: true,
    turnover: true,
    foul: true,
    'throw-up': true,
    penalty: true,
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Add event state
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({
    type: 'shot',
    team: 'home',
    description: '',
    player: '',
  })

  // Helper functions
  
  // Get padding for an event (with defaults)
  const getEventPadding = (eventIndex: number) => {
    return eventPaddings.get(eventIndex) || { beforePadding: 5, afterPadding: 3 }
  }

  // Update padding for an event
  const updateEventPadding = (eventIndex: number, beforePadding: number, afterPadding: number) => {
    const newPaddings = new Map(eventPaddings)
    newPaddings.set(eventIndex, { beforePadding, afterPadding })
    setEventPaddings(newPaddings)
    
    // Notify parent so it can pass to VideoPlayer
    onEventPaddingsChange?.(newPaddings)
  }

  // Helper functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getEventEmoji = (type: string) => {
    return ''
  }

  // Helper: Get display type from new schema (action + outcome)
  const getEventDisplayType = (event: GameEvent): string => {
    // For shots, show the outcome (Point, Wide, Goal)
    if (event.action === 'Shot') {
      return event.outcome || 'Shot'
    }
    // For everything else, show the action
    return event.action || 'Event'
  }

  // Handle user scroll - disable auto-scroll temporarily
  const handleUserScroll = () => {
    lastUserScrollRef.current = Date.now()
    setAutoScrollEnabled(false)
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Re-enable auto-scroll after 10 seconds of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setAutoScrollEnabled(true)
    }, 10000)
  }
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const handleToggleEditMode = () => {
    if (isEditMode) {
      // Exiting edit mode - reset
      setIsEditMode(false)
      setEditModeEvents(new Map())
      setIsCreatingEvent(false)
    } else {
      // Entering edit mode
      setIsEditMode(true)
    }
  }

  const handleUpdateEditModeEvent = (index: number, updatedEvent: GameEvent) => {
    const newEditModeEvents = new Map(editModeEvents)
    newEditModeEvents.set(index, updatedEvent)
    setEditModeEvents(newEditModeEvents)
  }

  const handleBinEvent = (index: number) => {
    const newBinnedEvents = new Set(binnedEvents)
    newBinnedEvents.add(index)
    setBinnedEvents(newBinnedEvents)
  }

  const handleUnbinEvent = (index: number) => {
    const newBinnedEvents = new Set(binnedEvents)
    newBinnedEvents.delete(index)
    setBinnedEvents(newBinnedEvents)
  }

  const handleStartCreatingEvent = () => {
    setIsCreatingEvent(true)
    setNewEvent({
      type: 'shot',
      team: 'home',
      description: '',
      player: '',
      timestamp: Math.floor(currentTime),
    })
  }

  const handleCancelCreateEvent = () => {
    setIsCreatingEvent(false)
  }

  const handleCreateEvent = async () => {
    // Determine action/outcome based on event type
    const eventType = newEvent.type
    const isShot = ['point', 'wide', 'goal', 'saved'].includes(eventType.toLowerCase())
    
    const event: GameEvent = {
      id: `event-${Date.now()}`,
      time: Math.floor(newEvent.timestamp),
      action: isShot ? 'Shot' : eventType.charAt(0).toUpperCase() + eventType.slice(1),
      outcome: isShot ? eventType.charAt(0).toUpperCase() + eventType.slice(1) : 'N/A',
      team: newEvent.team as 'home' | 'away',
      player: newEvent.player || undefined,
      description: newEvent.description || undefined,
      metadata: {
        validated: false,
        autoGenerated: false,
        userCreated: true,
      }
    }

    // Add to allEvents and sort by time
    const newAllEvents = [...allEvents, event].sort((a, b) => a.time - b.time)
    
    try {
      // Save to database immediately
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/games/${game.id}/events`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ events: newAllEvents })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save event to server')
      }
      
      console.log('✅ Created and saved new event:', event)
      
      // Update parent to refresh from DB
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('❌ Failed to create event:', error)
      alert(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    setIsCreatingEvent(false)
  }

  const handleSaveChanges = async () => {
    setIsSavingEvents(true)
    
    try {
      // Apply edits and deletions to allEvents
      let updatedEvents = [...allEvents]
      
      // Apply edits
      editModeEvents.forEach((editedEvent, index) => {
        if (updatedEvents[index]) {
          updatedEvents[index] = editedEvent
        }
      })
      
      // Remove binned events (need to track original indices)
      const binnedIndices = Array.from(binnedEvents).sort((a, b) => b - a) // Sort descending
      binnedIndices.forEach(index => {
        updatedEvents.splice(index, 1)
      })
      
      // Apply padding data to event metadata
      const finalEvents = updatedEvents.map((event, newIndex) => {
        // Find original index before deletions
        const originalIndex = allEvents.indexOf(event)
        const padding = getEventPadding(originalIndex)
        
        return {
          ...event,
          metadata: {
            ...event.metadata,
            beforePadding: padding.beforePadding,
            afterPadding: padding.afterPadding,
          }
        }
      })
      
      // Save to backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/games/${game.id}/events`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ events: finalEvents })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save events to server')
      }
      
      const data = await response.json()
      console.log('✅ Saved changes to backend:', data)
      
      // Update parent
      onEventsUpdate?.(finalEvents)
      
      // Notify parent about padding changes
      onEventPaddingsChange?.(eventPaddings)
      
      console.log('✅ Applied changes locally:', {
        edited: editModeEvents.size,
        deleted: binnedEvents.size,
        paddings: eventPaddings.size,
        total: finalEvents.length
      })
      
      // Clear edit buffers but stay in edit mode
      setEditModeEvents(new Map())
      setBinnedEvents(new Set())
      
      if (onRefresh) {
        onRefresh()
      }
      
    } catch (error) {
      console.error('❌ Failed to save changes:', error)
      alert(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSavingEvents(false)
    }
  }

  const handleCancelChanges = () => {
    // Clear changes but stay in edit mode
    setEditModeEvents(new Map())
    setBinnedEvents(new Set())
    setIsCreatingEvent(false)
  }

  // AI Chat functions
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isAIChatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsAIChatLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/games/${game.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: userMessage,
          history: chatMessages,
          systemPrompt: selectedCoach.systemPrompt
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('AI Chat error:', error)
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      setIsAIChatLoading(false)
    }
  }

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendChatMessage()
    }
  }

  // Filter events by type (using new schema: action/outcome)
  const filteredByType = (allEvents || []).filter(event => {
    const displayType = getEventDisplayType(event).toLowerCase()
    return (eventTypeFilters as any)[displayType] !== false
  })

  // Find current event index based on video time
  const currentEventIndex = (allEvents || []).findIndex((event, index) => {
    const nextEvent = allEvents[index + 1]
    if (!nextEvent) {
      // Last event - it's current if we're past its time
      return currentTime >= event.time
    }
    // Current if we're between this event and the next
    return currentTime >= event.time && currentTime < nextEvent.time
  })

  // Auto-scroll to current event (must be after currentEventIndex calculation)
  useEffect(() => {
    if (!autoScrollEnabled || !eventListRef.current || activeTab !== 'events' || currentEventIndex === -1) return
    
    // Find current event element
    const currentEventElements = eventListRef.current.querySelectorAll('[data-event-index]')
    const currentEventElement = Array.from(currentEventElements).find(
      el => el.getAttribute('data-event-index') === String(currentEventIndex)
    )
    
    if (currentEventElement) {
      console.log('🔄 Auto-scrolling to event index:', currentEventIndex)
      currentEventElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [currentEventIndex, autoScrollEnabled, activeTab, currentTime])

  return (
    <>
      {/* Backdrop (mobile only on desktop view) */}
      {!isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          isMobile
            ? 'relative w-full min-h-screen bg-black/90 backdrop-blur-sm'
            : 'fixed top-0 right-0 h-full bg-black/90 backdrop-blur-lg border-l border-white/10 z-50 transition-transform duration-300 w-full md:w-[360px]'
        } ${!isMobile && (isOpen ? 'translate-x-0' : 'translate-x-full')}`}
      >
        {/* Mobile Video Header - sticky so it stays at top */}
        {isMobile && mobileVideoComponent && (
          <div className="sticky top-0 z-30 bg-black">
            {mobileVideoComponent}
          </div>
        )}
        {/* Header - sticky on mobile with offset for video */}
        <div className={`flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/90 backdrop-blur-sm z-10 ${
          isMobile ? 'sticky top-[56.25vw]' : ''
        }`}>
          <div className="flex bg-gray-800/50 rounded-lg p-1 flex-1">
            {/* Stats Tab */}
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'stats'
                  ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Stats</span>
            </button>

            {/* Events Tab */}
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'events'
                  ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Events</span>
            </button>

            {/* AI Coach Tab */}
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'ai'
                  ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Coach</span>
            </button>
          </div>

          {/* Close Button - Hidden on Mobile */}
          {!isMobile && (
            <button
              onClick={onClose}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={`${isMobile ? 'h-[calc(100vh-57px)]' : 'h-[calc(100%-57px)]'} flex flex-col`}>
          {activeTab === 'events' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Filters and Actions Section */}
              <div className="p-4 border-b border-white/10 space-y-3">
                {/* Team Filters */}
                <div>
                  <label className="text-gray-300 block mb-2 text-sm font-medium">Team:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onTeamFilterChange('home')}
                      className={`py-2 text-xs font-semibold rounded-lg border-2 transition-colors ${
                        teamFilter === 'home'
                          ? 'bg-black/80 text-white border-white/30'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20'
                      }`}
                    >
                      Home
                    </button>
                    <button
                      onClick={() => onTeamFilterChange('away')}
                      className={`py-2 text-xs font-semibold rounded-lg border-2 transition-colors ${
                        teamFilter === 'away'
                          ? 'bg-white/90 text-black border-white/50'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20'
                      }`}
                    >
                      Away
                    </button>
                    <button
                      onClick={() => onTeamFilterChange('all')}
                      className={`py-2 text-xs font-semibold rounded-lg border-2 transition-colors ${
                        teamFilter === 'all'
                          ? 'bg-gray-500/20 text-gray-300 border-gray-500/50'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20'
                      }`}
                    >
                      Both
                    </button>
                  </div>
                </div>

                {/* Event Type Filters */}
                <div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    <span>Event Types</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showFilters && (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {Object.keys(eventTypeFilters).map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setEventTypeFilters(prev => {
                                const currentValues = Object.values(prev)
                                const allSelected = currentValues.every(val => val === true)
                                const selectedCount = currentValues.filter(val => val === true).length
                                
                                // Smart toggle behavior (like footy app):
                                // If all are selected, clicking one shows only that one
                                if (allSelected) {
                                  const newFilters = Object.keys(prev).reduce((acc, key) => {
                                    (acc as any)[key] = key === type
                                    return acc
                                  }, {} as typeof prev)
                                  return newFilters
                                }
                                
                                // If only this one is selected, clicking it shows all
                                if (selectedCount === 1 && (prev as any)[type]) {
                                  const newFilters = Object.keys(prev).reduce((acc, key) => {
                                    (acc as any)[key] = true
                                    return acc
                                  }, {} as typeof prev)
                                  return newFilters
                                }
                                
                                // Otherwise, normal toggle
                                return {
                                  ...prev,
                                  [type]: !(prev as any)[type]
                                }
                              })
                            }}
                            className={`py-1.5 px-2 text-xs font-medium rounded border transition-colors flex items-center justify-center gap-1 ${
                              (eventTypeFilters as any)[type]
                                ? 'bg-white/90 text-black border-white/50'
                                : 'bg-gray-500/10 text-gray-500 border-gray-500/30'
                            }`}
                          >
                            <span>{getEventEmoji(type)}</span>
                            <span className="hidden sm:inline">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const allTrue = Object.keys(eventTypeFilters).reduce((acc, key) => {
                            acc[key] = true
                            return acc
                          }, {} as any)
                          setEventTypeFilters(allTrue)
                        }}
                        className="w-full py-1.5 text-xs bg-gray-600/50 hover:bg-gray-600/80 text-white rounded transition-colors"
                      >
                        Reset Filters
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div>
                  <label className="text-gray-300 block mb-2 text-sm font-medium">Actions:</label>
                  {!isEditMode ? (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Auto Play Button with Toggle */}
                      <button
                        onClick={() => {
                          const newAutoplay = !autoplayMode
                          setAutoplayMode(newAutoplay)
                          // Auto-show trimmers when autoplay is enabled, hide when disabled
                          setShowTrimmers(newAutoplay)
                          // Notify parent
                          if (onAutoplayChange) onAutoplayChange(newAutoplay)
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                          autoplayMode
                            ? 'bg-white/90 hover:bg-white text-black border-white/50'
                            : 'bg-gray-500/10 hover:bg-gray-500/20 border-gray-400/30 text-gray-300'
                        }`}
                      >
                        <span className="text-xs">Auto Play</span>
                        <div
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            autoplayMode ? 'bg-black' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              autoplayMode ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </button>
                      
                      <button
                        onClick={handleToggleEditMode}
                        className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border-2 bg-white/5 hover:bg-white/10 border-white/20 text-white transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Events</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={handleStartCreatingEvent}
                          disabled={isSavingEvents}
                          className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border-2 bg-white/90 hover:bg-white border-white/50 text-black disabled:opacity-50 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add</span>
                        </button>
                        <button
                          onClick={() => {
                            // Show JSON upload modal/section
                            const fileInput = document.createElement('input')
                            fileInput.type = 'file'
                            fileInput.accept = '.json,application/json'
                            fileInput.onchange = async (e: any) => {
                              const file = e.target?.files?.[0]
                              if (!file) return
                              
                              try {
                                const text = await file.text()
                                const jsonData = JSON.parse(text)
                                let eventsArray = Array.isArray(jsonData) ? jsonData : (jsonData.events || jsonData.data || [])
                                
                                // Parse to master schema
                                const parsedEvents = eventsArray.map((event: any, index: number) => ({
                                  id: event.id || `event_${index + 1}`,
                                  time: event.time ?? event.timestamp ?? 0,
                                  team: event.team || 'home',
                                  action: event.action || event.type || 'Shot',
                                  outcome: event.outcome || 'N/A',
                                  metadata: event.metadata || {}
                                }))
                                
                                // Save to DB
                                await apiClient.games.updateEvents(gameId || game.id, parsedEvents)
                                
                                // Refresh
                                if (onEventsUploaded) onEventsUploaded(parsedEvents)
                                if (onRefresh) onRefresh()
                                
                                alert(`✅ Uploaded ${parsedEvents.length} events to database`)
                              } catch (err: any) {
                                console.error('Upload error:', err)
                                const errorMsg = err.details || err.message || 'Unknown error'
                                alert(`❌ Upload failed: ${errorMsg}`)
                              }
                            }
                            fileInput.click()
                          }}
                          disabled={isSavingEvents}
                          className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border-2 bg-white/5 hover:bg-white/10 border-white/20 text-white disabled:opacity-50 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Upload</span>
                        </button>
                        <button
                          onClick={() => {
                            // Export current events as JSON
                            const json = JSON.stringify(allEvents, null, 2)
                            const blob = new Blob([json], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'edited-web-events.json'
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            URL.revokeObjectURL(url)
                          }}
                          className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border-2 bg-white/5 hover:bg-white/10 border-white/20 text-white transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>Export JSON</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={handleSaveChanges}
                            disabled={isSavingEvents || (editModeEvents.size === 0 && binnedEvents.size === 0)}
                            className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border-2 bg-black/80 hover:bg-black border-white/30 text-white disabled:opacity-50 transition-all"
                          >
                            {isSavingEvents ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Save ({editModeEvents.size + binnedEvents.size})</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleCancelChanges}
                            disabled={isSavingEvents}
                            className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border-2 bg-red-500/10 hover:bg-red-500/20 border-red-400/30 text-red-300 disabled:opacity-50 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Cancel</span>
                          </button>
                        </div>
                        <button
                          onClick={handleToggleEditMode}
                          disabled={isSavingEvents}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg border-2 bg-white/5 hover:bg-white/10 border-white/20 text-white disabled:opacity-50 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Exit</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Create Event Form */}
                {isCreatingEvent && (
                  <div className="p-2 bg-gray-800/50 rounded-lg border border-white/20 space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-medium text-white">New Event</h4>
                      <button
                        onClick={handleCancelCreateEvent}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <input
                      type="number"
                      value={Math.round(newEvent.timestamp)}
                      onFocus={() => setNewEvent({...newEvent, timestamp: Math.floor(currentTime)})}
                      onChange={(e) => setNewEvent({...newEvent, timestamp: parseFloat(e.target.value) || 0})}
                      placeholder="Time (s)"
                      className="w-full bg-black text-white text-xs px-2 py-1 rounded border border-white/20 focus:border-white/50 focus:outline-none font-mono"
                    />
                    
                    <select
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                      className="w-full bg-black text-white text-xs px-2 py-1 rounded border border-white/20 focus:border-white/50 focus:outline-none"
                    >
                      {Object.keys(eventTypeFilters).map((type) => (
                        <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                      ))}
                    </select>
                    
                    <select
                      value={newEvent.team}
                      onChange={(e) => setNewEvent({...newEvent, team: e.target.value})}
                      className="w-full bg-black text-white text-xs px-2 py-1 rounded border border-white/20 focus:border-white/50 focus:outline-none"
                    >
                      <option value="home">Home</option>
                      <option value="away">Away</option>
                    </select>
                    
                    <input
                      type="text"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      placeholder="Description..."
                      className="w-full bg-black text-white text-xs px-2 py-1 rounded border border-white/20 focus:border-white/50 focus:outline-none"
                    />
                    
                    <input
                      type="text"
                      value={newEvent.player}
                      onChange={(e) => setNewEvent({...newEvent, player: e.target.value})}
                      placeholder="Player (optional)..."
                      className="w-full bg-black text-white text-xs px-2 py-1 rounded border border-white/20 focus:border-white/50 focus:outline-none"
                    />
                    
                    <button
                      onClick={handleCreateEvent}
                      className="w-full py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-white rounded transition-colors"
                    >
                      Create Event
                    </button>
                  </div>
                )}
              </div>

              {/* Events List */}
              <div 
                ref={eventListRef}
                onScroll={handleUserScroll}
                className="flex-1 min-h-0 overflow-y-auto p-2"
              >
                {filteredByType.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No events available
                  {game.status === 'pending' && (
                    <p className="mt-2 text-xs">Events will appear after analysis</p>
                  )}
                </div>
                ) : (
                  <div className="space-y-2">
                    {filteredByType.map((event, displayIndex) => {
                      const originalIndex = allEvents.indexOf(event)
                      const isBinned = binnedEvents.has(originalIndex)
                      
                      if (isBinned) return null
                      
                      const displayEvent = editModeEvents.get(originalIndex) || event
                      
                      const isCurrentEvent = originalIndex === currentEventIndex
                      
                      return (
                        <div
                          key={`${event.id}-${originalIndex}`}
                          data-event-index={originalIndex}
                          onClick={() => onEventClick(event)}
                          className={`w-full text-left p-3 rounded-lg transition-all duration-200 border cursor-pointer ${
                            isCurrentEvent
                              ? 'bg-black text-white border-white/30 ring-0.5 ring-white/30'
                              : isEditMode
                              ? 'bg-black/80 border-white/10 hover:bg-black/90'
                              : 'bg-black/80 text-gray-300 hover:bg-black border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {isEditMode ? (
                                <div className="space-y-2">
                                  {/* Time + Type */}
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={Math.round(displayEvent.time)}
                                      onFocus={(e) => {
                                        e.stopPropagation()
                                        // Set time to current video time when user clicks in
                                        handleUpdateEditModeEvent(originalIndex, {
                                          ...displayEvent,
                                          time: Math.floor(currentTime)
                                        })
                                      }}
                                      onChange={(e) => {
                                        e.stopPropagation()
                                        const newTime = parseFloat(e.target.value)
                                        if (!isNaN(newTime) && newTime >= 0) {
                                          handleUpdateEditModeEvent(originalIndex, {
                                            ...displayEvent,
                                            time: newTime
                                          })
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="Time (s)"
                                      className="w-20 bg-black text-white text-xs px-2 py-1 rounded border border-white/20 focus:border-white/50 focus:outline-none font-mono"
                                    />
                                    <select
                                      value={getEventDisplayType(displayEvent).toLowerCase()}
                                      onChange={(e) => {
                                        e.stopPropagation()
                                        // For shots, update outcome; for others, update action
                                        const newValue = e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1)
                                        if (displayEvent.action === 'Shot') {
                                          handleUpdateEditModeEvent(originalIndex, {
                                            ...displayEvent,
                                            outcome: newValue
                                          })
                                        } else {
                                          handleUpdateEditModeEvent(originalIndex, {
                                            ...displayEvent,
                                            action: newValue
                                          })
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 bg-black text-white text-xs px-2 py-1 rounded border border-white/20 focus:border-white/50 focus:outline-none"
                                    >
                                      {Object.keys(eventTypeFilters).map((type) => (
                                        <option key={type} value={type}>
                                          {getEventEmoji(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  {/* Team */}
                                  <select
                                    value={displayEvent.team}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      handleUpdateEditModeEvent(originalIndex, {
                                        ...displayEvent,
                                        team: e.target.value as 'home' | 'away'
                                      })
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full bg-black text-white text-xs px-2 py-1 rounded border border-white/20 focus:border-white/50 focus:outline-none"
                                  >
                                    <option value="home">Home</option>
                                    <option value="away">Away</option>
                                  </select>
                                  
                                  {/* Description */}
                                  <input
                                    type="text"
                                    value={displayEvent.description || ''}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      handleUpdateEditModeEvent(originalIndex, {
                                        ...displayEvent,
                                        description: e.target.value
                                      })
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Description..."
                                    className="w-full bg-black text-white text-xs px-2 py-1 rounded border border-white/20 focus:border-white/50 focus:outline-none"
                                  />
                                  
                                  {/* Player */}
                                  <input
                                    type="text"
                                    value={displayEvent.player || ''}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      handleUpdateEditModeEvent(originalIndex, {
                                        ...displayEvent,
                                        player: e.target.value
                                      })
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Player (optional)..."
                                    className="w-full bg-black text-white text-xs px-2 py-1 rounded border border-white/20 focus:border-white/50 focus:outline-none"
                                  />
                                </div>
                              ) : (
                                <div className="w-full">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Time Badge */}
                                    <span className="text-xs text-gray-400 font-mono">
                                      {formatTime(event.time)}
                                    </span>
                                    
                                    {/* Event Type Badge */}
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border bg-gray-500/20 text-gray-300 border-gray-500/30">
                                      {getEventDisplayType(event)}
                                    </span>
                                    
                                    {/* Team Badge */}
                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                                      event.team === 'home'
                                        ? 'bg-black/60 text-white border-white/30'
                                        : 'bg-white/90 text-black border-white/50'
                                    }`}>
                                      {event.team === 'home' ? 'Home' : 'Away'}
                                    </span>
                                  </div>
                                  
                                  {/* Description */}
                                  {event.description && (
                                    <p className="text-xs text-gray-400 mt-2">{event.description}</p>
                                  )}
                                  
                                  {/* Player */}
                                  {event.player && (
                                    <p className="text-xs text-gray-500 mt-1 italic">{event.player}</p>
                                  )}
                                  
                                  {/* Apple-Style Trimmer */}
                                  {showTrimmers && (
                                    <div className="mt-3">
                                      <AppleStyleTrimmer
                                        eventTimestamp={event.time}
                                        beforePadding={getEventPadding(originalIndex).beforePadding}
                                        afterPadding={getEventPadding(originalIndex).afterPadding}
                                        maxPadding={15}
                                        currentTime={currentTime}
                                        onPaddingChange={(before, after) => {
                                          updateEventPadding(originalIndex, before, after)
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {isEditMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleBinEvent(originalIndex)
                                }}
                                disabled={isSavingEvents}
                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete event"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Binned Events Section */}
                    {binnedEvents.size > 0 && (
                      <div className="mt-6 pt-4 border-t border-gray-700">
                        <h5 className="text-white font-medium mb-3">🗑️ Deleted Events ({binnedEvents.size}):</h5>
                        <div className="space-y-2">
                          {allEvents.map((event, index) => {
                            if (!binnedEvents.has(index)) return null
                            
                            return (
                              <div
                                key={`binned-${event.id}-${index}`}
                                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-red-900/20 border border-red-500/30 opacity-75"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 font-mono">
                                    {formatTime(event.time)}
                                  </span>
                                  <span className="text-sm font-medium text-gray-400">
                                    {getEventEmoji(getEventDisplayType(event))} {getEventDisplayType(event)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {event.team}
                                  </span>
                                </div>
                                
                                <button
                                  onClick={() => handleUnbinEvent(index)}
                                  disabled={isSavingEvents}
                                  className="p-1 text-white hover:text-white/80 hover:bg-white/10 rounded transition-colors"
                                  title="Restore event"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                  )}
                </div>
              )}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
              {events.length > 0 ? (
                <GameStats
                  game={game}
                  events={events}
                  duration={duration}
                />
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <p className="text-lg mb-2">No events yet</p>
                  <p className="text-sm">Events will appear here after analysis or upload</p>
                </div>
                  )}
                </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-3">AI Coach</h4>
                
                {/* Coach Selection Cards */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {GAA_COACHES.map((coach) => (
                    <button
                      key={coach.id}
                      onClick={() => setSelectedCoach(coach)}
                      className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                        selectedCoach.id === coach.id
                          ? 'border-white/40 bg-black'
                          : 'border-gray-700 bg-black hover:border-gray-600'
                      }`}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-700 mx-auto mb-2 overflow-hidden">
                          <img 
                            src={coach.image} 
                            alt={coach.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="font-medium text-sm text-white">{coach.name.split(' ').pop()}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{coach.title}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Chatting with <span className="text-white font-medium">{selectedCoach.name}</span>
                </p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    {gameId === 'demo' ? (
                      <>
                        <p className="text-sm mb-2">Log in to access AI Coach</p>
                        <p className="text-xs text-gray-500">
                          Sign up to get personalized coaching insights from GAA legends
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm mb-2">Start a conversation</p>
                        <p className="text-xs text-gray-500">
                          Ask {selectedCoach.name} about tactics, training, or match analysis
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-lg p-3 max-w-[80%] ${
                          msg.role === 'user'
                            ? 'bg-white/90 text-black'
                            : 'bg-gray-700 text-gray-100'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}

                {isAIChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-100 rounded-lg p-3 max-w-[80%]">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="text-sm">AI Coach is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="sticky bottom-0 z-20 bg-black/95 border-t border-gray-700 p-4">
                <div className="flex items-end space-x-3">
                  <textarea
                    placeholder={gameId === 'demo' ? 'Log in to chat with coaches...' : `Ask ${selectedCoach.name}...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleChatKeyPress}
                    disabled={isAIChatLoading || gameId === 'demo'}
                    rows={1}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleSendChatMessage}
                    disabled={!chatInput.trim() || isAIChatLoading || gameId === 'demo'}
                    className="px-4 py-3 bg-white hover:bg-white/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-black rounded-xl transition-colors flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

