"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTeam } from "@/contexts/team-context"
import { useTeamTab, type TeamTab } from "@/contexts/team-tab-context"
import { useAuth } from "@/contexts/auth-context"
import { TeamOverview } from "@/components/dashboard/tabs/team-tab"
import { TeamGames } from "@/components/dashboard/tabs/matches-tab"
import { PublicMatchesTab } from "@/components/dashboard/tabs/public-matches-tab"
import { Input } from "@/components/ui/input"
import { useUpdateTeam } from "@/hooks/use-teams"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { 
  Users, 
  Calendar,
  Globe,
  Shield
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { TeamSelector } from "@/components/dashboard/dialogs/team-selector-dialog"

export function TeamDashboard() {
  const { selectedTeam } = useTeam();
  const { activeTab, setActiveTab } = useTeamTab();
  const { user } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [teamName, setTeamName] = useState<string>("");
  const updateTeam = useUpdateTeam();

  // Debug logging for admin status
  console.log('🔍 [DASHBOARD] User object:', user);
  console.log('🔍 [DASHBOARD] User isAdmin:', user?.isAdmin);
  console.log('🔍 [DASHBOARD] Should show admin tab:', user?.isAdmin);

  useEffect(() => {
    setTeamName(selectedTeam?.name ?? '');
  }, [selectedTeam]);

  const handleNameSave = async () => {
    if (teamName.trim() && teamName !== selectedTeam?.name) {
      try {
        await updateTeam.mutateAsync({
          id: selectedTeam?.id || '',
          teamData: { name: teamName },
        });
        setEditingName(false);
      } catch (e) {
        // error handled by mutation
      }
    } else {
      setEditingName(false);
    }
  };

  return (
    <div className="flex flex-col pb-8">
      <Tabs value={activeTab ?? "games"} onValueChange={(value: string) => setActiveTab(value as TeamTab)}>
        {/* Full-width TabsList visually attached to header */}
        <div className="w-full bg-white mt-0 z-10">
          <div className="flex justify-center pt-2 pb-4">
            <TabsList className="flex gap-2 bg-white border-0 p-0 justify-center">
              <TabsTrigger
                value="games"
                className="px-4 py-2 font-semibold text-base border-0 border-b-2 border-transparent rounded-none data-[state=active]:border-b-2 data-[state=active]:border-green-700 data-[state=active]:text-green-700 data-[state=active]:bg-white focus:outline-none focus:ring-0 transition-colors"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Matches
              </TabsTrigger>
              <TabsTrigger
                value="overview"
                className="px-4 py-2 font-semibold text-base border-0 border-b-2 border-transparent rounded-none data-[state=active]:border-b-2 data-[state=active]:border-green-700 data-[state=active]:text-green-700 data-[state=active]:bg-white focus:outline-none focus:ring-0 transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                Team
              </TabsTrigger>
              {user?.isAdmin && (
                <TabsTrigger
                  value="public-matches"
                  className="px-4 py-2 font-semibold text-base border-0 border-b-2 border-transparent rounded-none data-[state=active]:border-b-2 data-[state=active]:border-green-700 data-[state=active]:text-green-700 data-[state=active]:bg-white focus:outline-none focus:ring-0 transition-colors"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Public Matches
                </TabsTrigger>
              )}
            </TabsList>
          </div>
        </div>
        {/* Content container */}
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Team Header with Enhanced Styling */}
          {selectedTeam && (
            <Card className="mb-6 p-6 border border-border shadow-sm headerBackgroundColor">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    {selectedTeam ? (
                      editingName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                            onBlur={handleNameSave}
                            onKeyDown={e => {
                              if (e.key === "Enter") handleNameSave();
                              if (e.key === "Escape") setEditingName(false);
                            }}
                            autoFocus
                            disabled={updateTeam.isPending}
                            className="text-4xl font-bold text-foreground tracking-tight max-w-xs"
                          />
                          {updateTeam.isPending && <LoadingSpinner size="sm" />}
                        </div>
                      ) : (
                        <h1
                          className="text-4xl font-bold text-foreground tracking-tight cursor-pointer hover:underline"
                          onClick={() => setEditingName(true)}
                        >
                          {selectedTeam.name}
                        </h1>
                      )
                    ) : (
                      <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        No Team Selected
                      </h1>
                    )}
                    {updateTeam.error && (
                      <div className="text-destructive text-xs mt-1">{updateTeam.error instanceof Error ? updateTeam.error.message : "Failed to update team name"}</div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
          <TabsContent value="games" className="mt-0">
            {selectedTeam ? (
              <TeamGames />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">No matches available</h3>
                  <p className="text-muted-foreground">Select a team to view your matches</p>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="overview" className="mt-0">
            {selectedTeam ? (
              <TeamOverview />
            ) : (
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="w-full">
                  <TeamSelector showOnlyCreateCard={false} />
                </div>
              </div>
            )}
          </TabsContent>
          {user?.isAdmin && (
            <TabsContent value="public-matches" className="mt-0">
              <PublicMatchesTab />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
} 