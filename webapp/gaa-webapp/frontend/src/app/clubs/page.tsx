'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, clubs, getToken } from '@/lib/api-client'
import Sidebar from '@/components/shared/Sidebar'
import { Building2, Loader2, MapPin, Video, Users } from 'lucide-react'

export default function ClubsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [clubsList, setClubsList] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [counties, setCounties] = useState<string[]>([])
  const [provinces, setProvinces] = useState<string[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'veo' | 'no-veo'>('all')
  const [selectedCounty, setSelectedCounty] = useState<string>('')
  const [selectedProvince, setSelectedProvince] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const fetchUserData = async () => {
    try {
      const userData = await auth.me()
      setUser(userData.user)
    } catch (err) {
      router.push('/')
    }
  }

  const fetchStats = async () => {
    try {
      const data = await clubs.getStats()
      setStats(data.stats)
    } catch (err: any) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const fetchCounties = async () => {
    try {
      const data = await clubs.getCounties()
      setCounties(data.counties || [])
    } catch (err: any) {
      console.error('Failed to fetch counties:', err)
    }
  }

  const fetchProvinces = async () => {
    try {
      const data = await clubs.getProvinces()
      setProvinces(data.provinces || [])
    } catch (err: any) {
      console.error('Failed to fetch provinces:', err)
    }
  }

  const fetchClubs = async () => {
    setDataLoading(true)
    try {
      const filters: any = {}
      if (filter === 'veo') filters.usesVeo = 'true'
      if (filter === 'no-veo') filters.usesVeo = 'false'
      if (selectedCounty) filters.county = selectedCounty
      if (selectedProvince) filters.province = selectedProvince
      if (searchQuery) filters.search = searchQuery

      const data = await clubs.list(filters)
      setClubsList(data.clubs || [])
    } catch (err: any) {
      console.error('Failed to fetch clubs:', err)
    } finally {
      setDataLoading(false)
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
      await fetchCounties()
      await fetchProvinces()
      setLoading(false)
    }

    init()
  }, [router])

  useEffect(() => {
    if (!loading && user) {
      fetchClubs()
    }
  }, [loading, user, filter, selectedCounty, selectedProvince, searchQuery])

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
                <Building2 className="w-8 h-8 text-[#2D8B4D]" />
                <h1 className="text-3xl font-bold text-white">GAA Clubs</h1>
              </div>
              <p className="text-gray-400">View all GAA clubs and filter by VEO usage</p>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                  <div className="text-gray-400 text-sm mb-1">Total Clubs</div>
                  <div className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</div>
                </div>
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                  <div className="text-gray-400 text-sm mb-1">Using VEO</div>
                  <div className="text-2xl font-bold text-green-400">{stats.usingVeo.toLocaleString()}</div>
                </div>
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                  <div className="text-gray-400 text-sm mb-1">Not Using VEO</div>
                  <div className="text-2xl font-bold text-gray-400">{stats.notUsingVeo.toLocaleString()}</div>
                </div>
                <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                  <div className="text-gray-400 text-sm mb-1">Counties</div>
                  <div className="text-2xl font-bold text-white">{stats.counties}</div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* VEO Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    VEO Usage
                  </label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="w-full px-4 py-2 bg-black/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
                  >
                    <option value="all">All Clubs</option>
                    <option value="veo">Using VEO</option>
                    <option value="no-veo">Not Using VEO</option>
                  </select>
                </div>

                {/* County Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    County
                  </label>
                  <select
                    value={selectedCounty}
                    onChange={(e) => setSelectedCounty(e.target.value)}
                    className="w-full px-4 py-2 bg-black/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
                  >
                    <option value="">All Counties</option>
                    {counties.map((county) => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                </div>

                {/* Province Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Province
                  </label>
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="w-full px-4 py-2 bg-black/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
                  >
                    <option value="">All Provinces</option>
                    {provinces.map((province) => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Club name..."
                    className="w-full px-4 py-2 bg-black/60 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
                  />
                </div>
              </div>
            </div>

            {/* Clubs List */}
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
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase">Pitch</th>
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
                          <td className="px-6 py-4 text-sm text-gray-400">{club.pitch_name || 'N/A'}</td>
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
        </div>
      </div>
    </div>
  )
}

