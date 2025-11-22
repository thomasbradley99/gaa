'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Clock, Users, Check } from 'lucide-react'
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
  userTeam?: {
    id: string
    primary_color?: string
    secondary_color?: string
  } | null
}

export default function GameCard({ game, onTeamSelected, userTeam }: GameCardProps) {
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
  
  // Map color names to hex values
  const colorNameToHex = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      'white': '#FFFFFF',
      'black': '#000000',
      'red': '#DC143C',
      'blue': '#0066CC',
      'green': '#016F32',
      'yellow': '#FFD700',
      'orange': '#FF6600',
      'purple': '#800080',
      'pink': '#FFC0CB',
      'gray': '#808080',
      'grey': '#808080',
      'brown': '#8B4513',
      'navy': '#1B365D',
      'maroon': '#8B0000',
      'gold': '#FFD700',
      'silver': '#C0C0C0',
      'amber': '#FFB300',
      'saffron': '#FFB300',
      'sky blue': '#87CEEB',
    }
    
    const colorLower = colorName.toLowerCase().trim()
    
    // Direct match
    if (colorMap[colorLower]) {
      return colorMap[colorLower]
    }
    
    // Check if it's already a hex color
    if (colorLower.startsWith('#')) {
      return colorName
    }
    
    // Try partial matches
    for (const [key, value] of Object.entries(colorMap)) {
      if (colorLower.includes(key) || key.includes(colorLower)) {
        return value
      }
    }
    
    // Default fallback - try to parse as hex or return a default
    return colorLower.startsWith('#') ? colorLower : '#016F32'
  }

  // Normalize hex color (ensure # prefix and uppercase)
  const normalizeHexColor = (color: string): string => {
    if (!color) return ''
    let normalized = color.trim()
    if (!normalized.startsWith('#')) {
      normalized = '#' + normalized
    }
    return normalized.toLowerCase()
  }

  // Check if a color matches the user's team color
  const isUserTeamColor = (color: string): boolean => {
    if (!userTeam?.primary_color || !color) return false
    
    // Normalize both colors to hex and compare
    const userColorHex = normalizeHexColor(userTeam.primary_color)
    const detectedColorHex = normalizeHexColor(colorNameToHex(color))
    
    // Direct hex match
    if (detectedColorHex === userColorHex) return true
    
    // Also check secondary color
    if (userTeam.secondary_color) {
      const userSecondaryHex = normalizeHexColor(userTeam.secondary_color)
      if (detectedColorHex === userSecondaryHex) return true
    }
    
    return false
  }

  const handleColorClick = async (e: React.MouseEvent, color: string) => {
    e.stopPropagation() // Prevent card click
    
    if (!color) return
    
    setSelectingTeam(color)
    
    try {
      // Get user's current team
      const userTeamsResponse = await teams.list()
      const userTeams = userTeamsResponse.teams || []
      
      if (userTeams.length === 0) {
        alert('You need to create or join a team first. Go to the Team page to set one up.')
        setSelectingTeam(null)
        return
      }
      
      // Update the user's first team with the selected color
      const currentTeam = userTeams[0]
      const hexColor = colorNameToHex(color)
      
      // Update team colors - set primary color to selected color
      // Note: This requires admin status - will show error if user isn't admin
      await teams.updateTeamColors(currentTeam.id, {
        primary_color: hexColor,
        secondary_color: currentTeam.secondary_color || null,
      })
      
      // Refresh the team list if callback is provided
      if (onTeamSelected) {
        onTeamSelected()
      } else {
        // Show success message
        alert(`Team color updated to ${color}!`)
      }
    } catch (err: any) {
      console.error('Failed to update team color:', err)
      // More specific error handling
      if (err.status === 403) {
        alert('Only team admins can update team colors. Contact your team admin or go to the Team page to set your color.')
      } else if (err.status === 404) {
        alert('Team not found. Please refresh the page.')
      } else {
        alert(err.message || 'Failed to update team color. Please try again.')
      }
    } finally {
      setSelectingTeam(null)
    }
  }
  
  const getColorName = (color: string) => {
    // Convert color string to display name
    // If it's already a formatted string like "Green and White striped", just capitalize first letter
    // If it's a simple color like "green", capitalize it
    if (!color) return ''
    
    // Check if it's already a mixed color (contains "and" or multiple words)
    if (color.includes(' and ') || color.includes(' & ') || color.includes(' striped') || color.includes(' with ')) {
      // Capitalize first letter of each word while preserving the rest
      return color
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }
    
    // Simple color - just capitalize first letter
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()
  }
  
  // Get color emoji for display
  const getColorEmoji = (colorName: string): string => {
    const lower = colorName.toLowerCase().trim()
    const emojiMap: { [key: string]: string } = {
      'black': '⚫',
      'white': '⚪',
      'red': '🔴',
      'blue': '🔵',
      'green': '🟢',
      'yellow': '🟡',
      'gold': '🟡',
      'orange': '🟠',
      'purple': '🟣',
      'grey': '⚪',
      'gray': '⚪',
      'navy': '🔵',
      'maroon': '🔴',
    }
    
    // For mixed colors, return multiple emojis
    const emojis: string[] = []
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (lower.includes(key)) {
        emojis.push(emoji)
      }
    }
    
    return emojis.length > 0 ? emojis.join(' ') : '⚫'
  }

  const getColorStyle = (colorName: string) => {
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
      'grey': '#808080',
      'gray': '#808080',
    }
    
    const lower = colorName.toLowerCase().trim()
    
    // If it's already a hex code, use it as background
    if (colorName.startsWith('#')) {
      return { backgroundColor: colorName }
    }
    
    // For mixed/striped colors, keep background black
    if (lower.includes(' striped') || lower.includes(' and ') || lower.includes(' & ')) {
      return { backgroundColor: '#000000' }
    }
    
    // Simple color - map from color name
    if (colorMap[lower]) {
      return { backgroundColor: colorMap[lower] }
    }
    
    // Try partial match for simple colors
    for (const [key, value] of Object.entries(colorMap)) {
      if (lower.includes(key) && !lower.includes(' and ') && !lower.includes(' & ')) {
        return { backgroundColor: value }
      }
    }
    
    // Fallback - black background
    return { backgroundColor: '#000000' }
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
                  className="relative flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 hover:border-[#2D8B4D]/50 flex items-center justify-center gap-1.5"
                  style={{
                    ...getColorStyle(detectedColors.home),
                    color: '#ffffff'
                  }}
                >
                  {selectingTeam === detectedColors.home ? (
                    'Selecting...'
                  ) : (
                    <>
                      <span className="text-base mr-1.5">{getColorEmoji(detectedColors.home)}</span>
                      <span className="text-white">
                        {getColorName(detectedColors.home)}
                      </span>
                      {isUserTeamColor(detectedColors.home) && (
                        <Check className="w-3 h-3 ml-1" strokeWidth={3} />
                      )}
                    </>
                  )}
                </button>
              )}
              {detectedColors.away && (
                <button
                  onClick={(e) => handleColorClick(e, detectedColors.away!)}
                  disabled={selectingTeam === detectedColors.away}
                  className="relative flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 hover:border-[#2D8B4D]/50 flex items-center justify-center gap-1.5"
                  style={{
                    ...getColorStyle(detectedColors.away),
                    color: '#ffffff'
                  }}
                >
                  {selectingTeam === detectedColors.away ? (
                    'Selecting...'
                  ) : (
                    <>
                      <span className="text-base mr-1.5">{getColorEmoji(detectedColors.away)}</span>
                      <span className="text-white">
                        {getColorName(detectedColors.away)}
                      </span>
                      {isUserTeamColor(detectedColors.away) && (
                        <Check className="w-3 h-3 ml-1" strokeWidth={3} />
                      )}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

