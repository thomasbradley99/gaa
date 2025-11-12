"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'
import { Event, TeamType, ActionType, MatchState } from '@/lib/types/tagging'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { List, Search, Trash2, Clock, Filter, Download, Eye, RotateCcw, X, ChevronDown, Trophy, Users } from 'lucide-react'

interface SidebarEventsListProps {
  events: Event[]
  matchState: MatchState
  onEventEdit?: (event: Event) => void
  onEventDelete?: (eventId: string) => void
  onDeleteAll?: () => void
  onEventSeek?: (time: number) => void
  onGenerateSampleEvents?: () => void
  onGenerateCastletownEvents?: () => void
  onGenerateGaaJsonEvents?: () => void
  className?: string
  currentTime?: number
  isPlaying?: boolean
  onPlayPause?: () => void
  onFilterChange?: (teamFilter: TeamType | 'all', selectedActions: ActionType[], selectedShotOutcomes: string[]) => void
}

export function SidebarEventsList({
  events,
  matchState,
  onEventEdit,
  onEventDelete,
  onDeleteAll,
  onEventSeek,
  onGenerateSampleEvents,
  onGenerateCastletownEvents,
  onGenerateGaaJsonEvents,
  className = "",
  currentTime = 0,
  isPlaying = false,
  onPlayPause,
  onFilterChange
}: SidebarEventsListProps) {
  const [teamFilter, setTeamFilter] = useState<TeamType | 'all'>('all')
  const [selectedActions, setSelectedActions] = useState<ActionType[]>([])
  const [selectedShotOutcomes, setSelectedShotOutcomes] = useState<string[]>([])
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)

  // Sync selectedActions with events
  useEffect(() => {
    if (selectedActions.length === 0) return;
    // Remove actions that no longer exist
    setSelectedActions(prev => prev.filter(a => uniqueActions.includes(a)))
    // eslint-disable-next-line
  }, [events])

  // Multi-select action filter logic
  const toggleAction = (action: ActionType) => {
    setSelectedActions(prev => {
      if (prev.includes(action)) {
        return prev.filter(a => a !== action)
      } else {
        return [...prev, action]
      }
    })
  }

  // Multi-select shot outcome filter logic
  const toggleShotOutcome = (outcome: string) => {
    setSelectedShotOutcomes(prev => {
      if (prev.includes(outcome)) {
        return prev.filter(o => o !== outcome)
      } else {
        return [...prev, outcome]
      }
    })
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get team color class for dark theme
  const getTeamColorClass = (team: TeamType) => {
    return team === 'red'
      ? 'bg-red-900/20 text-red-300 border-red-700/50'
      : 'bg-blue-900/20 text-blue-300 border-blue-700/50'
  }

  // Get unique actions for filter (only Kickout, Turnover, and Shot)
  const uniqueActions = ['Kickout', 'Turnover', 'Shot'] as ActionType[]

  // Filter events based on team, action, and shot outcome filters (OR logic for action/shot outcome)
  const filteredEvents = events.filter(event => {
    const teamMatch = teamFilter === 'all' || event.team === teamFilter
    const actionMatch = selectedActions.length === 0 || selectedActions.includes(event.action as ActionType)
    const shotOutcomeMatch = selectedShotOutcomes.length === 0 || (event.action === 'Shot' && selectedShotOutcomes.includes(event.outcome))

    // If both action and shot outcome filters are active, show events that match either
    if (selectedActions.length > 0 && selectedShotOutcomes.length > 0) {
      return teamMatch && (selectedActions.includes(event.action as ActionType) || (event.action === 'Shot' && selectedShotOutcomes.includes(event.outcome)))
    }
    // If only shot outcome filter is active
    if (selectedShotOutcomes.length > 0) {
      return teamMatch && event.action === 'Shot' && selectedShotOutcomes.includes(event.outcome)
    }
    // If only action filter is active
    if (selectedActions.length > 0) {
      return teamMatch && selectedActions.includes(event.action as ActionType)
    }
    // Only team filter (or no filters)
    return teamMatch
  }).sort((a, b) => b.time - a.time) // Most recent first

  // Find the current event based on video playback time (using original events array)
  const findCurrentEventIndex = () => {
    // Use the original events array, not filtered events
    const sortedEvents = [...events].sort((a, b) => a.time - b.time)
    let currentEventIndex = -1
    
    for (let i = sortedEvents.length - 1; i >= 0; i--) {
      if (sortedEvents[i].time <= matchState.currentTime + 0.1) {
        currentEventIndex = i
        break
      }
    }
    
    return currentEventIndex
  }

  const currentEventIndex = findCurrentEventIndex()
  
  // Find the current event ID to highlight in filtered events
  const currentEventId = events[currentEventIndex]?.id

  // Auto-scroll to current event when it changes
  useEffect(() => {
    if (currentEventId) {
      const currentEventElement = document.querySelector(`[data-event-id="${currentEventId}"]`);
      if (currentEventElement) {
        currentEventElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }
  }, [currentEventId]);

  // Notify parent component when filters change
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(teamFilter, selectedActions, selectedShotOutcomes);
    }
  }, [teamFilter, selectedActions, selectedShotOutcomes, onFilterChange]);

  // Export events to CSV
  const exportToCSV = () => {
    const headers = ['Time', 'Team', 'Action', 'Outcome', 'AutoGenerated']
    const rows = filteredEvents.map(event => [
      formatTime(event.time),
      event.team,
      event.action,
      event.outcome,
      event.autoGenerated ? 'Yes' : 'No'
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `match_events_${new Date().toISOString().split('T')[0]}.csv`
    a.click()

    URL.revokeObjectURL(url)
  }

  // Clear all filters
  const clearFilters = () => {
    setTeamFilter('all')
    setSelectedActions([])
    setSelectedShotOutcomes([])
  }

  return (
    <>
      {/* Logo at the very top of the sidebar */}
      <div className="flex justify-center items-center py-3 border-b border-sidebar-border bg-sidebar/95">
        <div className="rounded-full bg-black/80 p-2 flex items-center justify-center">
          <img src="/logo.png" alt="ClannAI Logo" className="h-7 w-auto" />
        </div>
      </div>

      <SidebarHeader className="border-b border-sidebar-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60">
        {/* Playback Controls */}
        <div className="flex justify-center items-center">
          {onPlayPause && (
            <Button
              variant="outline"
              size="icon"
              onClick={onPlayPause}
              className="h-8 w-8"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.25l13.5 6.75-13.5 6.75V5.25z" />
                </svg>
              )}
            </Button>
          )}
        </div>
      </SidebarHeader>

      {/* Current Event Section - Fixed above Events List */}
      {matchState.tagHistory.length > 0 && (
        <div className="p-3 border-b border-sidebar-border bg-sidebar/80">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-xs text-sidebar-foreground/70">Current Event</span>
          </div>
          {(() => {
            const currentEvent = events[currentEventIndex];
            // Check if currentEvent exists and has required properties
            if (!currentEvent || !currentEvent.team || !currentEvent.action) {
              return (
                <div className="text-xs text-gray-400 italic">
                  No current event available
                </div>
              );
            }
            return (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${currentEvent.team === 'red' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'} px-2 py-0.5 font-medium`}>
                  {currentEvent.team === 'red' ? matchState.teams.red.name : matchState.teams.blue.name}
                </Badge>
                <div className="bg-gray-700/50 backdrop-blur-sm px-2 py-0.5 rounded-md border border-gray-600/30 font-medium text-xs text-gray-200">
                  {currentEvent.action}
                </div>
                {currentEvent.outcome && currentEvent.outcome !== 'N/A' && (
                  <>
                    <span className="text-gray-400">→</span>
                    <div className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-md font-medium border border-green-500/30 text-xs">
                      {currentEvent.action === 'Throw-up' && currentEvent.outcome === 'Won'
                        ? `Won by ${matchState.teams[currentEvent.team].name}`
                        : currentEvent.outcome}
                    </div>
                  </>
                )}
                <span className="ml-auto text-xs text-gray-300 font-mono bg-gray-700/50 backdrop-blur-sm px-2 py-0.5 rounded border border-gray-600/30">
                  {formatTime(currentEvent.time)}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      <SidebarContent className="custom-scrollbar">
        {/* Events List */}
        <SidebarGroup>
          <SidebarMenu>
            {filteredEvents.length === 0 ? (
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <List className="h-4 w-4 mr-2 opacity-50" />
                  No events found
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : (
              filteredEvents.map((event) => {
                const isCurrentEvent = event.id === currentEventId
                // Check if event has required properties
                if (!event.team || !event.action) {
                  return null; // Skip events without required properties
                }
                return (
                  <SidebarMenuItem key={event.id} data-event-id={event.id}>
                    <SidebarMenuButton
                      className={`flex items-center justify-between gap-1 flex-row cursor-pointer ${isCurrentEvent ? 'border-2 border-blue-500 bg-blue-900/20' : ''}`}
                      onClick={() => onEventSeek && onEventSeek(event.time)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={`${getTeamColorClass(event.team)} text-xs`}>
                          {event.team === 'red' ? matchState.teams.red.name : matchState.teams.blue.name}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {event.action}
                        </Badge>
                        {event.outcome && event.outcome !== 'N/A' && (
                          <Badge variant={event.outcome === 'Won' ? 'default' : 'secondary'} className="text-xs">
                            {event.outcome}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                        <Clock className="h-3 w-3" />
                        <span className="font-mono">{formatTime(event.time)}</span>
                        {onEventDelete && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventDelete(event.id);
                            }}
                            className="ml-1 h-6 w-6 flex items-center justify-center cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-500/20 rounded transition-colors"
                            title="Delete event"
                          >
                            <Trash2 className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Filtering Section - Fixed at bottom, always expanded */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar/80">
        <div className="mb-3">
          {/* Clear Filters Button */}
          <button
            onClick={() => { setTeamFilter('all'); setSelectedActions([]); setSelectedShotOutcomes([]); }}
            className="w-full h-10 text-sm font-semibold rounded-md border-2 transition-colors bg-gray-500/20 text-gray-500 hover:bg-gray-500/30 border-gray-500 mb-3"
          >
            {teamFilter !== 'all' || selectedActions.length > 0 || selectedShotOutcomes.length > 0 ? 'Clear All Filters' : 'Select Filter'}
          </button>
          {/* Action Filter (multi-select pills) */}
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-2">
              {uniqueActions.map(action => (
                <button
                  key={action}
                  onClick={() => toggleAction(action as ActionType)}
                  className={`h-12 text-sm font-semibold rounded-md border-2 transition-colors ${selectedActions.includes(action as ActionType) ? 'bg-blue-500 text-white hover:bg-blue-600 border-blue-500' : 'bg-gray-500/20 text-gray-500 hover:bg-gray-500/30 border-gray-500'}`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
          {/* Shot Outcome Filter (multi-select pills) */}
          <div className="mb-3">
            <div className="grid grid-cols-3 gap-2">
              {['1Point', '2Point', 'Goal'].map(outcome => (
                <button
                  key={outcome}
                  onClick={() => toggleShotOutcome(outcome)}
                  className={`h-12 text-sm font-semibold rounded-md border-2 transition-colors ${selectedShotOutcomes.includes(outcome) ? 'bg-green-500 text-white hover:bg-green-600 border-green-500' : 'bg-gray-500/20 text-gray-500 hover:bg-gray-500/30 border-gray-500'}`}
                >
                  {outcome}
                </button>
              ))}
            </div>
          </div>
          {/* Team Filter */}
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTeamFilter(teamFilter === 'red' ? 'all' : 'red')}
                className={`h-16 text-lg font-semibold rounded-md border-2 transition-colors ${teamFilter === 'red' ? 'bg-red-500 text-white hover:bg-red-600 border-red-500' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500'}`}
              >
                Red
              </button>
              <button
                onClick={() => setTeamFilter(teamFilter === 'blue' ? 'all' : 'blue')}
                className={`h-16 text-lg font-semibold rounded-md border-2 transition-colors ${teamFilter === 'blue' ? 'bg-blue-500 text-white hover:bg-blue-600 border-blue-500' : 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border-blue-500'}`}
              >
                Blue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Events Buttons */}
      {(onGenerateSampleEvents || onGenerateCastletownEvents || onGenerateGaaJsonEvents) && (
        <div className="mt-4 p-3 rounded-lg border-t border-sidebar-border bg-sidebar/80">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-xs text-sidebar-foreground/70">Generate Events</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {onGenerateSampleEvents && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateSampleEvents}
                className="flex items-center gap-2 text-xs bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30"
              >
                <RotateCcw className="h-3 w-3" />
                Sample
              </Button>
            )}
            {onGenerateCastletownEvents && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateCastletownEvents}
                className="flex items-center gap-2 text-xs bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30"
              >
                <Download className="h-3 w-3" />
                CSV
              </Button>
            )}
            {onGenerateGaaJsonEvents && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateGaaJsonEvents}
                className="flex items-center gap-2 text-xs bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30"
              >
                <Download className="h-3 w-3" />
                JSON
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  )
} 
