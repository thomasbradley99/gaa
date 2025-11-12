"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTeam } from "@/contexts/team-context"
import { useDeleteMember, useUpdateMember } from "@/hooks/use-members"
import { useTeams } from "@/hooks/use-teams"
import { useAuth } from "@/contexts/auth-context"
import { 
  Users, 
  Plus,
  UserPlus,
  MoreHorizontal,
  Copy,
  CheckCircle,
  Link,
  Calendar,
  Trophy,
  Target,
  Trash2,
  Settings,
  RefreshCw,
  LogOut
} from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TeamSelector } from "@/components/dashboard/dialogs/team-selector-dialog"
import { CreateTeamDialog } from "@/components/dashboard/dialogs/create-team-dialog"
import { JoinTeamDialog } from "@/components/dashboard/dialogs/join-team-dialog"
import { useLeaveTeam } from "@/hooks/use-teams"

export function TeamOverview() {
  const { selectedTeam, setSelectedTeam } = useTeam();
  const { user } = useAuth();
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);
  const [copiedTeamLink, setCopiedTeamLink] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToUpdateRole, setMemberToUpdateRole] = useState<{ id: string; name: string; currentRole: string } | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const deleteMember = useDeleteMember();
  const updateMember = useUpdateMember();
  const leaveTeam = useLeaveTeam();
  const { data: teamsResponse } = useTeams();

  if (!selectedTeam) {
    return null;
  }

  const handleCopyInviteCode = async () => {
    if (selectedTeam.settings?.inviteCode) {
      try {
        await navigator.clipboard.writeText(selectedTeam.settings.inviteCode);
        setCopiedInviteCode(true);
        setTimeout(() => setCopiedInviteCode(false), 2000);
      } catch (err) {
        console.error('Failed to copy invite code:', err);
      }
    }
  };

  const handleCopyTeamLink = async () => {
    const teamLink = typeof window !== 'undefined' 
      ? `${window.location.origin}/join/${selectedTeam.settings?.inviteCode}` 
      : `https://clannai.com/join/${selectedTeam.settings?.inviteCode}`;
    
      try {
      await navigator.clipboard.writeText(teamLink);
        setCopiedTeamLink(true);
        setTimeout(() => setCopiedTeamLink(false), 2000);
      } catch (err) {
        console.error('Failed to copy team link:', err);
    }
  };

  const handleLeaveTeam = async () => {
    const currentUsername = user?.username;
    const members = selectedTeam?.members || [];
    
    if (!currentUsername) {
      console.error('Could not determine current user');
      return;
    }

    // Find the current user's member record in the team members array
    const currentUserMember = members.find(member => 
      member.username === currentUsername
    );
    
    if (!currentUserMember?.memberId) {
      console.error('Could not find current user in team members');
      return;
    }

    try {
      await leaveTeam.mutateAsync({
        teamId: selectedTeam?.id || '',
        memberId: currentUserMember.memberId
      });
      setShowLeaveDialog(false);
      
      // After leaving the team, try to switch to another available team
      const availableTeams = teamsResponse?.result || [];
      const otherTeams = availableTeams.filter(team => team.id !== selectedTeam?.id);
      
      if (otherTeams.length > 0) {
        // Switch to the first available team
        setSelectedTeam(otherTeams[0]);
      } else {
        // No other teams available, clear the selected team
        setSelectedTeam(null);
      }
    } catch (e) {
      // error handled by mutation
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete || !selectedTeam.id) return;
    
    try {
      await deleteMember.mutateAsync({
        id: memberToDelete.id,
        teamId: selectedTeam.id
      });
      setShowDeleteDialog(false);
      setMemberToDelete(null);
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
  };

  const openDeleteDialog = (member: { firstName?: string; lastName?: string; memberId?: string; role: string }) => {
    const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Team Member';
    if (member.memberId) {
      setMemberToDelete({ id: member.memberId, name: memberName });
      setShowDeleteDialog(true);
    } else {
      console.error('Member ID not found for:', memberName);
    }
  };

  const openRoleDialog = (member: { firstName?: string; lastName?: string; memberId?: string; role: string }) => {
    const memberName = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Team Member';
    if (member.memberId) {
      setMemberToUpdateRole({ id: member.memberId, name: memberName, currentRole: member.role });
      setSelectedRole(member.role);
      setShowRoleDialog(true);
    } else {
      console.error('Member ID not found for:', memberName);
    }
  };

  const handleRoleChange = async () => {
    if (!memberToUpdateRole || !selectedRole || !selectedTeam.id) return;
    
    try {
      await updateMember.mutateAsync({
        id: memberToUpdateRole.id,
        teamId: selectedTeam.id,
        memberData: { role: selectedRole as 'captain' | 'player' | 'coach' | 'manager' }
      });
      setShowRoleDialog(false);
      setMemberToUpdateRole(null);
      setSelectedRole('');
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Side: Team Info */}
      <div className="space-y-6">
        {/* Team Invite Section */}
        {selectedTeam.settings?.inviteCode && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-primary">
                <UserPlus className="h-5 w-5" />
                Team Invites
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Share these with others to invite them to your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Join Link Card */}
              <Card 
                className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 cursor-pointer hover:from-primary/10 hover:to-primary/15 transition-all duration-200"
                onClick={handleCopyTeamLink}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <Link className="h-4 w-4" />
                    Team Join Link
                    <Copy className="h-4 w-4 ml-auto" />
                    {copiedTeamLink && (
                      <CheckCircle className="h-4 w-4 text-success ml-2" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Click to copy the join link
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="p-4 bg-background/50 border border-primary/30 rounded-xl backdrop-blur-sm">
                    <p className="font-mono text-sm text-primary break-all">
                      {typeof window !== 'undefined' 
                        ? `${window.location.origin}/join/${selectedTeam.settings?.inviteCode}` 
                        : `https://clannai.com/join/${selectedTeam.settings?.inviteCode}`
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Invite Code Card */}
              <Card 
                className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 cursor-pointer hover:from-primary/10 hover:to-primary/15 transition-all duration-200"
                onClick={handleCopyInviteCode}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-primary">
                    <UserPlus className="h-4 w-4" />
                    Team Invite Code
                    <Copy className="h-4 w-4 ml-auto" />
                    {copiedInviteCode && (
                      <CheckCircle className="h-4 w-4 text-success ml-2" />
                    )}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm">
                    Click to copy the invite code
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="p-4 bg-background/50 border border-primary/30 rounded-xl backdrop-blur-sm">
                    <p className="font-mono text-3xl font-bold tracking-wider text-primary text-center">
                      {selectedTeam.settings.inviteCode}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}

        {/* Team Actions Card */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <Settings className="h-5 w-5" />
              Team Actions
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage your team and switch between teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-auto py-3 flex-col gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
                  >
                    <RefreshCw className="h-5 w-5" />
                    <span className="text-xs">Switch Team</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Switch Team</DialogTitle>
                  </DialogHeader>
                  <TeamSelector onTeamSelect={() => setShowSwitchDialog(false)} />
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-auto py-3 flex-col gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200" 
                onClick={() => setShowJoinDialog(true)}
              >
                <UserPlus className="h-5 w-5" />
                <span className="text-xs">Join Team</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-auto py-3 flex-col gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200" 
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs">Create Team</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="h-auto py-3 flex-col gap-2 border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200 text-destructive hover:text-destructive" 
                onClick={() => setShowLeaveDialog(true)}
                disabled={leaveTeam.isPending}
                title={"Leave this team"}
              >
                <LogOut className="h-5 w-5" />
                <span className="text-xs">{leaveTeam.isPending ? 'Leaving...' : 'Leave Team'}</span>
              </Button>
            </div>
            
            <CreateTeamDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
            <JoinTeamDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} />
          </CardContent>
        </Card>
      </div>

      {/* Right Side: Team Members */}
      <div>
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Team Members
                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20">
                  {selectedTeam.members?.length || 0}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {selectedTeam.members && selectedTeam.members.length > 0 ? (
              <div className="space-y-4">
                {selectedTeam.members.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {member.firstName && member.lastName 
                            ? `${member.firstName} ${member.lastName}`
                            : 'Team Member'
                          }
                        </h3>
                        <Badge 
                          variant="outline"
                          className={member.role === 'captain' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : member.role === 'coach'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : member.role === 'manager'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        >
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="hover:bg-muted/50">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Joined {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : new Date().toLocaleDateString()}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="flex items-center gap-2"
                            onClick={() => openRoleDialog(member)}
                          >
                            <Settings className="h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="flex items-center gap-2 text-destructive focus:text-destructive"
                            onClick={() => openDeleteDialog(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No members yet</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Team members will appear here once they join using the invite code
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Select a new role for <strong>{memberToUpdateRole?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(['captain', 'player', 'coach', 'manager'] as const).map((role) => (
                <Button
                  key={role}
                  variant={selectedRole === role ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedRole(role)}
                >
                  <Badge 
                    variant="outline"
                    className={role === 'captain' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 mr-2' 
                      : role === 'coach'
                      ? 'bg-green-50 text-green-700 border-green-200 mr-2'
                      : role === 'manager'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 mr-2'
                      : 'bg-gray-50 text-gray-700 border-gray-200 mr-2'
                    }
                  >
                    {role}
                  </Badge>
                  {role}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRoleDialog(false)}
              disabled={updateMember.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={updateMember.isPending || selectedRole === memberToUpdateRole?.currentRole}
            >
              {updateMember.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{memberToDelete?.name}</strong> from the team? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMember.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={deleteMember.isPending}
            >
              {deleteMember.isPending ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Team Confirmation Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Team</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to leave <strong>{selectedTeam.name}</strong>? You will lose access to all team data and will need to be re-invited to rejoin.
            </p>
            {leaveTeam.error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  {leaveTeam.error instanceof Error ? leaveTeam.error.message : 'Failed to leave team'}
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLeaveDialog(false)}
              disabled={leaveTeam.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveTeam}
              disabled={leaveTeam.isPending}
            >
              {leaveTeam.isPending ? 'Leaving...' : 'Leave Team'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 