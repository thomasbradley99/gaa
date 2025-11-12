import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  updateMember, 
  deleteMember 
} from '@/lib/api/generated/sdk.gen'
import type { 
  UpdateMemberRequest, 
  Member 
} from '@/lib/api/generated/types.gen'

// Query Keys
export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (teamId: string, filters?: Record<string, any>) => [...memberKeys.lists(), teamId, { filters }] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
}

// Update member
export function useUpdateMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (params: { id: string; teamId: string; memberData: UpdateMemberRequest }): Promise<Member> => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await updateMember({
        client: client,
        path: { id: params.id },
        query: { teamId: params.teamId },
        body: params.memberData
      })
      
      if (!result.data?.data) {
        throw new Error('Invalid response from update member API')
      }
      
      return result.data.data
    },
    onSuccess: (updatedMember, variables) => {
      // Invalidate and refetch member details
      queryClient.invalidateQueries({ 
        queryKey: memberKeys.detail(variables.id) 
      })
      
      // Invalidate members lists to refresh member data
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
      
      // Update cache
      if (updatedMember?.id) {
        queryClient.setQueryData(memberKeys.detail(updatedMember.id), updatedMember)
      }
    },
  })
}

// Delete member
export function useDeleteMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (params: { id: string; teamId: string }) => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await deleteMember({
        client: client,
        path: { id: params.id },
        query: { teamId: params.teamId }
      })
      
      return result.data
    },
    onSuccess: (_, params) => {
      // Remove member from cache
      queryClient.removeQueries({ queryKey: memberKeys.detail(params.id) })
      
      // Invalidate members lists
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() })
    },
  })
} 