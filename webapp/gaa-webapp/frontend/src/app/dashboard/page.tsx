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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">Games</h1>
              <p className="text-gray-400">Manage and analyze your GAA games</p>
            </div>

            {/* Upload Section */}
            {userTeams.length > 0 ? (
              <UploadSection 
                teamId={userTeams[0].id} 
                teamName={userTeams[0].name}
                onGameCreated={handleGameCreated} 
              />
            ) : (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <p className="text-gray-400 mb-4">
                  You need to create or join a team before adding games.
                </p>
                <button
                  onClick={() => router.push('/team')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Go to Team Page
                </button>
              </div>
            )}


            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                {error}
              </div>
            )}

            {/* Games Grid */}
            {gamesLoading ? (
              <div className="text-center py-12">
                <div className="text-gray-400">Loading games...</div>
              </div>
            ) : gamesList.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">No games yet</div>
                <p className="text-gray-500 text-sm">
                  {userTeams.length === 0
                    ? 'Create or join a team to get started'
                    : 'Add your first game using the form above'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gamesList.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
