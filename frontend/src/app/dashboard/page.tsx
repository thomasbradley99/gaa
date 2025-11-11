'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, teams, games, getToken } from '@/lib/api-client'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/')
      return
    }

    // Fetch user data
    auth.me()
      .then((data) => {
        setUser(data.user)
        setLoading(false)
      })
      .catch(() => {
        router.push('/')
      })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user?.name || user?.email}!</h2>
          <p className="text-gray-400">Your GAA analysis dashboard is ready.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Teams</h3>
            <p className="text-gray-400">Manage your GAA teams</p>
            <button
              onClick={() => {
                // TODO: Implement team creation
                alert('Team creation coming soon!')
              }}
              className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md"
            >
              Create Team
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Games</h3>
            <p className="text-gray-400">View and analyze your games</p>
            <button
              onClick={() => {
                // TODO: Implement game creation
                alert('Game creation coming soon!')
              }}
              className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md"
            >
              Add Game
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

