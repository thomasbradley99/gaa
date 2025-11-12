"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTeam } from "@/contexts/team-context"
import { CreateGameDialog } from "@/components/dashboard/dialogs/create-game-dialog"
import { VideoUploadDialog } from "@/components/dashboard/dialogs/video-upload-dialog"
import { useGames } from "@/hooks/use-games"
import { useGameVideos } from "@/hooks/use-videos"
import { useDeleteGame } from "@/hooks/use-games"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { VideoPlayerWithEvents } from "@/components/video-player/VideoPlayerWithEvents"
import { 
  Calendar, 
  CalendarPlus, 
  Clock, 
  MapPin, 
  Trophy, 
  Video, 
  Upload, 
  Eye, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  PlayCircle, 
  X 
} from "lucide-react"
import { toast } from "sonner"

export function TeamGames() {
  const { selectedTeam } = useTeam();
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showVideoUploadDialog, setShowVideoUploadDialog] = useState(false);
  const [selectedGameForUpload, setSelectedGameForUpload] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<{ gameId: string; videoId: string } | null>(null);
  
  // Load games for this team
  const { data: gamesResponse, isLoading, error } = useGames({ 
    teamId: selectedTeam?.id,
    limit: 10 
  });
  
  const games = gamesResponse?.result || [];
  const deleteGame = useDeleteGame();

  if (!selectedTeam) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-info/10 text-info border-info/20';
      case 'in_progress': return 'bg-success/10 text-success border-success/20';
      case 'completed': return 'bg-muted/10 text-muted-foreground border-muted/20';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'postponed': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="h-4 w-4 text-info" />;
      case 'in_progress': return <PlayCircle className="h-4 w-4 text-success" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'postponed': return <AlertCircle className="h-4 w-4 text-warning" />;
      default: return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'postponed': return 'Postponed';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const handleDeleteGame = async (gameId: string, gameName: string) => {
    if (confirm(`Are you sure you want to delete the game vs ${gameName}? This action cannot be undone.`)) {
      try {
        await deleteGame.mutateAsync(gameId);
        toast.success("Game deleted successfully");
      } catch (error) {
        toast.error("Failed to delete game");
        console.error("Error deleting game:", error);
      }
    }
  };

  const handleViewGame = (gameId: string, videoId?: string) => {
    if (videoId) {
      // Navigate to the specific video page
      router.push(`/dashboard/games/${gameId}/video/${videoId}`);
    } else {
      // Navigate to the game page if no video available
      router.push(`/dashboard/games/${gameId}`);
    }
  };

  // Helper function to get the first ready video for a game
  const getFirstReadyVideo = (gameId: string) => {
    // This would need to be implemented based on your data structure
    // For now, we'll use the VideoStatus component's logic
    return null;
  };



  // Game actions component that handles both video status and view button
  const GameActions = ({ gameId }: { gameId: string }) => {
    const { data: videos, isLoading } = useGameVideos(gameId);
    const videoList = videos || [];
    const hasVideo = videoList.length > 0;
    const processingVideos = videoList.filter(video => video.status === 'processing');
    const readyVideos = videoList.filter(video => video.status === 'ready');
    const hasProcessingVideos = processingVideos.length > 0;
    const hasReadyVideos = readyVideos.length > 0;

    const handleUploadClick = () => {
      setSelectedGameForUpload(gameId);
      setShowVideoUploadDialog(true);
    };

    const handleViewClick = () => {
      if (videoList.length > 0) {
        // Prioritize ready videos, then processing, then any video
        const videoToView = readyVideos[0] || processingVideos[0] || videoList[0];
        setFullscreenVideo({ gameId, videoId: videoToView.id || '' });
      } else {
        router.push(`/dashboard/games/${gameId}`);
      }
    };

    const handleOpenFullPage = () => {
      if (videoList.length > 0) {
        const videoToView = readyVideos[0] || processingVideos[0] || videoList[0];
        router.push(`/dashboard/games/${gameId}/video/${videoToView.id}`);
      }
    };

    if (isLoading) {
      return (
        <Button 
          size="sm" 
          variant="outline" 
          disabled 
          className="h-auto py-3 flex-col gap-2 border-primary/30 bg-muted/50 border-muted/30"
        >
          <LoadingSpinner variant="inline" size="sm" />
          <span className="text-xs text-muted-foreground">Checking...</span>
        </Button>
      );
    }

    if (!hasVideo) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={handleUploadClick}
          className="h-auto py-3 flex-col gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs">Upload Video</span>
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleViewClick}
        className="h-auto py-3 flex-col gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
      >
        <Video className="h-5 w-5" />
        <span className="text-xs">View</span>
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Enhanced Header */}
      {/* Removed Games & Matches heading, description, and Add Game button from here */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle>Matches</CardTitle>
          </div>
          <div className="flex-1 flex justify-end">
            <Button 
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" 
              onClick={() => setShowCreateDialog(true)}
            >
              <CalendarPlus className="h-4 w-4" />
              Add Game
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mb-4">
                <LoadingSpinner variant="inline" size="lg" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Loading games...</h3>
              <p className="text-muted-foreground">Please wait while we fetch your game data</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20 mb-4">
                <Calendar className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Error loading games</h3>
              <p className="text-muted-foreground text-center max-w-md">
                There was a problem loading your games. Please try again.
              </p>
            </div>
          ) : games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border border-muted/30 mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No games scheduled</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Start by scheduling your first game or match to begin tracking your team's performance
              </p>
              <Button 
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" 
                onClick={() => setShowCreateDialog(true)}
              >
                <CalendarPlus className="h-4 w-4" />
                Add First Game
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {games.map((game) => (
                <div key={game.id} className="space-y-0">
                  <div className="flex items-center justify-between p-6 border border-border rounded-xl hover:bg-muted/30 transition-all duration-200 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                          {getStatusIcon(game.status)}
                          </div>
                          <h4 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                            vs {game.opponentTeam}
                          </h4>
                        </div>
                        {game.status !== 'scheduled' && (
                          <Badge className={`${getStatusColor(game.status)} border`} variant="secondary">
                            {getStatusDisplayName(game.status)}
                          </Badge>
                        )}
                        {game.gameType !== 'friendly' && (
                          <Badge variant="outline" className="bg-secondary/10 text-secondary-foreground border-secondary/20">
                            {game.gameType?.charAt(0).toUpperCase() + game.gameType?.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-muted/50 flex items-center justify-center">
                            <Clock className="h-3 w-3" />
                          </div>
                          {formatDate(game.scheduledDate)}
                        </div>
                        {game.venue?.name && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-muted/50 flex items-center justify-center">
                              <MapPin className="h-3 w-3" />
                            </div>
                            {game.venue.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {game.score && (
                        <div className="text-right mr-4">
                          <div className="font-bold text-xl text-foreground">
                            {game.score.home} - {game.score.away}
                          </div>
                          <div className="text-xs text-muted-foreground">Final Score</div>
                        </div>
                      )}
                      {game.id && (
                        <GameActions gameId={game.id} />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => game.id && game.opponentTeam && handleDeleteGame(game.id, game.opponentTeam)}
                        className="h-auto py-3 flex-col gap-2 border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50 transition-all duration-200 text-destructive hover:text-destructive"
                        disabled={deleteGame.isPending}
                      >
                        <Trash2 className="h-5 w-5" />
                        <span className="text-xs">{deleteGame.isPending ? 'Deleting...' : 'Delete'}</span>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Fullscreen Video Player */}
                  {fullscreenVideo?.gameId === game.id && fullscreenVideo && game.id && (
                    <div className="fixed inset-0 z-50 bg-black">
                      <VideoPlayerWithEvents
                        gameId={game.id}
                        videoId={fullscreenVideo.videoId || ''}
                        teamId={selectedTeam.id || ''}
                        className="h-screen w-screen"
                        showGameScoreBanner={true}
                        showVideoTimeline={true}
                        showVideoControls={true}
                        showEventsManager={true}
                        autoFullscreen={true}
                        onClose={() => setFullscreenVideo(null)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFullscreenVideo(null)}
                        className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white hover:bg-black hover:bg-opacity-70"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              {games.length >= 10 && (
                <div className="text-center pt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing latest 10 games
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Game Dialog */}
      <CreateGameDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        teamId={selectedTeam.id || ''}
      />

      {/* Video Upload Dialog */}
      {selectedGameForUpload && (
        <VideoUploadDialog
          open={showVideoUploadDialog}
          onOpenChange={setShowVideoUploadDialog}
          teamId={selectedTeam.id || ''}
          gameId={selectedGameForUpload}
          onUploadComplete={() => {
            // Optionally refresh the games list or show a success message
            setSelectedGameForUpload(null);
          }}
        />
      )}
    </div>
  );
} 