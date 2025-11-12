"use client"

import { useTeam } from "@/contexts/team-context"
import { TeamSelector } from "@/components/dashboard/dialogs/team-selector-dialog"
import { TeamDashboard } from "@/components/dashboard/dashboard"
import { useTeams } from "@/hooks/use-teams"
import { useEffect } from "react"

export default function DashboardPage() {
  const { selectedTeam, setSelectedTeam } = useTeam()
  const { data: teamsResponse, isLoading } = useTeams({ status: 'active' })
  const teams = teamsResponse?.result || []

  // Auto-select the first team if none is selected
  useEffect(() => {
    if (!selectedTeam && teams.length > 0) {
      setSelectedTeam(teams[0])
    }
  }, [selectedTeam, teams, setSelectedTeam])

  // If loading, show nothing or a spinner (optional)
  if (isLoading) return null

  return (
    <div className="px-4 lg:px-6">
      <TeamDashboard />
    </div>
  )
}
