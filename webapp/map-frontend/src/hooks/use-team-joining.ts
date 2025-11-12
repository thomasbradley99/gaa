import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  joinTeam, 
  verifyInviteCode 
} from '@/lib/api/generated/sdk.gen'
import type { 
  JoinTeamData, 
  VerifyInviteCodeResponse,
  JoinTeamResponse 
} from '@/lib/api/generated/types.gen'

// Query Keys
export const teamJoiningKeys = {
  all: ['team-joining'] as const,
  verify: (code: string) => [...teamJoiningKeys.all, 'verify', code] as const,
}

// Verify invite code
export function useVerifyInviteCode(code: string) {
  return useQuery({
    queryKey: teamJoiningKeys.verify(code),
    queryFn: async () => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await verifyInviteCode({
        client: client,
        path: { code }
      })
      
      return result.data?.data
    },
    enabled: !!code,
  })
}

// Join team
export function useJoinTeam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (inviteCode: string): Promise<JoinTeamResponse> => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await joinTeam({
        client: client,
        body: { inviteCode }
      })
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to join team')
      }
      
      return result.data
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
} 