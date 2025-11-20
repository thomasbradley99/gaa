'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, admin, clubs, getToken } from '@/lib/api-client'
import Sidebar from '@/components/shared/Sidebar'
import { Shield, Users, Gamepad2, TrendingUp, Loader2, Building2, Video } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [clubsList, setClubsList] = useState<any[]>([])
  const [clubsStats, setClubsStats] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'teams' | 'users' | 'clubs'>('overview')
  const [dataLoading, setDataLoading] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [clubsFilter, setClubsFilter] = useState<'all' | 'veo' | 'no-veo'>('all')

  const fetchUserData = async () => {
    try {
      const userData = await auth.me()
      setUser(userData.user)
      
      // Check if user is admin
      if (userData.user.role !== 'admin') {
        router.push('/dashboard')
        return
      }
    } catch (err) {
      router.push('/')
    }
  }

  const fetchStats = async () => {
    try {
      const data = await admin.getStats()
      setStats(data.stats)
    } catch (err: any) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const fetchGames = async () => {
    setDataLoading(true)
    try {
      const data = await admin.getGames()
      setGames(data.games || [])
    } catch (err: any) {
      console.error('Failed to fetch games:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const fetchTeams = async () => {
    setDataLoading(true)
    try {
      const data = await admin.getTeams()
      setTeams(data.teams || [])
    } catch (err: any) {
      console.error('Failed to fetch teams:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const fetchUsers = async (teamId?: string) => {
    setDataLoading(true)
    try {
      const data = await admin.getUsers(teamId)
      setUsers(data.users || [])
    } catch (err: any) {
      console.error('Failed to fetch users:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const fetchClubs = async () => {
    setDataLoading(true)
    try {
      const filters: any = {}
      if (clubsFilter === 'veo') filters.usesVeo = 'true'
      if (clubsFilter === 'no-veo') filters.usesVeo = 'false'
      const data = await clubs.list(filters)
      setClubsList(data.clubs || [])
    } catch (err: any) {
      console.error('Failed to fetch clubs:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const fetchClubsStats = async () => {
    try {
      const data = await clubs.getStats()
      if (data && data.stats) {
        setClubsStats(data.stats)
      } else {
        console.error('Invalid clubs stats response:', data)
        // Set default values if response is invalid
        setClubsStats({
          total: 0,
          usingVeo: 0,
          notUsingVeo: 0,
          counties: 0,
          provinces: 0
        })
      }
    } catch (err: any) {
      console.error('Failed to fetch clubs stats:', err)
      // Set default values on error
      setClubsStats({
        total: 0,
        usingVeo: 0,
        notUsingVeo: 0,
        counties: 0,
        provinces: 0
      })
    }
  }

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/')
      return
    }

    const init = async () => {
      await fetchUserData()
      await fetchStats()
      await fetchClubsStats()
      setLoading(false)
    }

    init()
  }, [router])

  useEffect(() => {
    if (!loading && user?.role === 'admin') {
      if (activeTab === 'games') {
        fetchGames()
      } else if (activeTab === 'teams') {
        fetchTeams()
      } else if (activeTab === 'users') {
        // Fetch teams first when users tab is opened
        fetchTeams()
      } else if (activeTab === 'clubs') {
        fetchClubs()
      }
    }
  }, [loading, user, activeTab, clubsFilter])

  // Fetch users when team selection changes
  useEffect(() => {
    if (!loading && user?.role === 'admin' && activeTab === 'users') {
      if (selectedTeamId) {
        fetchUsers(selectedTeamId)
      } else {
        setUsers([]) // Clear users if no team selected
      }
    }
  }, [selectedTeamId, activeTab, loading, user])

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

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-[#2D8B4D]" />
                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              </div>
              <p className="text-gray-400">Manage all games, teams, and users</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'games', label: 'Games' },
                { id: 'teams', label: 'Teams' },
                { id: 'users', label: 'Users' },
                { id: 'clubs', label: 'Clubs Using Veo' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any)
                    // Reset team selection when switching away from users tab
                    if (tab.id !== 'users') {
                      setSelectedTeamId('')
                    }
                    // Reset clubs filter when switching away from clubs tab
                    if (tab.id !== 'clubs') {
                      setClubsFilter('all')
                    }
                  }}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-[#2D8B4D] border-b-2 border-[#2D8B4D]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm font-medium">Total Users</h3>
                    <Users className="w-5 h-5 text-[#2D8B4D]" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                </div>
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm font-medium">Total Teams</h3>
                    <Gamepad2 className="w-5 h-5 text-[#2D8B4D]" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalTeams}</p>
                </div>
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm font-medium">Total Games</h3>
                    <TrendingUp className="w-5 h-5 text-[#2D8B4D]" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
                </div>
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-400 text-sm font-medium">Using VEO</h3>
                    <Video className="w-5 h-5 text-[#2D8B4D]" />
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {clubsStats ? clubsStats.usingVeo : 0}
                  </p>
                </div>
              </div>
            )}

            {/* Games Tab */}
            {activeTab === 'games' && (
              <div>
                {dataLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#2D8B4D]" />
                  </div>
                ) : (
                  <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Title</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Team</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Created By</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {games.map((game) => (
                            <tr key={game.id} className="hover:bg-white/5">
                              <td className="px-6 py-4 text-sm text-white">{game.title}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">{game.team_name || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">{game.created_by_email || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  game.status === 'analyzed' ? 'bg-green-900/50 text-green-300' :
                                  game.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300' :
                                  'bg-gray-900/50 text-gray-300'
                                }`}>
                                  {game.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                {new Date(game.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {games.length === 0 && (
                      <div className="text-center py-12 text-gray-400">No games found</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Teams Tab */}
            {activeTab === 'teams' && (
              <div>
                {dataLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#2D8B4D]" />
                  </div>
                ) : (
                  <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Created By</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Members</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Games</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {teams.map((team) => (
                            <tr key={team.id} className="hover:bg-white/5">
                              <td className="px-6 py-4 text-sm text-white">{team.name}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">{team.created_by_email || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">{team.member_count || 0}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">{team.game_count || 0}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                {new Date(team.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {teams.length === 0 && (
                      <div className="text-center py-12 text-gray-400">No teams found</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                {/* Team Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Team
                  </label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2 bg-black/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2D8B4D] focus:border-transparent"
                  >
                    <option value="">-- Select a team --</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.member_count || 0} members)
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedTeamId ? (
                  <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-12 text-center">
                    <Users className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-400">Please select a team to view its members</p>
                  </div>
                ) : dataLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#2D8B4D]" />
                  </div>
                ) : (
                  <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Team Role</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Games</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Joined Team</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {users.map((u) => (
                            <tr key={u.id} className="hover:bg-white/5">
                              <td className="px-6 py-4 text-sm text-white">{u.email}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">{u.name || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  u.role === 'admin' ? 'bg-[#2D8B4D]/50 text-green-300' :
                                  'bg-gray-900/50 text-gray-300'
                                }`}>
                                  {u.role || 'user'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  u.team_role === 'admin' ? 'bg-blue-900/50 text-blue-300' :
                                  'bg-gray-900/50 text-gray-300'
                                }`}>
                                  {u.team_role || 'member'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">{u.game_count || 0}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                {u.team_joined_at ? new Date(u.team_joined_at).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {users.length === 0 && (
                      <div className="text-center py-12 text-gray-400">No users found in this team</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Clubs Tab */}
            {activeTab === 'clubs' && (
              <div>
                {/* Stats Cards */}
                {clubsStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                      <div className="text-gray-400 text-sm mb-1">Total Clubs</div>
                      <div className="text-2xl font-bold text-white">{clubsStats.total.toLocaleString()}</div>
                    </div>
                    <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                      <div className="text-gray-400 text-sm mb-1">Using VEO</div>
                      <div className="text-2xl font-bold text-green-400">{clubsStats.usingVeo.toLocaleString()}</div>
                    </div>
                    <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                      <div className="text-gray-400 text-sm mb-1">Not Using VEO</div>
                      <div className="text-2xl font-bold text-gray-400">{clubsStats.notUsingVeo.toLocaleString()}</div>
                    </div>
                    <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                      <div className="text-gray-400 text-sm mb-1">Counties</div>
                      <div className="text-2xl font-bold text-white">{clubsStats.counties}</div>
                    </div>
                  </div>
                )}

                {/* Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Filter by VEO Usage
                  </label>
                  <select
                    value={clubsFilter}
                    onChange={(e) => setClubsFilter(e.target.value as any)}
                    className="w-full sm:w-auto px-4 py-2 bg-black/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
                  >
                    <option value="all">All Clubs</option>
                    <option value="veo">Using VEO</option>
                    <option value="no-veo">Not Using VEO</option>
                  </select>
                </div>

                {dataLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#2D8B4D]" />
                  </div>
                ) : (
                  <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Club Name</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">County</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Province</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">VEO Status</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Recordings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {clubsList.map((club) => (
                            <tr key={club.id} className="hover:bg-white/5">
                              <td className="px-6 py-4 text-sm text-white font-medium">{club.club_name}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">{club.county || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">{club.province || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm">
                                {club.uses_veo ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-900/50 text-green-300">
                                    <Video className="w-3 h-3" />
                                    Using VEO
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-900/50 text-gray-300">
                                    Not Using VEO
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                {club.uses_veo && club.veo_recordings ? club.veo_recordings : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {clubsList.length === 0 && (
                      <div className="text-center py-12 text-gray-400">No clubs found</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

