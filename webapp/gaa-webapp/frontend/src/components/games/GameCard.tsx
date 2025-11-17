'use client'

import { useRouter } from 'next/navigation'
import { Play, Clock, Users } from 'lucide-react'

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
  }
}

export default function GameCard({ game }: GameCardProps) {
  const router = useRouter()
  
  // 🔍 DEBUG LOG
  console.log('🎴 GameCard rendering:', game.title)
  console.log('   Full URL:', game.thumbnail_url)

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
        <div className="flex items-center gap-4 text-xs text-gray-400">
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
      </div>
    </div>
  )
}

