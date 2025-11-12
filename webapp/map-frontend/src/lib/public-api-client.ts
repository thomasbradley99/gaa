'use client';

import { createClient } from '@/lib/api/generated/client/client';
import { createConfig } from '@/lib/api/generated/client/utils';
import { getPublicGameVideos } from '@/lib/api/generated/sdk.gen';

const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_NO_AUTH_API_BASE_URL;

console.log('PUBLIC_API_BASE_URL:', PUBLIC_API_BASE_URL);

if (!PUBLIC_API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_NO_AUTH_API_BASE_URL is not set');
}

// Create a public client instance without auth interceptors
export const publicClient = createClient(createConfig({
  baseUrl: PUBLIC_API_BASE_URL,
}));

// Add request/response logging to the client
publicClient.interceptors.request.use((request) => {
  console.log('🚀 PUBLIC API REQUEST:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.body
  });
  return request;
});

publicClient.interceptors.response.use((response) => {
  console.log('✅ PUBLIC API RESPONSE:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    url: response.url
  });
  return response;
});

export async function getPublicGameVideosFromSDK(gameId: string) {
  console.log('getPublicGameVideosFromSDK called with gameId:', gameId);
  console.log('publicClient:', publicClient);
  
  try {
    console.log('About to call getPublicGameVideos SDK function...');
    const result = await getPublicGameVideos({
      client: publicClient,
      path: { gameId }
    });
    console.log('SDK call completed, result:', result);
    console.log('Full result.data:', JSON.stringify(result.data, null, 2));
    
    const videos = result.data?.videos || [];
    console.log('Extracted videos:', videos);
    console.log('Videos array length:', videos.length);
    return videos;
  } catch (error) {
    console.error('Error in getPublicGameVideosFromSDK:', error);
    throw error;
  }
} 