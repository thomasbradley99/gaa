"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGames } from '@/hooks/use-games'
import { useGameVideos } from '@/hooks/use-videos'
import { VideoUploadDialog } from '@/components/dashboard/dialogs/video-upload-dialog'
import { CreateGameDialog } from '@/components/dashboard/dialogs/create-game-dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Plus, Upload, Play, Monitor, MonitorOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BasketballDashboardProps {
  teamId?: string
}

export function BasketballDashboard({ teamId }: BasketballDashboardProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showVideoUploadDialog, setShowVideoUploadDialog] = useState(false)
  const [selectedGameForUpload, setSelectedGameForUpload] = useState<string | null>(null)
  const [fullscreenVideo, setFullscreenVideo] = useState<{ gameId: string; primaryVideoId: string; secondaryVideoId?: string } | null>(null)
  
  const router = useRouter()
  const { data: gamesData, isLoading } = useGames({ teamId })
  const games = gamesData?.result || []

  const handleCreateGame = () => {
    setShowCreateDialog(true)
  }

  const handleUploadVideo = (gameId: string) => {
    setSelectedGameForUpload(gameId)
    setShowVideoUploadDialog(true)
  }

  const handleViewDualCamera = (gameId: string, primaryVideoId: string, secondaryVideoId: string) => {
    router.push(`/dashboard/basketball/games/${gameId}/dual-video/${primaryVideoId}/${secondaryVideoId}`)
  }

  const handleViewSingleCamera = (gameId: string, videoId: string) => {
    router.push(`/dashboard/basketball/games/${gameId}/video/${videoId}`)
  }

  const GameActions = ({ gameId }: { gameId: string }) => {
    const { data: videos, isLoading } = useGameVideos(gameId)
    const videoList = videos || []
    const hasVideo = videoList.length > 0
    const readyVideos = videoList.filter(video => video.status === 'ready')
    const hasReadyVideos = readyVideos.length > 0
    const hasMultipleVideos = readyVideos.length >= 2

    const handleUploadClick = () => {
      handleUploadVideo(gameId)
    }

    const handleViewSingleClick = () => {
      if (readyVideos.length > 0) {
        handleViewSingleCamera(gameId, readyVideos[0].id || '')
      }
    }

    const handleViewDualClick = () => {
      if (readyVideos.length >= 2) {
        handleViewDualCamera(gameId, readyVideos[0].id || '', readyVideos[1].id || '')
      }
    }

    if (isLoading) {
      return (
        <Button 
          size="sm" 
          variant="outline" 
          disabled 
          className="h-auto py-3 flex-col gap-2"
        >
          <LoadingSpinner variant="inline" size="sm" />
          <span className="text-xs text-muted-foreground">Checking...</span>
        </Button>
      )
    }

    if (!hasVideo) {
      return (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleUploadClick}
          className="h-auto py-3 flex-col gap-2"
        >
          <Upload className="h-4 w-4" />
          <span className="text-xs">Upload Video</span>
        </Button>
      )
    }

    if (!hasReadyVideos) {
      return (
        <Button 
          size="sm" 
          variant="outline" 
          disabled 
          className="h-auto py-3 flex-col gap-2"
        >
          <LoadingSpinner variant="inline" size="sm" />
          <span className="text-xs text-muted-foreground">Processing...</span>
        </Button>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleViewSingleClick}
          className="h-auto py-3 flex-col gap-2"
        >
          <Monitor className="h-4 w-4" />
          <span className="text-xs">Single Camera</span>
        </Button>
        
        {hasMultipleVideos && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleViewDualClick}
            className="h-auto py-3 flex-col gap-2"
          >
            <MonitorOff className="h-4 w-4" />
            <span className="text-xs">Dual Camera</span>
            <Badge variant="secondary" className="text-xs">
              {readyVideos.length} feeds
            </Badge>
          </Button>
        )}
        
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleUploadClick}
          className="h-auto py-3 flex-col gap-2"
        >
          <Upload className="h-4 w-4" />
          <span className="text-xs">Add Video</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Basketball Analysis</h1>
          <p className="text-muted-foreground">Analyze basketball games with dual camera feeds</p>
        </div>
        <Button onClick={handleCreateGame}>
          <Plus className="h-4 w-4 mr-2" />
          Create Game
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basketball Games</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No basketball games found</p>
              <Button onClick={handleCreateGame}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Game
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <div key={game.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{game.opponentTeam || `Game ${game.id}`}</h3>
                    <p className="text-sm text-muted-foreground">
                      {game.gameType} • {game.venue?.name || 'No venue'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{game.status}</Badge>
                      {game.scheduledDate && (
                        <Badge variant="secondary">
                          {new Date(game.scheduledDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <GameActions gameId={game.id || ''} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateGameDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        teamId={teamId}
      />
      
      {selectedGameForUpload && (
        <VideoUploadDialog
          open={showVideoUploadDialog}
          onOpenChange={setShowVideoUploadDialog}
          teamId={teamId || ''}
          gameId={selectedGameForUpload}
          onUploadComplete={() => {
            setSelectedGameForUpload(null)
          }}
        />
      )}
    </div>
  )
} 