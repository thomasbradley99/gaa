'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Clock, Users } from 'lucide-react'
import { teams } from '@/lib/api-client'

interface GameCardProps {
  game: {
    id: string
    title: string
    description?: string
    team_name?: string
    status: string
    thumbnail_url?: string
    duration?: number
    created_at: string
    metadata?: {
      teams?: {
        home_team?: {
          jersey_color: string
        }
        away_team?: {
          jersey_color: string
        }
      }
    }
  }
  onTeamSelected?: () => void
}

export default function GameCard({ game, onTeamSelected }: GameCardProps) {
  const router = useRouter()
  const [selectingTeam, setSelectingTeam] = useState<string | null>(null)
  
  // 🔍 DEBUG LOG
  console.log('🎴 GameCard rendering:', game.title)
  console.log('   Full URL:', game.thumbnail_url)
  
  // Extract detected team colors from metadata
  const detectedColors = game.metadata?.teams ? {
    home: game.metadata.teams.home_team?.jersey_color,
    away: game.metadata.teams.away_team?.jersey_color
  } : null
  
  const handleColorClick = async (e: React.MouseEvent, color: string) => {
    e.stopPropagation() // Prevent card click
    
    if (!color) return
    
    setSelectingTeam(color)
    
    try {
      // Find team with matching color
      const allTeams = await teams.listAll()
      const colorLower = color.toLowerCase().trim()
      
      // Match color name to team colors (flexible matching)
      const matchingTeam = allTeams.find((t: any) => {
        const primary = (t.primary_color || '').toLowerCase().trim()
        const secondary = (t.secondary_color || '').toLowerCase().trim()
        
        // Check if detected color matches primary or secondary
        return primary.includes(colorLower) || 
               colorLower.includes(primary) ||
               secondary.includes(colorLower) || 
               colorLower.includes(secondary) ||
               // Also check common color name variations
               (colorLower === 'black' && (primary === '#000000' || primary === 'black')) ||
               (colorLower === 'white' && (primary === '#ffffff' || primary === '#fff' || primary === 'white'))
      })
      
      if (matchingTeam) {
        await teams.joinById(matchingTeam.id)
        if (onTeamSelected) onTeamSelected()
      } else {
        // Could create a new team here, but for now just show error
        alert(`No team found with color "${color}". Please create a team with this color first.`)
      }
    } catch (err: any) {
      console.error('Failed to assign team:', err)
      alert(err.message || 'Failed to assign team')
    } finally {
      setSelectingTeam(null)
    }
  }
  
  const getColorName = (color: string) => {
    // Convert color string to display name
    return color.charAt(0).toUpperCase() + color.slice(1)
  }
  
  const getColorStyle = (colorName: string) => {
    // Convert color name to CSS color
    const colorMap: { [key: string]: string } = {
      'black': '#000000',
      'white': '#FFFFFF',
      'red': '#FF0000',
      'blue': '#0000FF',
      'green': '#008000',
      'yellow': '#FFFF00',
      'gold': '#FFD700',
      'orange': '#FFA500',
      'purple': '#800080',
      'navy': '#000080',
      'maroon': '#800000',
    }
    
    const lower = colorName.toLowerCase().trim()
    // If it's already a hex code, use it
    if (colorName.startsWith('#')) {
      return { backgroundColor: colorName }
    }
    // Otherwise map from color name
    return { backgroundColor: colorMap[lower] || colorName }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed':
        return 'bg-[#2D8B4D]' // Clann green for ready status
      case 'processing':
        return 'bg-[#2D8B4D]/70' // Clann green for processing
      case 'pending':
        return 'bg-yellow-600'
      case 'failed':
        return 'bg-red-600'
      default:
        return 'bg-gray-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'analyzed':
        return 'Ready'
      case 'processing':
        return 'Processing'
      case 'pending':
        return 'Pending'
      case 'failed':
        return 'Failed'
      default:
        return status
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div
      onClick={() => router.push(`/games/${game.id}`)}
      className="bg-black/80 backdrop-blur-lg rounded-xl overflow-hidden cursor-pointer hover:bg-black/90 transition-colors border border-white/10 hover:border-[#2D8B4D]/50"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-black/50">
        {game.thumbnail_url ? (
          <img
            src={game.thumbnail_url}
            alt={game.title}
            className="w-full h-full object-cover"
            onLoad={() => console.log('✅ Thumbnail loaded:', game.title)}
            onError={(e) => {
              console.error('❌ Thumbnail failed to load:', {
                title: game.title,
                url: game.thumbnail_url,
                error: e
              })
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-500" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-1 rounded text-xs font-semibold text-white ${getStatusColor(
              game.status
            )}`}
          >
            {getStatusLabel(game.status)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
          {game.title}
        </h3>
        {game.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
            {game.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
          {game.team_name && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{game.team_name}</span>
            </div>
          )}
          {game.duration && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(game.duration)}</span>
            </div>
          )}
          <span>{formatDate(game.created_at)}</span>
        </div>

        {/* Detected Team Colors - Display below thumbnail */}
        {detectedColors && (detectedColors.home || detectedColors.away) && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-gray-400 mb-2">Select your team color:</p>
            <div className="flex gap-2">
              {detectedColors.home && (
                <button
                  onClick={(e) => handleColorClick(e, detectedColors.home!)}
                  disabled={selectingTeam === detectedColors.home}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 hover:border-[#2D8B4D]/50"
                  style={{
                    ...getColorStyle(detectedColors.home),
                    color: detectedColors.home.toLowerCase().includes('white') ? '#000' : '#fff'
                  }}
                >
                  {selectingTeam === detectedColors.home ? 'Selecting...' : getColorName(detectedColors.home)}
                </button>
              )}
              {detectedColors.away && (
                <button
                  onClick={(e) => handleColorClick(e, detectedColors.away!)}
                  disabled={selectingTeam === detectedColors.away}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 hover:border-[#2D8B4D]/50"
                  style={{
                    ...getColorStyle(detectedColors.away),
                    color: detectedColors.away.toLowerCase().includes('white') ? '#000' : '#fff'
                  }}
                >
                  {selectingTeam === detectedColors.away ? 'Selecting...' : getColorName(detectedColors.away)}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

