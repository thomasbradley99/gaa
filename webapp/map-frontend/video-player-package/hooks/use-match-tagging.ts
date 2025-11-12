"use client"

import { useState, useCallback, useRef } from 'react'
import { 
  Event, 
  PartialEvent, 
  MatchState, 
  TeamType, 
  ActionType, 
  OutcomeType,
  ValidationResult, 
  EventCreateOptions,
  TeamInfo,
  MatchTimeMarkersProgress,
  MatchTimeMarkers
} from '@/lib/types/tagging'

import { useUpdateVideoWithMatchTimeMarkers } from './use-videos'

// Generate unique ID for events
const generateEventId = () => `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Get opposite team
const getOppositeTeam = (team: TeamType): TeamType => team === 'red' ? 'blue' : 'red'

export function useMatchTagging(videoId: string, initialTeams?: { red: TeamInfo; blue: TeamInfo }) {
  const [matchState, setMatchState] = useState<MatchState>({
    matchId: `match_${videoId}`,
    teams: initialTeams || {
      red: { id: 'red', name: 'Red Team', color: 'red', score: 0 },
      blue: { id: 'blue', name: 'Blue Team', color: 'blue', score: 0 }
    },
    isSecondHalf: false,
    currentTime: 0,
    currentScore: { red: 0, blue: 0 },
    currentPossession: null,
    playerCounts: { red: 15, blue: 15 },
    activeTag: null,
    tagHistory: [],
    validationErrors: [],
    matchTimeMarkersProgress: {
      firstHalfThrowUp: { completed: false },
      halfTimeWhistle: { completed: false },
      secondHalfThrowUp: { completed: false },
      fullTimeWhistle: { completed: false }
    },
    videoState: {
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      isLoaded: false
    },
    uiMode: 'live'
  })

  // Use the video update hook
  const updateVideoWithMatchTimeMarkers = useUpdateVideoWithMatchTimeMarkers()

  // Update video state
  const updateVideoState = useCallback((updates: Partial<MatchState['videoState']>) => {
    setMatchState(prev => {
      const newState = {
        ...prev,
        videoState: { ...prev.videoState, ...updates }
      }
      
      // Synchronize main currentTime with videoState.currentTime
      if (updates.currentTime !== undefined) {
        newState.currentTime = updates.currentTime
        
        // Auto-update active tag time when video time changes
        if (newState.activeTag) {
          newState.activeTag = {
            ...newState.activeTag,
            time: updates.currentTime
          }
        }
      }
      
      return newState
    })
  }, [])

  // Enhanced validation engine for GAA rules
  const validateEvent = useCallback((
    newEvent: PartialEvent, 
    existingEvents: Event[], 
    currentState: MatchState
  ): ValidationResult => {
    const errors: ValidationResult['errors'] = []

    // Time validation
    if (newEvent.time !== undefined) {
      const lastEvent = existingEvents[existingEvents.length - 1]
      const isFirstEvent = existingEvents.length === 0
      
      // For first event (throw-up), allow time 0.0 or any positive time
      if (isFirstEvent && newEvent.action === 'Throw-up') {
        // First event can be at any time including 0.0
      } else if (lastEvent && newEvent.time < lastEvent.time) {
        errors.push({
          type: 'time',
          message: 'Event time cannot be earlier than previous event',
          suggestions: ['Adjust time to be after last event']
        })
      }
    }

    // Possession validation for actions that require possession
    const possessionRequiredActions: ActionType[] = ['Shot', 'Turnover']
    if (newEvent.action && possessionRequiredActions.includes(newEvent.action)) {
      if (newEvent.team && currentState.currentPossession !== newEvent.team) {
        // Only validate for "Won" turnovers or shots - team must have possession to win these
        if (newEvent.outcome === 'Won' || newEvent.action === 'Shot') {
          errors.push({
            type: 'possession',
            message: `${newEvent.team} team cannot ${newEvent.action.toLowerCase()} without possession`,
            suggestions: ['Auto-create possession change', 'Select correct team']
          })
        }
      }
    }

    // Shot validation - require outcome for shots
    if (newEvent.action === 'Shot' && !newEvent.outcome) {
      errors.push({
        type: 'action',
        message: 'Shot events must specify outcome (1Point, 2Point, Goal, Wide, or Saved)',
        suggestions: ['Select shot outcome']
      })
    }

    // Kickout validation - cannot happen without preceding score or wide
    if (newEvent.action === 'Kickout' && existingEvents.length > 0) {
      const recentEvents = existingEvents.slice(-3) // Check last 3 events
      const hasRecentScore = recentEvents.some(e => 
        e.action === 'Shot' && ['1Point', '2Point', 'Goal', 'Wide'].includes(e.outcome)
      )
      if (!hasRecentScore) {
        // This is a warning, not an error - kickouts can happen in other scenarios
        errors.push({
          type: 'sequence',
          message: 'Kickout without recent score or wide shot - verify this is correct',
          suggestions: ['Check if a score was missed', 'Confirm kickout is valid']
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }, [])

  // Auto-generation engine (enhanced implementation)
  const generateMandatoryEvents = useCallback((
    triggerEvent: Event, 
    currentState: MatchState
  ): Event[] => {
    const generated: Event[] = []

    // Rule: Turnover Lost → Auto-create Turnover Won
    if (triggerEvent.action === 'Turnover' && triggerEvent.outcome === 'Lost') {
      generated.push({
        id: generateEventId(),
        time: triggerEvent.time,
        team: getOppositeTeam(triggerEvent.team),
        action: 'Turnover',
        outcome: 'Won',
        autoGenerated: true,
        validated: true
      })
    }

    // Rule: Score (Goals/Points) → Set up kickout for user to complete
    // Note: Kickout creation is now handled in saveTag function, not auto-generated
    
    // Rule: Wide Shot → Set up kickout for user to complete  
    // Note: Kickout creation is now handled in saveTag function, not auto-generated

    // Rule: Shot that results in Turnover → No kickout needed (possession already changed)
    // This is handled by the Shot → Turnover sequence

    // Rule: Foul Awarded To → Auto-create Free Won for fouled team
    if (triggerEvent.action === 'Foul' && triggerEvent.outcome === 'Awarded To') {
      generated.push({
        id: generateEventId(),
        time: triggerEvent.time + 0.1,
        team: triggerEvent.team, // Team that was fouled gets the free
        action: 'Kickout', // Use Kickout instead of Free since Free was removed
        outcome: 'Won',
        autoGenerated: true,
        validated: true
      })
    }

    // Rule: Cards → Auto-create Kickout for opposing team
    if (['Yellow Card', 'Black Card', 'Red Card'].includes(triggerEvent.action)) {
      generated.push({
        id: generateEventId(),
        time: triggerEvent.time,
        team: getOppositeTeam(triggerEvent.team),
        action: 'Kickout',
        outcome: 'Won', // Fouled team always gets the free kick
        autoGenerated: true,
        validated: true
      })
    }

    // Rule: Kick-in Lost → Auto-create Kick-in Won
    if (triggerEvent.action === 'Kick-in' && triggerEvent.outcome === 'Lost') {
      generated.push({
        id: generateEventId(),
        time: triggerEvent.time,
        team: getOppositeTeam(triggerEvent.team),
        action: 'Kick-in',
        outcome: 'Won',
        autoGenerated: true,
        validated: true
      })
    }

    // Rule: Kickout Lost → Auto-create Turnover Won
    if (triggerEvent.action === 'Kickout' && triggerEvent.outcome === 'Lost') {
      generated.push({
        id: generateEventId(),
        time: triggerEvent.time,
        team: getOppositeTeam(triggerEvent.team),
        action: 'Turnover',
        outcome: 'Won',
        autoGenerated: true,
        validated: true
      })
    }

    return generated
  }, [])

  // Start creating a new tag
  const startTag = useCallback((time: number, suggestedTeam?: TeamType) => {
    setMatchState(prev => {
      const isFirstEvent = prev.tagHistory.length === 0
      
      return {
        ...prev,
        activeTag: {
          time,
          team: suggestedTeam || prev.currentPossession || undefined,
          // Automatically set first event to Throw-up
          ...(isFirstEvent ? { action: 'Throw-up' as ActionType } : {})
        }
      }
    })
  }, [])

  // Update active tag
  const updateActiveTag = useCallback((updates: Partial<PartialEvent>) => {
    setMatchState(prev => ({
      ...prev,
      activeTag: prev.activeTag ? { ...prev.activeTag, ...updates } : null
    }))
  }, [])

  // Cancel active tag
  const cancelTag = useCallback(() => {
    setMatchState(prev => ({
      ...prev,
      activeTag: null,
      validationErrors: []
    }))
  }, [])

  // Track match time marker events
  const updateMatchTimeMarkersProgress = useCallback((event: Event, progress: MatchTimeMarkersProgress): MatchTimeMarkersProgress => {
    const newProgress = { ...progress }
    
    // Check for first half throw-up (must be first)
    if (!newProgress.firstHalfThrowUp.completed && 
        event.action === 'Throw-up' && 
        event.outcome === 'Won') {
      newProgress.firstHalfThrowUp = {
        completed: true,
        time: event.time,
        eventId: event.id
      }
    }
    // Check for half time whistle (must come after first half throw-up)
    else if (newProgress.firstHalfThrowUp.completed && 
             !newProgress.halfTimeWhistle.completed && 
             event.action === 'Half Time Whistle') {
      newProgress.halfTimeWhistle = {
        completed: true,
        time: event.time,
        eventId: event.id
      }
    }
    // Check for second half throw-up (must come after half time whistle)
    else if (newProgress.halfTimeWhistle.completed && 
             !newProgress.secondHalfThrowUp.completed && 
             event.action === 'Throw-up' && 
             event.outcome === 'Won') {
      newProgress.secondHalfThrowUp = {
        completed: true,
        time: event.time,
        eventId: event.id
      }
    }
    // Check for full time whistle (must come after second half throw-up)
    else if (newProgress.secondHalfThrowUp.completed && 
             !newProgress.fullTimeWhistle.completed && 
             event.action === 'Full Time Whistle') {
      newProgress.fullTimeWhistle = {
        completed: true,
        time: event.time,
        eventId: event.id
      }
    }
    
    return newProgress
  }, [])

  // Get current match time markers if all required events are tagged
  const getMatchTimeMarkers = useCallback((): MatchTimeMarkers | null => {
    const progress = matchState.matchTimeMarkersProgress
    
    if (progress.firstHalfThrowUp.completed && 
        progress.halfTimeWhistle.completed && 
        progress.secondHalfThrowUp.completed && 
        progress.fullTimeWhistle.completed) {
      return {
        firstHalfStart: progress.firstHalfThrowUp.time!,
        halfTime: progress.halfTimeWhistle.time!,
        secondHalfStart: progress.secondHalfThrowUp.time!,
        fullTime: progress.fullTimeWhistle.time!
      }
    }
    
    return null
  }, [matchState.matchTimeMarkersProgress])

  // Generate match time marker events for the timeline
  const getMatchTimeMarkerEvents = useCallback((): Event[] => {
    const progress = matchState.matchTimeMarkersProgress
    const markerEvents: Event[] = []

    if (progress.halfTimeWhistle.completed && progress.halfTimeWhistle.time !== undefined) {
      markerEvents.push({
        id: `marker_half_time`,
        time: progress.halfTimeWhistle.time,
        team: 'red', // Neutral event, we just need a team for the interface
        action: 'Half Time Whistle' as ActionType,
        outcome: 'N/A',
        autoGenerated: true,
        validated: true
      })
    }

    if (progress.fullTimeWhistle.completed && progress.fullTimeWhistle.time !== undefined) {
      markerEvents.push({
        id: `marker_full_time`,
        time: progress.fullTimeWhistle.time,
        team: 'red', // Neutral event, we just need a team for the interface
        action: 'Full Time Whistle' as ActionType,
        outcome: 'N/A',
        autoGenerated: true,
        validated: true
      })
    }

    return markerEvents
  }, [matchState.matchTimeMarkersProgress])

  // Get combined events including match time markers
  const getCombinedEvents = useCallback((): Event[] => {
    const regularEvents = matchState.tagHistory
    const markerEvents = getMatchTimeMarkerEvents()
    
    // Combine and sort by time
    return [...regularEvents, ...markerEvents].sort((a, b) => a.time - b.time)
  }, [matchState.tagHistory, getMatchTimeMarkerEvents])

  // Get next required match event
  const getNextRequiredMatchEvent = useCallback((): string | null => {
    const progress = matchState.matchTimeMarkersProgress
    
    if (!progress.firstHalfThrowUp.completed) {
      return 'First Half Throw-up'
    }
    if (!progress.halfTimeWhistle.completed) {
      return 'Half Time Whistle'
    }
    if (!progress.secondHalfThrowUp.completed) {
      return 'Second Half Throw-up'
    }
    if (!progress.fullTimeWhistle.completed) {
      return 'Full Time Whistle'
    }
    
    return null // All completed
  }, [matchState.matchTimeMarkersProgress])

  // Complete and save the current tag
  const saveTag = useCallback(() => {
    setMatchState(prev => {
      if (!prev.activeTag || prev.activeTag.time === undefined || !prev.activeTag.team || !prev.activeTag.action) {
        return prev // Not enough info to save
      }

      const newEvent: Event = {
        id: generateEventId(),
        time: prev.activeTag.time,
        team: prev.activeTag.team,
        action: prev.activeTag.action,
        outcome: prev.activeTag.outcome || 'N/A',
        autoGenerated: false,
        validated: true
      }

      // Validate the event
      const validation = validateEvent(prev.activeTag, prev.tagHistory, prev)
      if (!validation.valid) {
        return {
          ...prev,
          validationErrors: validation.errors
        }
      }

      // Update match time markers progress
      const updatedProgress = updateMatchTimeMarkersProgress(newEvent, prev.matchTimeMarkersProgress)

      // Check if this was the final whistle and all markers are now complete
      const wasFullTimeWhistleCompleted = !prev.matchTimeMarkersProgress.fullTimeWhistle.completed && 
                                         updatedProgress.fullTimeWhistle.completed
      
      // Check if all match time markers are now complete
      const allMarkersComplete = updatedProgress.firstHalfThrowUp.completed && 
                               updatedProgress.halfTimeWhistle.completed && 
                               updatedProgress.secondHalfThrowUp.completed && 
                               updatedProgress.fullTimeWhistle.completed

      // Send updateVideo request if final whistle was just completed and all markers are complete
      // Only send if this is the actual final whistle event being saved (not an auto-event)
      if (wasFullTimeWhistleCompleted && allMarkersComplete && !newEvent.autoGenerated) {
        const matchTimeMarkers: MatchTimeMarkers = {
          firstHalfStart: updatedProgress.firstHalfThrowUp.time!,
          halfTime: updatedProgress.halfTimeWhistle.time!,
          secondHalfStart: updatedProgress.secondHalfThrowUp.time!,
          fullTime: updatedProgress.fullTimeWhistle.time!
        }

        // Send updateVideo request with match time markers using the video hook
        updateVideoWithMatchTimeMarkers.mutate({
          videoId,
          matchTimeMarkers
        })
      }

      // Generate auto-events
      const autoEvents = generateMandatoryEvents(newEvent, prev)

      // Update possession based on event
      let newPossession = prev.currentPossession
      
      // Possession change rules
      if (newEvent.action === 'Throw-up' && newEvent.outcome === 'Won') {
        newPossession = newEvent.team
      } else if (newEvent.action === 'Turnover') {
        newPossession = newEvent.outcome === 'Won' ? newEvent.team : getOppositeTeam(newEvent.team)
      } else if (newEvent.action === 'Kickout' && newEvent.outcome === 'Won') {
        newPossession = newEvent.team
      } else if (newEvent.action === 'Kickout' && newEvent.outcome === 'Lost') {
        newPossession = getOppositeTeam(newEvent.team)
      } else if (newEvent.action === 'Kick-in' && newEvent.outcome === 'Won') {
        newPossession = newEvent.team
      } else if (newEvent.action === 'Kick-in' && newEvent.outcome === 'Lost') {
        newPossession = getOppositeTeam(newEvent.team)
      } else if (newEvent.action === 'Foul' && newEvent.outcome === 'Awarded To') {
        // Fouled team gets possession via the auto-generated kickout
        newPossession = newEvent.team
      } else if (['Yellow Card', 'Black Card', 'Red Card'].includes(newEvent.action)) {
        // Fouled team gets possession via the auto-generated free
        newPossession = getOppositeTeam(newEvent.team)
      }

      // Update score for shots
      let newScore = { ...prev.currentScore }
      if (newEvent.action === 'Shot') {
        if (newEvent.outcome === '1Point') {
          newScore[newEvent.team] += 1
        } else if (newEvent.outcome === '2Point') {
          newScore[newEvent.team] += 2
        } else if (newEvent.outcome === 'Goal') {
          newScore[newEvent.team] += 3
        }
      }

      // Check if shot requires kickout and set up next event
      let nextActiveTag = null
      if (newEvent.action === 'Shot' && ['1Point', '2Point', 'Goal', 'Wide', 'Saved'].includes(newEvent.outcome)) {
        // Set up kickout event for user to complete
        nextActiveTag = {
          time: newEvent.time + 1, // Kickout happens 1 second after shot
          team: getOppositeTeam(newEvent.team), // Team that gets the kickout
          action: 'Kickout' as ActionType,
          outcome: undefined // User must select Won/Lost
        }
        // For shots that result in kickouts, possession goes to the defending team immediately
        newPossession = getOppositeTeam(newEvent.team)
      }

      return {
        ...prev,
        tagHistory: [...prev.tagHistory, newEvent, ...autoEvents],
        activeTag: nextActiveTag, // Either null (normal) or kickout setup
        validationErrors: [],
        currentPossession: newPossession,
        currentScore: newScore,
        matchTimeMarkersProgress: updatedProgress
      }
    })
  }, [validateEvent, generateMandatoryEvents, updateMatchTimeMarkersProgress, videoId, updateVideoWithMatchTimeMarkers])

  // Delete an event
  const deleteEvent = useCallback((eventId: string) => {
    setMatchState(prev => ({
      ...prev,
      tagHistory: prev.tagHistory.filter(event => event.id !== eventId)
    }))
  }, [])

  // Delete all events
  const deleteAllEvents = useCallback(() => {
    setMatchState(prev => ({
      ...prev,
      tagHistory: [],
      currentScore: { red: 0, blue: 0 },
      currentPossession: null
    }))
  }, [])

  // Toggle second half
  const toggleSecondHalf = useCallback(() => {
    setMatchState(prev => {
      const willBeSecondHalf = !prev.isSecondHalf
      
      // If switching to second half, automatically create a throw-up event
      if (willBeSecondHalf && !prev.activeTag) {
        return {
          ...prev,
          isSecondHalf: willBeSecondHalf,
          activeTag: {
            time: prev.currentTime,
            action: 'Throw-up' as ActionType,
            team: undefined // Will be set by user in interface
          },
          currentPossession: null // Reset possession for new half - will be set when throw-up is won
        }
      }
      
      return {
        ...prev,
        isSecondHalf: willBeSecondHalf
      }
    })
  }, [])

  // Update teams
  const updateTeams = useCallback((teams: { red: TeamInfo; blue: TeamInfo }) => {
    setMatchState(prev => ({
      ...prev,
      teams
    }))
  }, [])

  // Update possession directly
  const updatePossession = useCallback((possession: TeamType | null) => {
    setMatchState(prev => ({
      ...prev,
      currentPossession: possession
    }))
  }, [])

  // Get enabled actions based on current state
  const getEnabledActions = useCallback((currentState: MatchState): ActionType[] => {
    const allActions: ActionType[] = [
      'Throw-up', 'Turnover', 'Kickout', 'Kick-in', 'Shot', 'Foul',
      'Yellow Card', 'Black Card', 'Red Card'
    ]

    // In a real implementation, this would filter based on possession and context
    return allActions
  }, [])



  // Generate realistic sample events for testing
  const generateSampleEvents = useCallback(() => {
    const sampleEvents: Event[] = []
    // Use actual video duration or a reasonable default
    const actualDuration = matchState.videoState.duration > 0 ? matchState.videoState.duration : 2700
    
    // For short videos (under 5 minutes), generate proportionally fewer events
    const isShortVideo = actualDuration < 300 // Less than 5 minutes
    const duration = isShortVideo ? actualDuration : actualDuration
    
    console.log('🎯 Generating sample events with duration:', duration, 'Short video:', isShortVideo)
    
    // Helper functions
    const randomTeam = (): TeamType => Math.random() > 0.5 ? 'red' : 'blue'
    const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min
    const shuffleArray = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5)
    
    // Event templates with realistic progressions
    const actionTemplates: Array<{
      action: ActionType
      outcomes: OutcomeType[]
      weight: number
      minTime?: number
      maxTime?: number
      followUp?: ActionType[]
    }> = [
      { action: 'Shot', outcomes: ['1Point', '2Point', 'Goal', 'Wide', 'Saved'], weight: 30, followUp: ['Kickout'] },
      { action: 'Turnover', outcomes: ['Won', 'Lost'], weight: 20, followUp: ['Shot', 'Kickout'] },
      { action: 'Kickout', outcomes: ['Won', 'Lost'], weight: 15, followUp: ['Shot', 'Turnover'] },
      { action: 'Kick-in', outcomes: ['Won', 'Lost'], weight: 10, followUp: ['Shot', 'Turnover'] },
      { action: 'Foul', outcomes: ['Awarded To'], weight: 15, followUp: ['Kickout'] },
      { action: 'Yellow Card', outcomes: ['N/A'], weight: 5, minTime: 300 },
      { action: 'Black Card', outcomes: ['N/A'], weight: 3, minTime: 600 },
      { action: 'Red Card', outcomes: ['N/A'], weight: 1, minTime: 1200 },
    ]
    
    // Start with throw-up at the beginning
    let currentTime = 0
    sampleEvents.push({
      id: generateEventId(),
      time: currentTime,
      team: randomTeam(),
      action: 'Throw-up',
      outcome: 'Won',
      autoGenerated: false,
      validated: true
    })
    
    let currentPossession = sampleEvents[0].team
    let teamScores = { red: 0, blue: 0 }
    
    // Generate events throughout the video
    let targetEventCount
    let timeJumpRange
    let eventEndTime
    
    if (isShortVideo) {
      // For short videos, generate fewer events with shorter intervals
      targetEventCount = Math.max(3, Math.floor(duration / 10)) // Roughly 1 event per 10 seconds
      timeJumpRange = [2, 8] // 2-8 seconds between events
      eventEndTime = duration - 2 // Leave 2 seconds at end
    } else {
      // For longer videos, use original logic
      targetEventCount = 20
      timeJumpRange = [15, 120] // 15 seconds to 2 minutes
      eventEndTime = Math.min(duration * 0.5, 1800) // First half only for now
    }
    
    console.log('📊 Target events:', targetEventCount, 'Time jump range:', timeJumpRange, 'End time:', eventEndTime)
    
    let eventCount = 0
    
    while (currentTime < eventEndTime && eventCount < targetEventCount) {
      const timeJump = randomBetween(timeJumpRange[0], timeJumpRange[1])
      currentTime += timeJump
      
      console.log('⚽ Generating event', eventCount + 1, 'at time:', currentTime)
      
      if (currentTime >= eventEndTime) break
      eventCount++
      
      // Select action based on weights and context
      const availableActions = actionTemplates.filter(template => 
        !template.minTime || currentTime >= template.minTime
      )
      
      const totalWeight = availableActions.reduce((sum, template) => sum + template.weight, 0)
      let randomWeight = Math.random() * totalWeight
      
      let selectedTemplate = availableActions[0]
      for (const template of availableActions) {
        randomWeight -= template.weight
        if (randomWeight <= 0) {
          selectedTemplate = template
          break
        }
      }
      
      // Determine team - 70% chance for team with possession, 30% for opponent
      let eventTeam: TeamType
      if (selectedTemplate.action === 'Foul' || selectedTemplate.action === 'Turnover') {
        // These can happen to either team
        eventTeam = randomTeam()
      } else if (currentPossession && Math.random() > 0.3) {
        eventTeam = currentPossession
      } else {
        eventTeam = randomTeam()
      }
      
      const outcome = shuffleArray(selectedTemplate.outcomes)[0]
      
      const newEvent: Event = {
        id: generateEventId(),
        time: currentTime,
        team: eventTeam,
        action: selectedTemplate.action,
        outcome,
        autoGenerated: false,
        validated: true
      }
      
      sampleEvents.push(newEvent)
      
      // Update possession and scores based on event
      if (newEvent.action === 'Turnover') {
        currentPossession = newEvent.outcome === 'Won' ? newEvent.team : getOppositeTeam(newEvent.team)
      } else if (newEvent.action === 'Kickout' || newEvent.action === 'Kick-in') {
        currentPossession = newEvent.outcome === 'Won' ? newEvent.team : getOppositeTeam(newEvent.team)
      } else if (newEvent.action === 'Shot') {
        if (newEvent.outcome === '1Point') {
          teamScores[newEvent.team] += 1
          currentPossession = getOppositeTeam(newEvent.team) // Kickout to opposing team
        } else if (newEvent.outcome === '2Point') {
          teamScores[newEvent.team] += 2
          currentPossession = getOppositeTeam(newEvent.team)
        } else if (newEvent.outcome === 'Goal') {
          teamScores[newEvent.team] += 3
          currentPossession = getOppositeTeam(newEvent.team)
        } else if (newEvent.outcome === 'Wide') {
          currentPossession = getOppositeTeam(newEvent.team) // Kickout to defending team
        }
      } else if (newEvent.action === 'Foul') {
        currentPossession = newEvent.team // Fouled team gets possession
      }
    }
    
    // For longer videos, add second half events
    if (!isShortVideo && duration > 1800) { // Only for videos longer than 30 minutes
      const secondHalfStart = eventEndTime + randomBetween(600, 900) // 10-15 minute break
      console.log('Second half start time:', secondHalfStart, 'Duration:', duration)
      
      if (secondHalfStart < duration) {
        sampleEvents.push({
          id: generateEventId(),
          time: secondHalfStart,
          team: randomTeam(),
          action: 'Throw-up',
          outcome: 'Won',
          autoGenerated: false,
          validated: true
        })
        
        currentPossession = sampleEvents[sampleEvents.length - 1].team
        currentTime = secondHalfStart
        
        // Generate second half events
        let secondHalfEventCount = 0
        while (currentTime < duration - 60 && secondHalfEventCount < targetEventCount) { // Leave last minute
          const timeJump = randomBetween(timeJumpRange[0], timeJumpRange[1])
          currentTime += timeJump
          
          console.log('Generating second half event', secondHalfEventCount + 1, 'at time:', currentTime)
          
          if (currentTime >= duration - 60) break
          secondHalfEventCount++
          
          // Similar event generation for second half
          const availableActions = actionTemplates.filter(template => 
            !template.minTime || currentTime >= template.minTime
          )
          
          const totalWeight = availableActions.reduce((sum, template) => sum + template.weight, 0)
          let randomWeight = Math.random() * totalWeight
          
          let selectedTemplate = availableActions[0]
          for (const template of availableActions) {
            randomWeight -= template.weight
            if (randomWeight <= 0) {
              selectedTemplate = template
              break
            }
          }
          
          let eventTeam: TeamType
          if (selectedTemplate.action === 'Foul' || selectedTemplate.action === 'Turnover') {
            eventTeam = randomTeam()
          } else if (currentPossession && Math.random() > 0.3) {
            eventTeam = currentPossession
          } else {
            eventTeam = randomTeam()
          }
          
          const outcome = shuffleArray(selectedTemplate.outcomes)[0]
          
          const newEvent: Event = {
            id: generateEventId(),
            time: currentTime,
            team: eventTeam,
            action: selectedTemplate.action,
            outcome,
            autoGenerated: false,
            validated: true
          }
          
          sampleEvents.push(newEvent)
          
          // Update possession based on event (same logic as first half)
          if (newEvent.action === 'Turnover') {
            currentPossession = newEvent.outcome === 'Won' ? newEvent.team : getOppositeTeam(newEvent.team)
          } else if (newEvent.action === 'Kickout' || newEvent.action === 'Kick-in') {
            currentPossession = newEvent.outcome === 'Won' ? newEvent.team : getOppositeTeam(newEvent.team)
          } else if (newEvent.action === 'Shot') {
            if (['1Point', '2Point', 'Goal'].includes(newEvent.outcome)) {
              if (newEvent.outcome === '1Point') teamScores[newEvent.team] += 1
              else if (newEvent.outcome === '2Point') teamScores[newEvent.team] += 2
              else if (newEvent.outcome === 'Goal') teamScores[newEvent.team] += 3
              currentPossession = getOppositeTeam(newEvent.team)
            } else if (newEvent.outcome === 'Wide') {
              currentPossession = getOppositeTeam(newEvent.team)
            }
          } else if (newEvent.action === 'Foul') {
            currentPossession = newEvent.team
          }
        }
      }
    }
    
    // Sort events by time
    sampleEvents.sort((a, b) => a.time - b.time)
    
    console.log('✅ Generated', sampleEvents.length, 'total events')
    console.log('🏆 Final scores:', teamScores)
    
    // Update match state with generated events
    setMatchState(prev => ({
      ...prev,
      tagHistory: sampleEvents,
      currentScore: teamScores,
      currentPossession,
      isSecondHalf: !isShortVideo && duration > 1800 // Only set to second half for longer videos
    }))
  }, [matchState.videoState.duration])

  // Generate events from GAA JSON schema
  const generateGaaJsonEvents = useCallback(() => {
    try {
      console.log('🎯 Generating events from GAA JSON schema')
      
      // Import the GAA events schema
      const gaaEventsSchema = require('../../events/gaa_events_web_schema.json')
      //const gaaEventsSchema = undefined;
    
      if (!gaaEventsSchema || !gaaEventsSchema.events || !Array.isArray(gaaEventsSchema.events)) {
        console.error('❌ Invalid GAA events schema structure')
        return
      }
      
      const gaaEvents = gaaEventsSchema.events
      console.log('📊 Found', gaaEvents.length, 'events in GAA schema')
      
      // Convert GAA events to our Event format
      const convertedEvents: Event[] = gaaEvents.map((gaaEvent: any, index: number) => {
        // Map team names from GAA schema to our format
        const teamMapping: { [key: string]: TeamType } = {
          'Team A': 'red',
          'Team B': 'blue',
          'red': 'red',
          'blue': 'blue'
        }
        
        // Map actions from GAA schema to our ActionType
        const actionMapping: { [key: string]: ActionType } = {
          'Turnover': 'Turnover',
          'Shot': 'Shot',
          'Kickout': 'Kickout',
          'Kick-in': 'Kick-in',
          'Foul': 'Foul',
          'Yellow Card': 'Yellow Card',
          'Black Card': 'Black Card',
          'Red Card': 'Red Card'
        }
        
        // Map outcomes from GAA schema to our OutcomeType
        const outcomeMapping: { [key: string]: OutcomeType } = {
          'Won': 'Won',
          'Lost': 'Lost',
          'Wide': 'Wide',
          'Saved': 'Saved',
          'Goal': 'Goal',
          '1Point': '1Point',
          '2Point': '2Point',
          'N/A': 'N/A'
        }
        
        const team = teamMapping[gaaEvent.team] || 'red'
        const action = actionMapping[gaaEvent.action] || 'Turnover'
        const outcome = outcomeMapping[gaaEvent.outcome] || 'N/A'
        
        return {
          id: generateEventId(),
          time: gaaEvent.time || 0,
          team,
          action,
          outcome,
          autoGenerated: true,
          validated: gaaEvent.validated || false
        }
      })
      
      // Calculate team scores based on events
      const teamScores = { red: 0, blue: 0 }
      let currentPossession: TeamType | null = null
      
      convertedEvents.forEach(event => {
        if (event.action === 'Shot') {
          if (event.outcome === '1Point') {
            teamScores[event.team] += 1
          } else if (event.outcome === '2Point') {
            teamScores[event.team] += 2
          } else if (event.outcome === 'Goal') {
            teamScores[event.team] += 3
          }
        }
        
        // Update possession based on event
        if (event.action === 'Turnover') {
          currentPossession = event.outcome === 'Won' ? event.team : getOppositeTeam(event.team)
        } else if (event.action === 'Kickout' || event.action === 'Kick-in') {
          currentPossession = event.outcome === 'Won' ? event.team : getOppositeTeam(event.team)
        } else if (event.action === 'Shot') {
          if (['1Point', '2Point', 'Goal'].includes(event.outcome)) {
            currentPossession = getOppositeTeam(event.team)
          } else if (event.outcome === 'Wide') {
            currentPossession = getOppositeTeam(event.team)
          }
        } else if (event.action === 'Foul') {
          currentPossession = event.team
        }
      })
      
      // Sort events by time
      convertedEvents.sort((a, b) => a.time - b.time)
      
      console.log('✅ Converted', convertedEvents.length, 'events from GAA JSON schema')
      console.log('🏆 Calculated scores:', teamScores)
      
      // Update match state with converted events
      setMatchState(prev => ({
        ...prev,
        tagHistory: convertedEvents,
        currentScore: teamScores,
        currentPossession,
        isSecondHalf: false // Reset to first half for imported data
      }))
      
    } catch (error) {
      console.error('❌ Error generating events from GAA JSON schema:', error)
    }
  }, [])

  return {
    matchState,
    
    // Video controls
    updateVideoState,
    
    // Tag management
    startTag,
    updateActiveTag,
    cancelTag,
    saveTag,
    deleteEvent,
    deleteAllEvents,
    generateSampleEvents,
    
    // Match management
    toggleSecondHalf,
    
    // Team management
    updateTeams,
    updatePossession,
    
    // Match time markers
    getMatchTimeMarkers,
    getNextRequiredMatchEvent,
    
    // Helpers
    getEnabledActions,
    validateEvent,
    generateMandatoryEvents,
    generateGaaJsonEvents,
    getMatchTimeMarkerEvents,
    getCombinedEvents
  }
} 