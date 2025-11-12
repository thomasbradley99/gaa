import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  listGames, 
  createGame, 
  getGame, 
  updateGame, 
  deleteGame 
} from '@/lib/api/generated/sdk.gen'
import type { 
  CreateGameRequest, 
  UpdateGameRequest, 
  Game 
} from '@/lib/api/generated/types.gen'

// Query Keys
export const gameKeys = {
  all: ['games'] as const,
  lists: () => [...gameKeys.all, 'list'] as const,
  list: (teamId: string, filters?: Record<string, any>) => [...gameKeys.lists(), teamId, { filters }] as const,
  details: () => [...gameKeys.all, 'detail'] as const,
  detail: (id: string) => [...gameKeys.details(), id] as const,
}

// Get game by ID
export function useGame(id: string) {
  return useQuery({
    queryKey: gameKeys.detail(id),
    queryFn: async () => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await getGame({
        client: client,
        path: { id }
      })
      
      return result.data?.data
    },
    enabled: !!id,
  })
}

// List games with pagination and filters
export function useGames(params?: {
  limit?: number;
  nextToken?: string;
  sortOrder?: 'asc' | 'desc';
  teamId?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  gameType?: 'league' | 'friendly' | 'tournament' | 'cup' | 'playoff';
  dateFrom?: string;
  dateTo?: string;
}) {
  const { teamId, ...filters } = params || {}
  
  return useQuery({
    queryKey: teamId 
      ? gameKeys.list(teamId, filters) 
      : [...gameKeys.all, 'list', filters],
    queryFn: async () => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await listGames({
        client: client,
        query: params
      })
      
      return result.data?.data || { result: [] }
    },
  })
}

// Create game
export function useCreateGame() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (gameData: CreateGameRequest): Promise<Game> => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await createGame({
        client: client,
        body: gameData
      })
      
      if (!result.data?.data) {
        throw new Error('Invalid response from create game API')
      }
      
      return result.data.data
    },
    onSuccess: (newGame) => {
      // Invalidate games list
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() })
      
      // Add to cache if we have the game data
      if (newGame?.id) {
        queryClient.setQueryData(gameKeys.detail(newGame.id), newGame)
      }
      
      // Invalidate team-specific games if teamId exists
      if (newGame?.teamId) {
        queryClient.invalidateQueries({ 
          queryKey: gameKeys.list(newGame.teamId) 
        })
      }
    },
  })
}

// Update game
export function useUpdateGame() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, gameData }: { id: string; gameData: UpdateGameRequest }): Promise<Game> => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await updateGame({
        client: client,
        path: { id },
        body: gameData
      })
      
      if (!result.data?.data) {
        throw new Error('Invalid response from update game API')
      }
      
      return result.data.data
    },
    onSuccess: (updatedGame, variables) => {
      // Invalidate and refetch game details
      queryClient.invalidateQueries({ 
        queryKey: gameKeys.detail(variables.id) 
      })
      
      // Invalidate games list
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() })
      
      // Update cache
      if (updatedGame?.id) {
        queryClient.setQueryData(gameKeys.detail(updatedGame.id), updatedGame)
      }
    },
  })
}

// Delete game
export function useDeleteGame() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await deleteGame({
        client: client,
        path: { id }
      })
      
      return result.data
    },
    onSuccess: (_, id) => {
      // Remove game from cache
      queryClient.removeQueries({ queryKey: gameKeys.detail(id) })
      
      // Invalidate games list
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() })
    },
  })
}