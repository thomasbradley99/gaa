'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, teams, games, getToken } from '@/lib/api-client'
import Sidebar from '@/components/shared/Sidebar'
import UploadSection from '@/components/games/UploadSection'
import GameCard from '@/components/games/GameCard'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userTeams, setUserTeams] = useState<any[]>([])
  const [gamesList, setGamesList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [gamesLoading, setGamesLoading] = useState(false)
  const [error, setError] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)

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

  const fetchGames = async () => {
    setGamesLoading(true)
    setError('')
    try {
      // Fetch games for user's team (if they have one)
      const teamId = userTeams.length > 0 ? userTeams[0].id : undefined
      const data = await games.list(teamId)
      
      // 🔍 DEBUG LOGS
      console.log('📦 API Response:', data)
      console.log('📦 Number of games:', data.games?.length || 0)
      data.games?.forEach((game: any, index: number) => {
        console.log(`🎮 Game ${index + 1}:`, {
          id: game.id,
          title: game.title,
          thumbnail_key: game.thumbnail_key,
          thumbnail_url: game.thumbnail_url,
          has_thumbnail: !!game.thumbnail_url
        })
      })
      
      setGamesList(data.games || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load games')
      console.error('Failed to fetch games:', err)
    } finally {
      setGamesLoading(false)
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
      await fetchTeams()
      setLoading(false)
    }

    init()
  }, [router])

  useEffect(() => {
    if (!loading && user && userTeams.length > 0) {
      fetchGames()
    }
  }, [loading, user, userTeams])

  const handleGameCreated = () => {
    fetchGames()
    setShowUploadForm(false)
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

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Header with Upload Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Matches</h1>
                <p className="text-sm sm:text-base text-gray-400">Manage and analyze your GAA matches</p>
              </div>
              {userTeams.length > 0 && (
                <button
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className="w-full sm:w-auto px-6 py-3 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Match
                </button>
              )}
            </div>

            {/* Upload Form (Collapsible) */}
            {showUploadForm && userTeams.length > 0 && (
              <div className="mb-8">
                <UploadSection 
                  teamId={userTeams[0].id} 
                  teamName={userTeams[0].name}
                  onGameCreated={handleGameCreated} 
                />
              </div>
            )}

            {/* No Team Message */}
            {userTeams.length === 0 && (
              <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-8 text-center mb-8">
                <p className="text-gray-400 mb-4">
                  You need to create or join a squad before adding matches.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push('/select-team')}
                    className="px-6 py-3 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 text-white font-semibold rounded-xl transition-colors"
                  >
                    Select Team by Color
                  </button>
                  <button
                    onClick={() => router.push('/team')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
                  >
                    Create or Join Squad
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-8 p-4 bg-red-900/50 border border-red-700 rounded-xl text-red-200">
                {error}
              </div>
            )}

            {/* Matches Grid */}
            {gamesLoading ? (
              <div className="text-center py-12">
                <img 
                  src="/clann-logo-white.png" 
                  alt="Loading" 
                  className="w-12 h-12 mx-auto animate-pulse"
                />
              </div>
            ) : gamesList.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">No matches yet</div>
                <p className="text-gray-500 text-sm">
                  {userTeams.length === 0
                    ? 'Create or join a squad to get started'
                    : 'Add your first match using the form above'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gamesList.map((game) => (
                  <GameCard 
                    key={game.id} 
                    game={game} 
                    onTeamSelected={() => {
                      fetchTeams()
                      fetchGames()
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
