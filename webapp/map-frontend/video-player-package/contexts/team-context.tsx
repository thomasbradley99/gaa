"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Team } from '@/lib/api/generated/types.gen'

interface TeamContextType {
  /**
   * The currently selected team object. `null` when no team is selected.
   */
  selectedTeam: Team | null
  /**
   * Setter for updating the currently selected team. Pass `null` to clear.
   */
  setSelectedTeam: (team: Team | null) => void
  /**
   * Convenience helper for clearing the selected team (sets it to `null`).
   */
  clearSelectedTeam: () => void
}

const TeamContext = createContext<TeamContextType | undefined>(undefined)

interface TeamContextProviderProps {
  children: React.ReactNode
}

export function TeamContextProvider({ children }: TeamContextProviderProps) {
  const [selectedTeam, setSelectedTeamState] = useState<Team | null>(null)

  // Stable wrappers using useCallback to avoid unnecessary re-renders in consumers
  const setSelectedTeam = useCallback((team: Team | null) => {
    setSelectedTeamState(team)
  }, [])

  const clearSelectedTeam = useCallback(() => {
    setSelectedTeamState(null)
  }, [])

  return (
    <TeamContext.Provider
      value={{ selectedTeam, setSelectedTeam, clearSelectedTeam }}
    >
      {children}
    </TeamContext.Provider>
  )
}

export function useTeamContext() {
  const context = useContext(TeamContext)
  if (context === undefined) {
    throw new Error('useTeamContext must be used within a TeamContextProvider')
  }
  return context
}

// Re-export hook and provider using shorter names for convenience
export const useTeam = useTeamContext
export const TeamProvider = TeamContextProvider 