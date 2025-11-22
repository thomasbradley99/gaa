'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, teams, getToken } from '@/lib/api-client'
import Sidebar from '@/components/shared/Sidebar'
import { PitchFinder } from '@/components/pitch-finder/PitchFinder'
import TeamColorPicker from '@/components/teams/TeamColorPicker'
import { Users, Copy, Share2, Plus, UserPlus, Edit, Trash2, MapPin, Crown, UserMinus, LogOut, Gamepad2, TrendingUp } from 'lucide-react'

export default function TeamPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userTeams, setUserTeams] = useState<any[]>([])
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [selectedClub, setSelectedClub] = useState<any>(null)
  const [showMap, setShowMap] = useState(false)
  const [showEditMap, setShowEditMap] = useState(false)
  const [teamStats, setTeamStats] = useState<{ gameCount: number; memberCount: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [origin, setOrigin] = useState<string>('')

  const fetchUserData = async () => {
    try {
      const userData = await auth.me()
      setUser(userData.user)
    } catch (err) {
      router.push('/')
    }
  }

  const fetchTeams = async () => {
    try {
      const data = await teams.list()
      setUserTeams(data.teams || [])
    } catch (err: any) {
      console.error('Failed to fetch teams:', err)
    }
  }

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const data = await teams.getMembers(teamId)
      setTeamMembers(data.members || [])
    } catch (err: any) {
      console.error('Failed to fetch team members:', err)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/')
      return
    }

    const init = async () => {
      await fetchUserData()
      await fetchTeams()
      setLoading(false)
    }

    init()
  }, [router])

  useEffect(() => {
    if (userTeams.length > 0) {
      fetchTeamMembers(userTeams[0].id)
      fetchTeamStats(userTeams[0].id)
    }
  }, [userTeams])

  const fetchTeamStats = async (teamId: string) => {
    try {
      const data = await teams.getStats(teamId)
      setTeamStats(data)
    } catch (err: any) {
      console.error('Failed to fetch team stats:', err)
    }
  }

  const handleCreateTeam = async (club?: any, e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // Check if user already has a team
    if (userTeams.length > 0) {
      setError('You already have a team. Each user can only create one team.')
      return
    }
    
    // Use passed club or selectedClub
    const clubToUse = club || selectedClub
    const nameToUse = teamName.trim() || clubToUse?.Club
    if (!nameToUse) {
      setError('Team name is required')
      return
    }

    setCreating(true)
    setError('')

    try {
      await teams.create({
        name: nameToUse,
        description: teamDescription || clubToUse?.County ? `${clubToUse.County} GAA` : undefined,
      })
      await fetchTeams()
      setShowCreateModal(false)
      setShowMap(false)
      setTeamName('')
      setTeamDescription('')
      setSelectedClub(null)
    } catch (err: any) {
      // Handle specific error messages from backend
      const errorMessage = err.message || 'Failed to create team'
      setError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const handleClubSelect = (club: any) => {
    setSelectedClub(club)
    setTeamName(club.Club) // Auto-fill team name with club name
    if (!teamDescription) {
      setTeamDescription(`${club.County} GAA`)
    }
  }

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentTeam) return
    
    const nameToUse = teamName.trim()
    if (!nameToUse) {
      setError('Team name is required')
      return
    }

    setUpdating(true)
    setError('')

    try {
      await teams.update(currentTeam.id, {
        name: nameToUse,
        description: teamDescription || undefined,
      })
      await fetchTeams()
      setShowEditModal(false)
      setShowEditMap(false)
      setTeamName('')
      setTeamDescription('')
      setSelectedClub(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update team')
    } finally {
      setUpdating(false)
    }
  }

  const openEditModal = () => {
    if (currentTeam) {
      setTeamName(currentTeam.name)
      setTeamDescription(currentTeam.description || '')
      setShowEditModal(true)
    }
  }

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) {
      setError('Invite code is required')
      return
    }

    setJoining(true)
    setError('')

    try {
      await teams.joinByCode(inviteCode.toUpperCase())
      await fetchTeams()
      setShowJoinModal(false)
      setInviteCode('')
    } catch (err: any) {
      setError(err.message || 'Failed to join team')
    } finally {
      setJoining(false)
    }
  }

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code)
    alert('Invite code copied to clipboard!')
  }

  const copyInviteLink = (code: string) => {
    const link = `${origin || (typeof window !== 'undefined' ? window.location.origin : '')}/join/${code}`
    navigator.clipboard.writeText(link)
    alert('Invite link copied to clipboard!')
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!currentTeam) return
    try {
      await teams.removeMember(currentTeam.id, memberId)
      await fetchTeamMembers(currentTeam.id)
      setMemberToRemove(null)
    } catch (err: any) {
      setError(err.message || 'Failed to remove member')
    }
  }

  const handlePromoteMember = async (memberId: string) => {
    if (!currentTeam) return
    try {
      await teams.promoteMember(currentTeam.id, memberId)
      await fetchTeamMembers(currentTeam.id)
    } catch (err: any) {
      setError(err.message || 'Failed to promote member')
    }
  }

  const handleLeaveTeam = async () => {
    if (!currentTeam) return
    try {
      await teams.leaveTeam(currentTeam.id)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to leave team')
      setShowLeaveConfirm(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!currentTeam) return
    try {
      await teams.deleteTeam(currentTeam.id)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to delete team')
      setShowDeleteConfirm(false)
    }
  }

  const isCurrentUserAdmin = () => {
    if (!currentTeam || !user) return false
    const currentMember = teamMembers.find(m => m.user_id === user.id)
    return currentMember?.role === 'admin'
  }

  const isCurrentUser = (memberUserId: string) => {
    return user && memberUserId === user.id
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <img 
          src="/clann-logo-white.png" 
          alt="Clann AI" 
          className="w-20 h-20 animate-pulse"
        />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const currentTeam = userTeams.length > 0 ? userTeams[0] : null

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Team</h1>
              <p className="text-sm sm:text-base text-gray-400">Manage your GAA team</p>
            </div>

            {/* No Team State */}
            {!currentTeam && (
              <>
                {!showMap ? (
                  <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-6 sm:p-8 text-center mb-6">
                    <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
                    <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">No Team Yet</h2>
                    <p className="text-sm sm:text-base text-gray-400 mb-6">
                      Find your GAA club on the map or create/join a team manually.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                      <button
                        onClick={() => setShowMap(true)}
                        className="w-full sm:w-auto px-6 py-3 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-5 h-5" />
                        Find Club on Map
                      </button>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Create Manually
                      </button>
                      <button
                        onClick={() => setShowJoinModal(true)}
                        className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-5 h-5" />
                        Join Team
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-white">Find Your Club</h2>
                      <button
                        onClick={() => {
                          setShowMap(false)
                          setSelectedClub(null)
                          setTeamName('')
                          setTeamDescription('')
                        }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <PitchFinder 
                      onClubSelect={handleClubSelect}
                      onCreateTeam={userTeams.length === 0 ? handleCreateTeam : undefined}
                      isCreatingTeam={creating}
                    />
                    {userTeams.length > 0 && (
                      <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                        <p className="text-yellow-400 text-sm">
                          You already have a team. Each user can only create one team.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Team Details */}
            {currentTeam && (
              <>
                {/* Team Header */}
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4 sm:p-6 mb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2 truncate">{currentTeam.name}</h2>
                      {currentTeam.description && (
                        <p className="text-sm sm:text-base text-gray-400">{currentTeam.description}</p>
                      )}
                    </div>
                    <button
                      onClick={openEditModal}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                      title="Edit team"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Team Info */}
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4 sm:p-6 mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Team Information</h3>
                  <div className="space-y-4">
                    {/* Invite Link - Primary, Prominent */}
                    <div>
                      <label className="text-xs sm:text-sm text-gray-400 mb-2 block">Invite Link</label>
                      <button
                        onClick={() => {
                          const link = `${origin || window.location.origin}/join/${currentTeam.invite_code}`
                          navigator.clipboard.writeText(link)
                          const button = document.activeElement as HTMLButtonElement
                          const originalBg = button.className
                          const originalText = button.textContent
                          button.textContent = '✅ Copied to clipboard!'
                          button.className = 'w-full px-4 py-3 text-base sm:text-lg bg-green-100 border border-green-300 rounded-lg text-green-700 font-mono text-left transition-all duration-200'
                          setTimeout(() => {
                            button.textContent = originalText
                            button.className = originalBg
                          }, 2000)
                        }}
                        className="w-full px-4 py-3 text-base sm:text-lg bg-[#2D8B4D]/20 hover:bg-[#2D8B4D]/30 border-2 border-[#2D8B4D] rounded-lg text-white font-mono text-left hover:border-[#2D8B4D]/80 transition-all duration-200 cursor-pointer break-all font-semibold"
                        title="Click to copy invite link"
                      >
                        {origin ? `${origin}/join/${currentTeam.invite_code}` : 'Loading...'}
                      </button>
                    </div>
                    {/* Invite Code - Secondary */}
                    <div>
                      <label className="text-xs sm:text-sm text-gray-400">Invite Code</label>
                      <div className="flex items-center gap-2 mt-1 flex-wrap sm:flex-nowrap">
                        <code className="px-3 sm:px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white font-mono text-sm sm:text-base flex-1 min-w-0 text-center">
                          {currentTeam.invite_code}
                        </code>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyInviteCode(currentTeam.invite_code)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
                            title="Copy invite code"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Created Date */}
                    <div>
                      <label className="text-sm text-gray-400">Created</label>
                      <p className="text-white mt-1">
                        {new Date(currentTeam.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Team Statistics */}
                {teamStats && (
                  <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4 sm:p-6 mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Team Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/50 border border-white/10 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Gamepad2 className="w-5 h-5 text-[#2D8B4D]" />
                          <span className="text-sm text-gray-400">Games</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{teamStats.gameCount}</p>
                        <button
                          onClick={() => router.push(`/dashboard?team=${currentTeam.id}`)}
                          className="text-xs text-[#2D8B4D] hover:text-[#2D8B4D]/80 mt-2"
                        >
                          View all games →
                        </button>
                      </div>
                      <div className="bg-black/50 border border-white/10 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Users className="w-5 h-5 text-[#2D8B4D]" />
                          <span className="text-sm text-gray-400">Members</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{teamStats.memberCount}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Team Colors */}
                <div className="mb-6">
                  <TeamColorPicker 
                    teamId={currentTeam.id}
                    currentPrimaryColor={currentTeam.primary_color}
                    currentSecondaryColor={currentTeam.secondary_color}
                    onColorsUpdated={fetchTeams}
                    apiClient={teams}
                  />
                </div>

                {/* Team Members */}
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-white">
                      Members ({teamMembers.length})
                    </h3>
                    <button
                      onClick={() => copyInviteCode(currentTeam.invite_code)}
                      className="w-full sm:w-auto px-4 py-2 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite Member
                    </button>
                  </div>

                  {teamMembers.length === 0 ? (
                    <p className="text-sm sm:text-base text-gray-400">No members yet</p>
                  ) : (
                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-black/50 border border-white/10 rounded-lg"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                              {member.role === 'admin' ? (
                                <Crown className="w-5 h-5 text-yellow-400" />
                              ) : (
                                <Users className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-medium truncate">{member.name}</p>
                                {isCurrentUser(member.user_id) && (
                                  <span className="text-xs text-gray-500">(You)</span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-gray-400 truncate">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                            <span className={`px-3 py-1 text-white text-xs font-semibold rounded-full ${
                              member.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-[#2D8B4D]'
                            }`}>
                              {member.role}
                            </span>
                            <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                              Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            {isCurrentUserAdmin() && !isCurrentUser(member.user_id) && (
                              <div className="flex items-center gap-2">
                                {member.role !== 'admin' && (
                                  <button
                                    onClick={() => handlePromoteMember(member.id)}
                                    className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors"
                                    title="Promote to admin"
                                  >
                                    <Crown className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setMemberToRemove(member.id)
                                    if (confirm(`Remove ${member.name} from the team?`)) {
                                      handleRemoveMember(member.id)
                                    }
                                  }}
                                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                  title="Remove member"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Actions */}
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4 sm:p-6 mt-6">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Team Actions</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!isCurrentUserAdmin() && (
                      <button
                        onClick={() => setShowLeaveConfirm(true)}
                        className="w-full sm:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Leave Team
                      </button>
                    )}
                    {isCurrentUserAdmin() && (
                      <>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full sm:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Team
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-lg border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-white mb-4">Create Team</h2>
            <form onSubmit={(e) => handleCreateTeam(undefined, e)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Dublin GAA"
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setTeamName('')
                    setTeamDescription('')
                    setError('')
                  }}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 disabled:bg-black/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-lg border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-white mb-4">Join Team</h2>
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Invite Code *
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D] font-mono text-center text-lg"
                  required
                  maxLength={6}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false)
                    setInviteCode('')
                    setError('')
                  }}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="flex-1 px-4 py-2 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 disabled:bg-black/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {joining ? 'Joining...' : 'Join Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-black/90 backdrop-blur-lg border border-white/10 rounded-xl p-6 w-full max-w-4xl mx-4 my-8">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Team</h2>
            
            {!showEditMap ? (
              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g., Dublin GAA"
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowEditMap(true)}
                  className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin className="w-5 h-5" />
                  Select Club from Map
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setTeamName('')
                      setTeamDescription('')
                      setSelectedClub(null)
                      setError('')
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="flex-1 px-4 py-2 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 disabled:bg-black/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                  >
                    {updating ? 'Updating...' : 'Update Team'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Select Your Club</h3>
                  <button
                    onClick={() => setShowEditMap(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Back
                  </button>
                </div>
                <PitchFinder 
                  onClubSelect={handleClubSelect}
                  isCreatingTeam={false}
                />
                {selectedClub && (
                  <div className="mt-4 p-4 bg-[#2D8B4D]/20 border border-[#2D8B4D]/50 rounded-lg">
                    <p className="text-white font-medium mb-2">Selected: {selectedClub.Club}</p>
                    <p className="text-gray-400 text-sm mb-3">{selectedClub.County} GAA</p>
                    <button
                      onClick={() => {
                        setShowEditMap(false)
                      }}
                      className="px-4 py-2 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 text-white font-semibold rounded-lg transition-colors"
                    >
                      Confirm Selection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-lg border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-white mb-4">Delete Team</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this team? This action cannot be undone. All games and team data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeam}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
              >
                Delete Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Team Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-lg border border-white/10 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-white mb-4">Leave Team</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to leave this team? You will lose access to all team games and data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveTeam}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
              >
                Leave Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

