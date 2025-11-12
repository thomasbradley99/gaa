"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreateTeamDialog } from "@/components/dashboard/dialogs/create-team-dialog"
import { JoinTeamDialog } from "@/components/dashboard/dialogs/join-team-dialog"
import { useTeams, useDeleteTeam } from "@/hooks/use-teams"
import { useTeam } from "@/contexts/team-context"
import { Plus, Users, Trophy, Calendar, AlertCircle, Trash2, UserPlus } from "lucide-react"
import type { Team } from '@/lib/api/generated/types.gen';

interface TeamSelectorProps {
  showOnlyCreateCard?: boolean;
  onTeamSelect?: () => void;
}

export function TeamSelector({ showOnlyCreateCard = false, onTeamSelect }: TeamSelectorProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const { data: teamsResponse, isLoading, error } = useTeams({ status: 'active' });
  const { setSelectedTeam } = useTeam();
  const deleteTeam = useDeleteTeam();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const teams = teamsResponse?.result || [];

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    if (onTeamSelect) onTeamSelect();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
          <LoadingSpinner variant="inline" size="lg" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Loading your teams...</h3>
          <p className="text-muted-foreground">Please wait while we fetch your team data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
        <Alert variant="destructive" className="max-w-md border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <AlertDescription className="text-destructive-foreground">
            Failed to load teams. Please try again.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="border-border hover:bg-accent hover:text-accent-foreground"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (showOnlyCreateCard) {
    return (
      <>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10 group"
          onClick={() => setShowCreateDialog(true)}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-300">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl text-center text-foreground group-hover:text-primary transition-colors">
              Create New Team
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground leading-relaxed">
              Start a new team to manage games, track performance, and organize your sports activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Button 
                variant="outline" 
                className="w-full border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </div>
          </CardContent>
        </Card>
        <CreateTeamDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog} 
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4 w-full">
      {/* Visually Enhanced Team Button List */}
      {teams.map((team) => (
        <div
          key={team.id}
          className={`flex items-center w-full px-4 py-3 rounded-xl border border-border shadow-sm transition-all duration-200 bg-card hover:bg-primary/5 hover:border-primary/30 group ${team.id === teams[0].id ? 'mt-0' : ''}`}
          style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)' }}
        >
          <button
            onClick={() => handleTeamSelect(team)}
            className="flex flex-1 items-center min-w-0 text-left bg-transparent border-0 outline-none p-0 m-0 cursor-pointer"
            disabled={deletingId === team.id}
            tabIndex={-1}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 mr-4">
              {/* Use trophy icon or team initial */}
              <span className="text-xl font-bold text-primary">
                {team.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span className="font-semibold truncate text-lg text-foreground group-hover:text-primary transition-colors">
                {team.name}
              </span>
              {team.sport && (
                <span className="text-xs text-muted-foreground truncate">{team.sport}</span>
              )}
            </div>
            {team.status === 'active' && (
              <span className="ml-2 px-2 py-0.5 rounded bg-success/10 text-success-foreground text-xs font-medium border border-success/20">Active</span>
            )}
          </button>
          <button
            className="ml-4 p-2 rounded-full hover:bg-destructive/10 text-destructive border-0 outline-none"
            title="Delete team"
            disabled={deletingId === team.id}
            onClick={async (e) => {
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to delete the team '${team.name}'? This action cannot be undone.`)) {
                setDeletingId(team.id || '');
                try {
                  await deleteTeam.mutateAsync(team.id || '');
                } finally {
                  setDeletingId(null);
                }
              }
            }}
          >
            {deletingId === team.id ? (
              <LoadingSpinner variant="inline" size="sm" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </button>
        </div>
      ))}
      {/* Team Action Cards */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Join Team Card */}
        <Card 
          className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 cursor-pointer hover:from-primary/10 hover:to-primary/15 transition-all duration-200"
          onClick={() => setShowJoinDialog(true)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <UserPlus className="h-4 w-4" />
              Join Team
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Join an existing team using an invite code
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="p-4 bg-background/50 border border-primary/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2">
                <UserPlus className="h-6 w-6 text-primary" />
                <span className="font-semibold text-primary">Enter Invite Code</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Team Card */}
        <Card 
          className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 cursor-pointer hover:from-primary/10 hover:to-primary/15 transition-all duration-200"
          onClick={() => setShowCreateDialog(true)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-primary">
              <Plus className="h-4 w-4" />
              Create Team
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Start a new team to manage games and track performance
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="p-4 bg-background/50 border border-primary/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2">
                <Plus className="h-6 w-6 text-primary" />
                <span className="font-semibold text-primary">Create New Team</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <CreateTeamDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <JoinTeamDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} />
    </div>
  );
} 