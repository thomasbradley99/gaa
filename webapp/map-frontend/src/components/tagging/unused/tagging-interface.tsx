"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  PartialEvent, 
  ActionType, 
  OutcomeType, 
  PlayType, 
  TeamType, 
  MatchState,
  ValidationError
} from '@/lib/types/tagging'
import { 
  Tag, 
  Save, 
  X, 
  AlertTriangle, 
  Clock,
  Users,
  Trophy,
  Flag,
  ArrowLeftRight,
  Plus,
  RotateCcw
} from 'lucide-react'
import { MatchTimeMarkersTracker } from './match-time-markers-tracker'
import { TaggingModeSelector } from './tagging-mode-selector'
import { TaggingAIAnalysisForm } from './tagging-ai-analysis-form'

interface TaggingInterfaceProps {
  matchState: MatchState
  onEventCreate: (event: PartialEvent) => void
  onEventUpdate: (updates: Partial<PartialEvent>) => void
  onEventSave: (cardInfo?: { cardType?: ActionType; targetTeam?: TeamType; foulAwardedTo?: TeamType }) => void
  onEventCancel: () => void
  onToggleSecondHalf?: () => void
  onUpdatePossession?: (possession: TeamType | null) => void
  className?: string
  // Match time markers props
  getMatchTimeMarkers?: () => any
  getNextRequiredMatchEvent?: () => string | null
  onAutoFillVideoAnalysis?: (markers: any) => void
  // AI Analysis props
  onStartAnalysis?: (params: any) => void
  isAnalyzing?: boolean
  analysisProgress?: number
  analysisAttempt?: number
  analysisError?: string | null
  onStopAnalysis?: () => void
  currentTaskId?: string | null
  // Video control props
  onSeekToTime?: (time: number) => void
  // Team context
  teamId?: string
}

export function TaggingInterface({
  matchState,
  onEventCreate,
  onEventUpdate,
  onEventSave,
  onEventCancel,
  onToggleSecondHalf,
  onUpdatePossession,
  className = "",
  getMatchTimeMarkers,
  getNextRequiredMatchEvent,
  onAutoFillVideoAnalysis,
  onStartAnalysis,
  isAnalyzing = false,
  analysisProgress,
  analysisAttempt,
  analysisError,
  onStopAnalysis,
  currentTaskId,
  onSeekToTime,
  teamId
}: TaggingInterfaceProps) {
  

  const { activeTag, currentPossession, teams, validationErrors, currentTime } = matchState
  const [selectedCard, setSelectedCard] = useState<ActionType | null>(null)
  const [foulAwardedTo, setFoulAwardedTo] = useState<TeamType | null>(null)
  const [showValidationDialog, setShowValidationDialog] = useState(false)

  // Get current match time markers from tagging
  const matchTimeMarkers = getMatchTimeMarkers ? getMatchTimeMarkers() : null
  const nextRequiredEvent = getNextRequiredMatchEvent ? getNextRequiredMatchEvent() : null
  const hasAnyEvents = matchState.tagHistory.length > 0
  const isMatchMarkersComplete = matchTimeMarkers !== null
  


  // State for mode selection
  const [taggingMode, setTaggingMode] = useState<'manual' | 'ai' | null>(null)

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get team color class
  const getTeamColor = (team: TeamType) => {
    return team === 'red' 
      ? 'bg-red-500 hover:bg-red-600 text-white' 
      : 'bg-blue-500 hover:bg-blue-600 text-white'
  }

  // Get enabled actions based on possession and context
  const getEnabledActions = (): ActionType[] => {
    const isFirstEvent = matchState.tagHistory.length === 0
    
    // For the very first event, no actions should be selectable (throw-up is auto-set)
    if (isFirstEvent) {
      return [] as ActionType[]
    }
    
    if (!currentPossession) {
      // When no possession, certain actions are available (excluding throw-up)
      return ['Kick-in', 'Foul'] as ActionType[]
    }
    
    // When team has possession, they can do most actions (excluding throw-up)
    return [
      'Turnover', 'Kick-in', 'Shot', 'Foul'
    ] as ActionType[]
  }

  // Get enabled outcomes based on action
  const getEnabledOutcomes = (action?: ActionType): OutcomeType[] => {
    if (!action) return []
    
    switch (action) {
      case 'Shot':
        return ['1Point', '2Point', 'Goal', 'Wide', 'Saved']
      case 'Kickout':
        return ['Won', 'Lost']
      case 'Throw-up':
      case 'Turnover':
      case 'Kick-in':
      case 'Foul':
        return [] // No outcome buttons - automatic or team selection
      case 'Yellow Card':
      case 'Black Card':
      case 'Red Card':
        return ['N/A']
      default:
        return ['Won', 'Lost', 'N/A']
    }
  }

  // Handle action selection
  const handleActionSelect = (action: ActionType | undefined) => {
    onEventUpdate({ action, outcome: undefined })
    
    // Auto-handle turnover - set outcome to 'Lost' and team to opposite team
    if (action === 'Turnover' && currentPossession) {
      const oppositeTeam = currentPossession === 'red' ? 'blue' : 'red'
      onEventUpdate({ 
        action, 
        outcome: 'Lost',
        team: oppositeTeam // The team that gains possession
      })
    }
    // Auto-select team in possession for fouls
    else if (action === 'Foul' && currentPossession) {
      setFoulAwardedTo(currentPossession)
      // Update the event team to be the team receiving the foul (who gets possession)
      onEventUpdate({ team: currentPossession })
    } else if (action === 'Kick-in') {
      // For kick-in, default to current possession team, but allow switching
      setFoulAwardedTo(currentPossession || 'red')
      // Update the event team to be the team receiving the kick-in (who gets possession)
      onEventUpdate({ team: currentPossession || 'red' })
    } else if (action === 'Throw-up') {
      // For throw-up, default to red team (first team)
      setFoulAwardedTo('red')
    }
    
    // Reset foul selection when changing action
    if (action !== 'Foul' && action !== 'Kick-in' && action !== 'Throw-up') {
      setFoulAwardedTo(null)
    }
  }

  // Handle outcome selection
  const handleOutcomeSelect = (outcome: OutcomeType) => {
    onEventUpdate({ outcome })
  }

  // Quick tag at current time
  const handleQuickTag = () => {
    if (!activeTag) {
      handleEventCreateWithAutoSet({})
    }
  }

  // Handle start match button
  const handleStartMatch = () => {
    handleEventCreateWithAutoSet({ 
      team: 'red', // Default to red team for throw-up
      action: 'Throw-up'
    })
  }

  // Handle mode selection
  const handleModeSelect = (mode: 'manual' | 'ai') => {
    setTaggingMode(mode)
    
    // When switching to manual mode, seek to the first half throw-up time
    if (mode === 'manual' && isMatchMarkersComplete && onSeekToTime) {
      const firstHalfThrowUp = matchState.tagHistory.find(event => 
        event.action === 'Throw-up' && event.time <= (matchTimeMarkers?.halfTime || Infinity)
      )
      if (firstHalfThrowUp) {
        onSeekToTime(firstHalfThrowUp.time)
      }
    }
  }

  // Handle AI analysis start
  const handleAnalysisStart = (params: any) => {
    if (onStartAnalysis) {
      onStartAnalysis(params)
    }
  }

  // Handle event creation with auto-setting of time and team
  const handleEventCreateWithAutoSet = useCallback((event: PartialEvent) => {
    const isFirstEvent = matchState.tagHistory.length === 0
    const eventWithDefaults = {
      time: currentTime,
      team: currentPossession || 'red',
      ...event, // Override with any provided values
    }
    
    // Automatically set first event to Throw-up
    if (isFirstEvent && !eventWithDefaults.action) {
      eventWithDefaults.action = 'Throw-up'
    }
    
    console.log('🎯 handleEventCreateWithAutoSet - Final event with defaults:', eventWithDefaults)
    onEventCreate(eventWithDefaults)
  }, [onEventCreate, currentTime, currentPossession, matchState.tagHistory.length])

  // Set default foul awarded to current possession when foul action is selected
  useEffect(() => {
    if (activeTag?.action === 'Foul' && activeTag.outcome === 'Awarded To' && !foulAwardedTo) {
      setFoulAwardedTo(currentPossession || 'red')
    }
    // For throw-up, default to red team (first team) if not already set
    if (activeTag?.action === 'Throw-up' && !foulAwardedTo) {
      setFoulAwardedTo('red')
    }
    // For kick-in, default to current possession if not already set
    if (activeTag?.action === 'Kick-in' && !foulAwardedTo) {
      setFoulAwardedTo(currentPossession || 'red')
    }
    // Reset foul selection when action changes
    if (activeTag?.action !== 'Foul' && activeTag?.action !== 'Kick-in' && activeTag?.action !== 'Throw-up') {
      setFoulAwardedTo(null)
      setSelectedCard(null)
    }
  }, [activeTag?.action, activeTag?.outcome, currentPossession, foulAwardedTo])

  // Show validation dialog when validation errors occur
  useEffect(() => {
    if (validationErrors.length > 0) {
      setShowValidationDialog(true)
    }
  }, [validationErrors])

  // Check if save is enabled
  const canSave = activeTag && activeTag.time !== undefined && activeTag.action && 
    (
      // Whistle events don't need team or outcome - just time and action
      (activeTag.action as string) === 'Half Time Whistle' ||
      (activeTag.action as string) === 'Full Time Whistle' ||
      // Throw-up events need foulAwardedTo (won by team) but not initial team
      (activeTag.action === 'Throw-up' && foulAwardedTo) ||
      // Other events need team
      (activeTag.team && (
        // Regular actions that don't need special handling
        (activeTag.action !== 'Foul' && activeTag.action !== 'Kick-in' && activeTag.action !== 'Throw-up' && activeTag.action !== 'Kickout') || 
        // Special actions that need specific conditions
        foulAwardedTo || 
        (activeTag.action === 'Kickout' && activeTag.outcome)
      ))
    )

  // Handle save with card logic
  const handleSaveClick = () => {
    let nextEventTeam = currentPossession || 'red'
    
    if (activeTag?.action === 'Foul' && selectedCard && foulAwardedTo) {
      const otherTeam = foulAwardedTo === 'red' ? 'blue' : 'red'
      // Set outcome to 'Won' and team to the awarded team
      onEventUpdate({ outcome: 'Won', team: foulAwardedTo })
      nextEventTeam = foulAwardedTo // Team that was fouled gets possession
      setTimeout(() => onEventSave({ cardType: selectedCard, targetTeam: otherTeam, foulAwardedTo }), 50)
    } else if (activeTag?.action === 'Foul' && foulAwardedTo) {
      // Set outcome to 'Won' and team to the awarded team
      onEventUpdate({ outcome: 'Won', team: foulAwardedTo })
      nextEventTeam = foulAwardedTo // Team that was fouled gets possession
      setTimeout(() => onEventSave({ foulAwardedTo }), 50)
    } else if (activeTag?.action === 'Throw-up' && foulAwardedTo) {
      // For throw-up, set outcome to 'Won' and team to the selected team
      onEventUpdate({ outcome: 'Won', team: foulAwardedTo })
      nextEventTeam = foulAwardedTo // Team that won throw-up gets possession
      setTimeout(() => onEventSave(), 50)
    } else if (activeTag?.action === 'Throw-up' && !foulAwardedTo) {
      // For match time marker throw-up (auto-created), just save as N/A
      onEventUpdate({ outcome: 'N/A' })
      setTimeout(() => onEventSave(), 50)
    } else if ((activeTag?.action as string) === 'Half Time Whistle' || (activeTag?.action as string) === 'Full Time Whistle') {
      // For match time marker whistle events, set outcome to N/A and save
      onEventUpdate({ outcome: 'N/A' })
      setTimeout(() => onEventSave(), 50)
    } else if (activeTag?.action === 'Turnover') {
      // For turnover, determine which team gets possession based on outcome
      if (activeTag.outcome === 'Won' && activeTag.team) {
        nextEventTeam = activeTag.team // Team that won the turnover gets possession
      } else if (activeTag.outcome === 'Lost' && activeTag.team) {
        nextEventTeam = activeTag.team === 'red' ? 'blue' : 'red' // Opposite team gets possession
      }
      onEventSave()
    } else if (activeTag?.action === 'Kickout') {
      // For kickout, determine which team gets possession based on outcome
      if (activeTag.outcome === 'Won' && activeTag.team) {
        nextEventTeam = activeTag.team // Team that won the kickout gets possession
      } else if (activeTag.outcome === 'Lost' && activeTag.team) {
        nextEventTeam = activeTag.team === 'red' ? 'blue' : 'red' // Opposite team gets possession
      }
      onEventSave()
    } else if (activeTag?.action === 'Kick-in' && foulAwardedTo) {
      // For kick-in, set outcome to 'Won' and team to the awarded team
      onEventUpdate({ outcome: 'Won', team: foulAwardedTo })
      nextEventTeam = foulAwardedTo // Team that was awarded kick-in gets possession
      setTimeout(() => onEventSave(), 50)
    } else {
      onEventSave()
    }
    
    // Update possession immediately for immediate UI feedback
    if (onUpdatePossession && nextEventTeam !== currentPossession) {
      onUpdatePossession(nextEventTeam)
    }
    
    // Reset local state
    setSelectedCard(null)
    setFoulAwardedTo(null)
    
    // Only create new event if shot action doesn't require kickout
    // (kickout will be pre-set in the saveTag function)
    const needsNewEvent = !(activeTag?.action === 'Shot' && activeTag.outcome && ['1Point', '2Point', 'Goal', 'Wide', 'Saved'].includes(activeTag.outcome))
    
    // Don't auto-create next event for match time marker events - let the useEffect handle it
    const isMatchTimeMarkerEvent = (activeTag?.action as string) === 'Half Time Whistle' || 
                                   (activeTag?.action as string) === 'Full Time Whistle' ||
                                   (activeTag?.action === 'Throw-up' && !foulAwardedTo)
    
    if (needsNewEvent && !isMatchTimeMarkerEvent) {
      // Create new event immediately after save to keep the flow going
      setTimeout(() => {
        handleEventCreateWithAutoSet({ team: nextEventTeam })
      }, 100)
    }
  }

  // Auto-create active tag for match time marker events
  useEffect(() => {
    // Handle both when no events exist (first throw-up) and when events exist but markers not complete
    const currentRequiredEvent = nextRequiredEvent || (!hasAnyEvents ? 'First Half Throw-up' : null)
    
    console.log('🔍 Auto-creation effect:', {
      currentRequiredEvent,
      hasActiveTag: !!activeTag,
      activeTagAction: activeTag?.action,
      needsNewActiveTag: !activeTag
    })
    
    if (!isMatchMarkersComplete && currentRequiredEvent && !activeTag) {
      // Only create new activeTag when there's no activeTag at all
      // Map next required event to action type
      let action: ActionType | undefined
      let team: TeamType | undefined // Whistles don't need a team

      switch (currentRequiredEvent) {
        case 'First Half Throw-up':
          action = 'Throw-up'
          team = undefined // Throw-up events don't have initial team, only "won by" team
          break
        case 'Half Time Whistle':
          action = 'Half Time Whistle'
          team = undefined // Whistle events are neutral
          break
        case 'Second Half Throw-up':
          action = 'Throw-up'
          team = undefined // Throw-up events don't have initial team, only "won by" team
          break
        case 'Full Time Whistle':
          action = 'Full Time Whistle'
          team = undefined // Whistle events are neutral
          break
      }

      if (action) {
        console.log('🚀 Creating match time marker event:', { action, team })
        
        // Create new activeTag
        const eventData: any = {
          action
        }
        // Only add team if it's defined (not for whistle events)
        if (team !== undefined) {
          eventData.team = team
        }
        console.log('📦 Event data before creation:', eventData)
        handleEventCreateWithAutoSet(eventData)
      }
    }
  }, [hasAnyEvents, isMatchMarkersComplete, activeTag, nextRequiredEvent, handleEventCreateWithAutoSet, currentTime])

  // Auto-set action for throw-up events during match time markers
  useEffect(() => {
    if (!isMatchMarkersComplete && nextRequiredEvent && activeTag && !activeTag.action) {
      const requiresThrowUp = nextRequiredEvent === 'First Half Throw-up' || nextRequiredEvent === 'Second Half Throw-up'
      
      if (requiresThrowUp) {
        console.log('🎯 Auto-setting throw-up action for:', nextRequiredEvent)
        onEventUpdate({ action: 'Throw-up' as ActionType })
      }
    }
  }, [activeTag, nextRequiredEvent, isMatchMarkersComplete, onEventUpdate])

  return (
    <>
    <Card className={`w-full ${className} shadow-lg border-0 bg-transparent`}>
      <CardHeader className="pb-4 bg-transparent border-b border-gray-200/20">
        
        {/* Dynamic Content Based on State */}
        {!isMatchMarkersComplete ? (
          // Markers not complete - show progress tracker (including when no events exist)
          <MatchTimeMarkersTracker
            progress={matchState.matchTimeMarkersProgress}
            nextRequiredEvent={nextRequiredEvent || 'First Half Throw-up'} // Default to first event when no events exist
            matchTimeMarkers={matchTimeMarkers}
            onAutoFillVideoAnalysis={onAutoFillVideoAnalysis}
          />
        ) : !taggingMode ? (
          // Markers complete but no mode selected - show mode selector
          <TaggingModeSelector onModeSelect={handleModeSelect} />
        ) : taggingMode === 'ai' ? (
          // AI mode selected - show AI analysis form
          <TaggingAIAnalysisForm
            onSubmit={handleAnalysisStart}
            isLoading={isAnalyzing}
            teamId={teamId || 'demo-team-1'} // Use the actual team ID from game context
            matchTimeMarkers={matchTimeMarkers}
            analysisProgress={analysisProgress}
            analysisAttempt={analysisAttempt}
            analysisError={analysisError}
            onStopAnalysis={onStopAnalysis}
            currentTaskId={currentTaskId}
          />
        ) : null}
        
        {/* Match Status Display - Show when in manual mode */}
        {taggingMode === 'manual' && (
          <div className="flex flex-col gap-2 mb-3">
            {/* Match Score Box - Full Width */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-3 border border-gray-600/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Trophy className="h-4 w-4 text-green-400" />
                  </div>
                  <span className="font-semibold text-gray-200">Match Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 text-white px-3 py-1 font-medium">
                    {teams.red.name}
                  </Badge>
                  <div className="backdrop-blur-sm px-3 py-1 rounded-md border font-medium bg-gray-300/40 border-gray-300/30 text-gray-800 dark:bg-gray-700/50 dark:border-gray-600/30 dark:text-gray-200">
                    {teams.red.score}
                  </div>
                  <span className="text-gray-400">:</span>
                  <div className="backdrop-blur-sm px-3 py-1 rounded-md border font-medium bg-gray-300/40 border-gray-300/30 text-gray-800 dark:bg-gray-700/50 dark:border-gray-600/30 dark:text-gray-200">
                    {teams.blue.score}
                  </div>
                  <Badge className="bg-blue-500 text-white px-3 py-1 font-medium">
                    {teams.blue.name}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Three Info Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Possession Box */}
              <div className="backdrop-blur-sm rounded-lg p-3 border bg-gray-100/50 border-gray-200/50 dark:bg-gray-800/30 dark:border-gray-600/30">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="font-semibold text-gray-200">Possession</span>
                  {currentPossession ? (
                    <Badge className={`${currentPossession === 'red' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'} px-2 py-0.5 font-medium text-sm`}>
                      {teams[currentPossession].name}
                    </Badge>
                  ) : (
                    <div className="px-2 py-0.5 rounded-md text-xs italic border bg-gray-300/40 text-gray-600 border-gray-300/30 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600/30">
                      No Team
                    </div>
                  )}
                </div>
              </div>

              {/* Match Time Box */}
              <div className="backdrop-blur-sm rounded-lg p-3 border bg-gray-100/50 border-gray-200/50 dark:bg-gray-800/30 dark:border-gray-600/30">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-400" />
                  </div>
                  <span className="font-semibold text-gray-200">Match Time</span>
                  <div className="text-lg font-bold font-mono backdrop-blur-sm px-2 py-0.5 rounded border text-gray-800 bg-gray-300/40 border-gray-300/30 dark:text-gray-200 dark:bg-gray-700/50 dark:border-gray-600/30 text-center">
                    {formatTime(currentTime)}
                  </div>
                </div>
              </div>

              {/* Half & Switch Box */}
              <div className="backdrop-blur-sm rounded-lg p-3 border bg-gray-100/50 border-gray-200/50 dark:bg-gray-800/30 dark:border-gray-600/30">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <RotateCcw className="h-4 w-4 text-orange-400" />
                  </div>
                  <span className="font-semibold text-gray-200">Half</span>
                  <div className="flex items-center gap-1 w-full">
                    <div className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-md font-medium border border-orange-500/30 flex-1 text-center text-sm">
                      {matchState.isSecondHalf ? '2nd Half' : '1st Half'}
                    </div>
                    {onToggleSecondHalf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onToggleSecondHalf}
                        className="h-6 px-1.5 text-xs border-gray-600/30 text-gray-200 hover:bg-orange-500/15 hover:border-orange-500/30 hover:text-orange-200 transition-all"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Last Event Display - Show when in manual mode or when markers complete, but NOT when in AI mode */}
        {(matchState.tagHistory.length > 0 && (isMatchMarkersComplete || taggingMode === 'manual') && taggingMode !== 'ai') && (
           <div className="backdrop-blur-sm rounded-lg p-4 border-l-4 border-green-500 border bg-gray-100/50 border-gray-200/50 dark:bg-gray-800/30 dark:border-gray-600/30">
             <div className="flex items-center gap-3 mb-3">
               <div className="p-2 bg-green-500/20 rounded-lg">
                 <Flag className="h-4 w-4 text-green-400" />
               </div>
               <span className="font-semibold text-gray-200">Last Event</span>
             </div>
             {(() => {
               // When in manual mode and match markers are complete, show the first half throw-up event
               let displayEvent = matchState.tagHistory[matchState.tagHistory.length - 1]
               
               if (taggingMode === 'manual' && isMatchMarkersComplete) {
                 // Find the first half throw-up event (should be the first event in history)
                 const firstHalfThrowUp = matchState.tagHistory.find(event => 
                   event.action === 'Throw-up' && event.time <= (matchTimeMarkers?.halfTime || Infinity)
                 )
                 if (firstHalfThrowUp) {
                   displayEvent = firstHalfThrowUp
                 }
               }
               
               return (
                 <div className="flex items-center gap-3 flex-wrap">
                   <Badge className={`${displayEvent.team === 'red' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'} px-3 py-1 font-medium`}>
                     {displayEvent.team === 'red' ? teams.red.name : teams.blue.name}
                   </Badge>
                   <div className="bg-gray-700/50 backdrop-blur-sm px-3 py-1 rounded-md border border-gray-600/30 font-medium text-gray-200">
                     {displayEvent.action}
                   </div>
                   {displayEvent.outcome !== 'N/A' && (
                     <>
                       <span className="text-gray-400">→</span>
                       <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-md font-medium border border-green-500/30">
                         {displayEvent.action === 'Throw-up' && displayEvent.outcome === 'Won' 
                           ? `Won by ${teams[displayEvent.team].name}`
                           : displayEvent.outcome
                         }
                       </div>
                     </>
                   )}
                   <div className="ml-auto flex items-center gap-2">
                     <span className="text-sm text-gray-300 font-mono bg-gray-700/50 backdrop-blur-sm px-2 py-1 rounded border border-gray-600/30">
                       {formatTime(displayEvent.time)}
                     </span>
                     {displayEvent.autoGenerated && (
                       <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/30 bg-orange-500/10">
                         Auto
                       </Badge>
                     )}
                   </div>
                 </div>
               )
             })()}
           </div>
         )}
        
        {/* Current Event Display - Show when there's an active tag OR during match time markers tagging (but not in manual mode) */}
        {(activeTag || (!isMatchMarkersComplete && taggingMode !== 'manual')) && (
           <div className="backdrop-blur-sm rounded-lg p-4 border-l-4 border-blue-500 border bg-gray-100/50 border-gray-200/50 dark:bg-gray-800/30 dark:border-gray-600/30">
             <div className="flex items-center gap-3 mb-3">
               <div className="p-2 bg-blue-500/20 rounded-lg">
                 <Tag className="h-4 w-4 text-blue-400" />
               </div>
               <span className="font-semibold text-gray-800 dark:text-gray-200">Current Event</span>

             </div>
             <div className="flex items-center gap-3 flex-wrap mb-4">
              {/* Show active tag info, or current time info for match time markers */}
              {activeTag ? (
                <>
               {/* Don't show team for whistle events or throw-up events (they start without team) */}
               {((activeTag.action as string) !== 'Half Time Whistle' && (activeTag.action as string) !== 'Full Time Whistle' && activeTag.action !== 'Throw-up') && (
                 activeTag.team ? (
                 <Badge className={`${activeTag.team === 'red' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'} px-3 py-1 font-medium`}>
                   {activeTag.team === 'red' ? teams.red.name : teams.blue.name}
                 </Badge>
               ) : (
                  <div className="px-3 py-1 rounded-md text-sm italic border bg-gray-200 text-gray-500 border-gray-300 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600/30">
                    Choose team below...
                  </div>
                 )
               )}
               
               {activeTag.action ? (
                 <div className="backdrop-blur-sm px-3 py-1 rounded-md border font-medium bg-gray-200 border-gray-300 text-gray-800 dark:bg-gray-700/50 dark:border-gray-600/30 dark:text-gray-200">
                   {activeTag.action}
                 </div>
               ) : (
                  <div className="px-3 py-1 rounded-md text-sm italic border bg-gray-200 text-gray-500 border-gray-300 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600/30">
                    Choose action below...
                  </div>
               )}
               
               {activeTag.time !== undefined && (
                 <div className="ml-auto text-sm font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600/30">
                   {formatTime(activeTag.time)}
                 </div>
                  )}
                </>
              ) : (
                // Show current video time and next required event when tagging match time markers
                <>
                  <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-md font-medium border border-blue-500/30">
                    {nextRequiredEvent || (!hasAnyEvents ? 'First Half Throw-up' : 'Match Time Marker')}
                  </div>
                  <div className="ml-auto text-sm font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600/30">
                    {formatTime(currentTime)}
                  </div>
                </>
               )}
             </div>

             {/* Action and Outcome Selection - Integrated */}
             <div className="pt-3 border-t border-gray-600/30">
              {(() => {
                console.log('🎯 UI condition check:', {
                  hasActiveTag: !!activeTag,
                  activeTagAction: activeTag?.action,
                  activeTagFull: activeTag,
                  isWhistleEvent: activeTag && activeTag.action && ((activeTag.action as string) === 'Half Time Whistle' || (activeTag.action as string) === 'Full Time Whistle'),
                  isSpecialEvent: activeTag && activeTag.action && ['Foul', 'Kick-in', 'Throw-up', 'Kickout'].includes(activeTag.action),
                })
                
                // Handle whistle events first - they should show the special whistle UI
                if (activeTag && activeTag.action && ((activeTag.action as string) === 'Half Time Whistle' || (activeTag.action as string) === 'Full Time Whistle')) {
                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-gray-200">Match Time Marker</Label>
                      </div>
                      <div className="text-center text-gray-400 text-sm mb-4">
                        No team or outcome selection needed for whistle events
                      </div>
                      <Button
                        onClick={handleSaveClick}
                        className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-medium transition-all transform hover:scale-105 shadow-lg"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Event
                      </Button>
                    </>
                  )
                } else if (activeTag && !activeTag.action && !isMatchMarkersComplete && nextRequiredEvent) {
                  // Handle case where activeTag exists but has no action during match time marker phase
                  const requiresWhistle = nextRequiredEvent === 'Half Time Whistle' || nextRequiredEvent === 'Full Time Whistle'
                  const requiresThrowUp = nextRequiredEvent === 'First Half Throw-up' || nextRequiredEvent === 'Second Half Throw-up'
                  
                  if (requiresWhistle) {
                    // Show whistle interface and update action when user interacts
                    return (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-medium text-gray-200">Match Time Marker</Label>
                        </div>
                        <div className="text-center text-gray-400 text-sm mb-4">
                          {nextRequiredEvent} - No team or outcome selection needed
                        </div>
                        <Button
                          onClick={() => {
                            const whistleAction = nextRequiredEvent === 'Half Time Whistle' ? 'Half Time Whistle' : 'Full Time Whistle'
                            onEventUpdate({ action: whistleAction as ActionType })
                            setTimeout(() => handleSaveClick(), 100)
                          }}
                          className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-medium transition-all transform hover:scale-105 shadow-lg"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save {nextRequiredEvent}
                        </Button>
                      </>
                    )
                  } else if (requiresThrowUp) {
                    // For throw-ups, we fall through to regular action selection, but the action will be auto-set by useEffect below
                    return null
                  }
                  // Fall through to regular action selection for non-match-marker events
                } 
                
                if (activeTag && !activeTag.action) {
                  return (
                 <>
                   {matchState.tagHistory.length === 0 ? (
                     <>
                       <Label className="text-sm font-medium text-gray-200 mb-2 block">First Event - Match Start</Label>
                       <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                         <div className="flex items-center gap-2 text-blue-300">
                           <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                           <span className="text-sm font-medium">Match automatically starts with Throw-up</span>
                         </div>
                       </div>
                     </>
                   ) : (
                     <>
                       <Label className="text-sm font-medium text-gray-200 mb-2 block">Select Action</Label>
                       {getEnabledActions().length > 0 ? (
                         <div className="grid grid-cols-2 gap-2">
                           {getEnabledActions().map((action) => (
                             <Button
                               key={action}
                               variant="outline"
                               onClick={() => handleActionSelect(action)}
                               className="h-9 text-xs font-medium transition-all hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/30 border-gray-600/30 text-gray-300"
                             >
                               {action}
                             </Button>
                           ))}
                         </div>
                       ) : (
                         <div className="text-center py-4">
                           <span className="text-gray-400 text-sm">No actions available</span>
                         </div>
                       )}
                     </>
                   )}
                 </>
                  )
                } else if (activeTag && activeTag.action && ['Foul', 'Kick-in', 'Throw-up', 'Kickout'].includes(activeTag.action)) {
                  return (
                 <>
                   <div className="flex items-center justify-between mb-2">
                     <Label className="text-sm font-medium text-gray-800 dark:text-gray-200">
                       {activeTag.action === 'Throw-up' ? 'Won by' : 
                        activeTag.action === 'Kickout' ? 'Kickout outcome' :
                        activeTag.action === 'Kick-in' ? 'Kick-in awarded to' :
                        activeTag.action === 'Foul' ? 'Foul awarded to' :
                        'Awarded to'}
                     </Label>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => handleActionSelect(undefined)}
                       className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200"
                     >
                       ← Back
                     </Button>
                   </div>
                   {/* For Kickout, show outcome buttons instead of team selection */}
                   {activeTag.action === 'Kickout' ? (
                     <div className="flex gap-2">
                       <Button
                         variant="outline"
                         onClick={() => handleOutcomeSelect('Won')}
                         className="flex-1 h-9 font-medium transition-all hover:bg-green-500/20 hover:text-green-300 hover:border-green-500/30 border-gray-600/30 text-gray-300"
                       >
                         Won
                       </Button>
                       <Button
                         variant="outline"
                         onClick={() => handleOutcomeSelect('Lost')}
                         className="flex-1 h-9 font-medium transition-all hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 border-gray-600/30 text-gray-300"
                       >
                         Lost
                       </Button>
                     </div>
                   ) : (
                     <div className="flex items-center justify-between backdrop-blur-sm rounded-lg p-3 border mb-3 bg-gray-200 border-gray-300 dark:bg-gray-700/50 dark:border-gray-600/30">
                       {foulAwardedTo ? (
                         <div className="flex items-center gap-2">
                           <div className={`w-3 h-3 rounded-full ${foulAwardedTo === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                           <span className={`font-semibold ${foulAwardedTo === 'red' ? 'text-red-400' : 'text-blue-400'}`}>
                             {teams[foulAwardedTo].name}
                           </span>
                         </div>
                       ) : (
                         <span className="text-gray-400 text-sm">No Team</span>
                       )}
                       
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           const otherTeam = foulAwardedTo === 'red' ? 'blue' : 'red'
                           setFoulAwardedTo(otherTeam)
                           // Update possession to the team receiving the foul
                           onEventUpdate({ team: otherTeam })
                         }}
                         className="h-8 w-8 p-0 hover:bg-green-500/20 transition-colors border-gray-600/30"
                         title="Switch to other team"
                       >
                         <ArrowLeftRight className="h-4 w-4" />
                       </Button>
                     </div>
                   )}

                   {/* Card Selection for Fouls only */}
                   {foulAwardedTo && activeTag.action === 'Foul' && (
                     <div className="mb-3">
                       <Label className="text-sm font-medium text-gray-200 mb-2 block">Add Card (Optional)</Label>
                       <div className="flex gap-2 mb-3">
                         {['Yellow Card', 'Black Card', 'Red Card'].map((card) => (
                           <Button
                             key={card}
                             variant={selectedCard === card ? 'default' : 'outline'}
                             size="sm"
                             onClick={() => setSelectedCard(selectedCard === card ? null : card as ActionType)}
                             className={`text-xs transition-all ${
                               selectedCard === card
                                 ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                                 : 'hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 border-gray-600/30 text-gray-300'
                             }`}
                           >
                             <Plus className="h-3 w-3 mr-1" />
                             {card.replace(' Card', '')}
                           </Button>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* Save Button for Fouls and Kickouts */}
                   {(canSave || (activeTag.action === 'Kickout' && activeTag.outcome)) && (
                     <Button
                       onClick={handleSaveClick}
                       className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-medium transition-all transform hover:scale-105 shadow-lg"
                     >
                       <Save className="h-4 w-4 mr-2" />
                       Save Event
                     </Button>
                   )}
                 </>
                  )
                } else if (activeTag && activeTag.action && !['Foul', 'Kick-in', 'Throw-up', 'Kickout'].includes(activeTag.action) && getEnabledOutcomes(activeTag.action).length > 0 && !activeTag.outcome) {
                  return (
                 <>
                   <div className="flex items-center justify-between mb-2">
                     <Label className="text-sm font-medium text-gray-800 dark:text-gray-200">
                       {activeTag.action === 'Shot' ? 'Select Result' : 'Select Outcome'}
                     </Label>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => handleActionSelect(undefined)}
                       className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200"
                     >
                       ← Back
                     </Button>
                   </div>
                   <div className="flex gap-2 flex-wrap">
                     {getEnabledOutcomes(activeTag.action).map((outcome) => (
                       <Button
                         key={outcome}
                         variant="outline"
                         onClick={() => handleOutcomeSelect(outcome)}
                         className="h-8 px-3 text-xs font-medium transition-all hover:bg-green-500/20 hover:text-green-300 hover:border-green-500/30 border-gray-600/30 text-gray-300"
                       >
                         {outcome}
                       </Button>
                     ))}
                   </div>
                 </>
                  )
                } else if (activeTag && activeTag.action && ((canSave && !['Foul', 'Kick-in', 'Throw-up', 'Kickout'].includes(activeTag.action)) || ['Turnover'].includes(activeTag.action))) {
                  return (
                 <>
                   <div className="flex items-center justify-between mb-3">
                     <Label className="text-sm font-medium text-gray-800 dark:text-gray-200">Ready to Save</Label>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => activeTag.outcome ? onEventUpdate({ outcome: undefined }) : handleActionSelect(undefined)}
                       className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200"
                     >
                       ← Edit
                     </Button>
                   </div>
                   <Button
                     onClick={handleSaveClick}
                     className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-medium transition-all transform hover:scale-105 shadow-lg"
                   >
                     <Save className="h-4 w-4 mr-2" />
                     Save Event
                   </Button>
                 </>
                  )
                } else if (activeTag && activeTag.action && !['Foul', 'Kick-in', 'Throw-up', 'Kickout'].includes(activeTag.action)) {
                  return (
                   <div className="flex items-center justify-between">
                     <div className="text-xs text-gray-400">Action selected: {activeTag.action}</div>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => handleActionSelect(undefined)}
                       className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200"
                     >
                       ← Back
                     </Button>
                   </div>
                 )
                } else {
                  return null
                }
              })()}
             </div>
           </div>
         )}
      </CardHeader>

      {/* Only show manual tagging content when in manual mode */}
      {taggingMode === 'manual' && (
      <CardContent className="space-y-6 p-6 bg-transparent">
        {/* Quick Actions - Enhanced */}
        {!activeTag && (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="p-4 bg-blue-500/20 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Tag className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            {matchState.tagHistory.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Start Match</h3>
                <p className="text-gray-400 mb-6">Begin the match by creating the opening throw-up event</p>
                <Button 
                  onClick={handleQuickTag}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg shadow-lg transition-all transform hover:scale-105"
                >
                  <Tag className="h-5 w-5 mr-2" />
                  Start Match - Throw-up at {formatTime(currentTime)}
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Ready to Tag Event</h3>
                <p className="text-gray-400 mb-6">Click the button below to start tagging an event at the current time</p>
                <Button 
                  onClick={handleQuickTag}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-lg transition-all transform hover:scale-105"
                >
                  <Tag className="h-5 w-5 mr-2" />
                  Tag Event at {formatTime(currentTime)}
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
      )}
    </Card>

    {/* Validation Errors Dialog */}
    <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Validation Errors
          </DialogTitle>
          <DialogDescription>
            Please fix the following issues before proceeding:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {validationErrors.map((error, index) => (
            <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">{error.message}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-4">
          <Button
            onClick={() => setShowValidationDialog(false)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Understood
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  )
} 