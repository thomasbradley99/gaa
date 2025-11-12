import { useQuery } from '@tanstack/react-query';
import { listGames } from '@/lib/api/generated/sdk.gen';
import { useAuth } from '@/contexts/auth-context';

// Public games hook for admin users
export function usePublicGames(params?: {
  limit?: number;
  nextToken?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['public-games', params],
    queryFn: async () => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      // Create the query parameters with the public flag
      const queryParams = {
        ...params,
        public: 'true' // This tells the API to return public games
      } as any; // Use any to bypass type checking for the public parameter
      
      const result = await listGames({
        client: client,
        query: queryParams
      });
      
      return result.data?.data || { result: [] };
    },
    enabled: !!user?.isAdmin && isAuthenticated, // Only enable for admin users
  });
} 