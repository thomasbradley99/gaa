import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  listTeams, 
  createTeam, 
  getTeam, 
  updateTeam, 
  deleteTeam 
} from '@/lib/api/generated/sdk.gen'
import type { 
  CreateTeamRequest, 
  UpdateTeamRequest, 
  Team 
} from '@/lib/api/generated/types.gen'

// Query Keys
export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...teamKeys.lists(), { filters }] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
  byInviteCode: (code: string) => [...teamKeys.all, 'invite-code', code] as const,
}

// List teams with pagination and filters
export function useTeams(params?: {
  limit?: number;
  nextToken?: string;
  sortOrder?: 'asc' | 'desc';
  status?: 'active' | 'inactive' | 'archived';
  sport?: string;
}) {
  return useQuery({
    queryKey: teamKeys.list(params),
    queryFn: async () => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await listTeams({
        client: client,
        query: params
      })
      
      return result.data?.data || { result: [] }
    },
  })
}

// Get team by ID
export function useTeam(id: string) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: async () => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await getTeam({
        client: client,
        path: { id }
      })
      
      return result.data?.data
    },
    enabled: !!id,
  })
}

// Create team
export function useCreateTeam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (teamData: CreateTeamRequest): Promise<Team> => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await createTeam({
        client: client,
        body: teamData
      })
      
      if (!result.data?.data) {
        throw new Error('Invalid response from create team API')
      }
      
      return result.data.data
    },
    onSuccess: (newTeam) => {
      // Invalidate teams list
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() })
      
      // Add to cache if we have the team data
      if (newTeam?.id) {
        queryClient.setQueryData(teamKeys.detail(newTeam.id), newTeam)
      }
    },
  })
}

// Update team
export function useUpdateTeam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, teamData }: { id: string; teamData: UpdateTeamRequest }): Promise<Team> => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await updateTeam({
        client: client,
        path: { id },
        body: teamData
      })
      
      if (!result.data?.data) {
        throw new Error('Invalid response from update team API')
      }
      
      return result.data.data
    },
    onSuccess: (updatedTeam, variables) => {
      // Invalidate and refetch team details
      queryClient.invalidateQueries({ 
        queryKey: teamKeys.detail(variables.id) 
      })
      
      // Invalidate teams list
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() })
      
      // Update cache
      if (updatedTeam?.id) {
        queryClient.setQueryData(teamKeys.detail(updatedTeam.id), updatedTeam)
      }
    },
  })
}

// Delete team
export function useDeleteTeam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await deleteTeam({
        client: client,
        path: { id }
      })
      
      return result.data
    },
    onSuccess: (_, id) => {
      // Remove team from cache
      queryClient.removeQueries({ queryKey: teamKeys.detail(id) })
      
      // Invalidate teams list
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() })
    },
  })
}

// Leave team (remove current user from team)
export function useLeaveTeam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (params: { teamId: string; memberId: string }) => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      // Note: This would need to be implemented in the generated SDK
      // For now, we'll use a direct API call similar to the original implementation
      const response = await fetch(`/api/members/${params.memberId}?teamId=${params.teamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await import('aws-amplify/auth')).fetchAuthSession().then(s => s.tokens?.idToken?.toString())}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to leave team')
      }
      
      return response.json()
    },
    onSuccess: (_, params) => {
      // Invalidate teams list
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() })
      
      // Remove team from cache if it's the current team
      queryClient.removeQueries({ queryKey: teamKeys.detail(params.teamId) })
    },
  })
} 