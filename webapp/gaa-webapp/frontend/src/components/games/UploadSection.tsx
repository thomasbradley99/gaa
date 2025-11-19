'use client'

import { useState } from 'react'
import { games } from '@/lib/api-client'
import clubsData from '@/components/pitch-finder/gaapitchfinder_data.json'

interface Club {
  Club: string
  County: string
  Province: string
  Code: string
}

const clubs: Club[] = clubsData as Club[]

interface UploadSectionProps {
  teamId: string
  teamName: string
  onGameCreated: () => void
}

export default function UploadSection({ teamId, teamName, onGameCreated }: UploadSectionProps) {
  const [videoUrl, setVideoUrl] = useState('')
  const [oppositionClub, setOppositionClub] = useState('')
  const [oppositionCounty, setOppositionCounty] = useState('')
  const [showOppositionDropdown, setShowOppositionDropdown] = useState(false)
  const [filteredClubs, setFilteredClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleOppositionChange = (value: string) => {
    setOppositionClub(value)
    if (value.trim()) {
      // Search all clubs
      let filtered = clubs.filter(club =>
        club.Club.toLowerCase().includes(value.toLowerCase())
      )
      
      // Remove duplicates by club name
      const uniqueClubs = filtered.reduce((acc: Club[], club) => {
        if (!acc.find(c => c.Club === club.Club)) {
          acc.push(club)
        }
        return acc
      }, [])
      
      setFilteredClubs(uniqueClubs.slice(0, 10)) // Show max 10
      setShowOppositionDropdown(true)
    } else {
      setShowOppositionDropdown(false)
    }
  }

  const selectOpposition = (club: Club) => {
    setOppositionClub(club.Club)
    setOppositionCounty(club.County)
    setShowOppositionDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!oppositionClub) {
      setError('Please select an opposition club')
      return
    }

    if (!videoUrl) {
      setError('Please provide a VEO URL')
      return
    }

    setLoading(true)

    try {
      // Auto-generate title from clubs
      const title = `${teamName} vs ${oppositionClub}`
      
      // Create game record
      await games.create({
        title,
        teamId,
        videoUrl,
      })

      // Reset form
      setVideoUrl('')
      setOppositionCounty('')
      setOppositionClub('')
      onGameCreated()
    } catch (err: any) {
      setError(err.message || 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-black/80 backdrop-blur-lg border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">Squad: <span className="text-white font-medium">{teamName}</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Opposition Club */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Opposition
          </label>
          <input
            type="text"
            value={oppositionClub}
            onChange={(e) => handleOppositionChange(e.target.value)}
            onFocus={() => oppositionClub && setShowOppositionDropdown(true)}
            onBlur={() => setTimeout(() => setShowOppositionDropdown(false), 200)}
            placeholder="Type club name..."
            className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
          />
          {oppositionCounty && (
            <p className="mt-1 text-xs text-gray-400">📍 {oppositionCounty}</p>
          )}
          {showOppositionDropdown && filteredClubs.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-[#0f0f0f] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filteredClubs.map((club, index) => (
                <button
                  key={`${club.Club}-${index}`}
                  type="button"
                  onClick={() => selectOpposition(club)}
                  className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors text-white text-sm border-b border-white/5 last:border-0"
                >
                  <div className="font-medium">{club.Club}</div>
                  <div className="text-xs text-gray-400">{club.County}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* VEO URL */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            VEO URL
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://veo.co/teams/123/matches/456"
            className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B4D]"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !oppositionClub || !videoUrl}
          className="w-full px-4 py-2 bg-[#2D8B4D] hover:bg-[#2D8B4D]/80 disabled:bg-black/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Adding Match...' : 'Add Match'}
        </button>
      </form>
    </div>
  )
}

