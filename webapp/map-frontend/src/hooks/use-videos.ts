import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { 
  getVideoSignedUrl, 
  createVideo, 
  getVideo, 
  updateVideo, 
  deleteVideo, 
  listVideos,
  uploadVideoFromUrl,
  pollTask
} from '@/lib/api/generated/sdk.gen'
import type { 
  Video, 
  CreateVideoRequest, 
  UpdateVideoRequest, 
  VideoUploadUrlResponse 
} from '@/lib/api/generated/types.gen'
import { getPublicGameVideosFromSDK } from '@/lib/public-api-client'

// Query Keys
export const videoKeys = {
  all: ['videos'] as const,
  lists: () => [...videoKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...videoKeys.lists(), { filters }] as const,
  details: () => [...videoKeys.all, 'detail'] as const,
  detail: (id: string) => [...videoKeys.details(), id] as const,
  gameVideos: (gameId: string) => [...videoKeys.all, 'game', gameId] as const,
}

// Hooks for video management

export function useVideos(
  gameId?: string, 
  status?: 'processing' | 'ready' | 'failed' | 'archived', 
  videoType?: 'highlight' | 'full_game' | 'training' | 'interview' | 'analysis' | 'other'
) {
  return useQuery({
    queryKey: videoKeys.list({ gameId, status, videoType }),
    queryFn: async () => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await listVideos({
        client: client, // Use our configured client with auth interceptors
        query: {
          ...(gameId && { gameId }),
          ...(status && { status }),
          ...(videoType && { videoType }),
        }
      })
      return result.data?.data?.result || []
    },
    enabled: true,
  })
}

export function useGameVideos(gameId: string) {
  return useQuery({
    queryKey: videoKeys.gameVideos(gameId),
    queryFn: async () => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await listVideos({
        client: client, // Use our configured client with auth interceptors
        query: { gameId }
      })
      return result.data?.data?.result || []
    },
    enabled: !!gameId,
  })
}

export function usePublicGameVideos(gameId: string) {
  console.log('usePublicGameVideos called with gameId:', gameId)
  return useQuery({
    queryKey: ['public', 'videos', 'game', gameId],
    queryFn: async () => {
      return await getPublicGameVideosFromSDK(gameId)
    },
    enabled: !!gameId,
  })
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: videoKeys.detail(id),
    queryFn: async () => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await getVideo({
        client: client, // Use our configured client with auth interceptors
        path: { id }
      })
      return result.data?.data
    },
    enabled: !!id,
  })
}

export function useVideoSignedUrl() {
  return useMutation({
    mutationFn: async ({ teamId, gameId, filename, isPublic = false }: { 
      teamId: string; 
      gameId: string; 
      filename: string;
      isPublic?: boolean;
    }): Promise<VideoUploadUrlResponse> => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await getVideoSignedUrl({
        client: client, // Use our configured client with auth interceptors
        path: { teamId, gameId },
        query: { 
          filename,
          ...(isPublic && { isPublic: 'true' })
        }
      })
      return result.data || {}
    },
  })
}

export function useUploadToS3() {
  return useMutation({
    mutationFn: async ({ 
      url, 
      file, 
      onProgress 
    }: { 
      url: string; 
      file: File; 
      onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void 
    }) => {
      return new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percentage = Math.round((event.loaded / event.total) * 100)
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage
            })
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.response, {
              status: xhr.status,
              statusText: xhr.statusText
            }))
          } else {
            reject(new Error(`Failed to upload file: ${xhr.statusText}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed due to network error'))
        })

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'))
        })

        xhr.open('PUT', url)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })
    },
  })
}

export function useCreateVideo() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (video: CreateVideoRequest): Promise<Video> => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await createVideo({
        client: client, // Use our configured client with auth interceptors
        body: video
      })
      
      console.log('🎬 Create video API response:', result);
      
      if (!result.data?.data) {
        throw new Error('Invalid response from create video API');
      }
      
      return result.data.data;
    },
    onSuccess: (newVideo) => {
      console.log('✅ Video created successfully:', newVideo);
      
      // Invalidate and refetch video lists
      queryClient.invalidateQueries({ queryKey: videoKeys.lists() })
      
      // Only invalidate gameVideos if gameId exists
      if (newVideo?.gameId) {
        queryClient.invalidateQueries({ queryKey: videoKeys.gameVideos(newVideo.gameId) })
      }
      
      // Add the new video to the detail cache
      if (newVideo?.id) {
        queryClient.setQueryData(videoKeys.detail(newVideo.id), newVideo)
      }
    },
    onError: (error) => {
      console.error('❌ Video creation failed:', error);
    },
  })
}

export function useUpdateVideo() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, video }: { id: string; video: UpdateVideoRequest }): Promise<Video> => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await updateVideo({
        client: client, // Use our configured client with auth interceptors
        path: { id },
        body: video
      })
      return result.data?.data!
    },
    onSuccess: (updatedVideo) => {
      // Update caches
      queryClient.invalidateQueries({ queryKey: videoKeys.lists() })
      if (updatedVideo.gameId) {
        queryClient.invalidateQueries({ queryKey: videoKeys.gameVideos(updatedVideo.gameId) })
      }
      if (updatedVideo.id) {
        queryClient.setQueryData(videoKeys.detail(updatedVideo.id), updatedVideo)
      }
    },
  })
}

export function useUpdateVideoWithMatchTimeMarkers() {
  const updateVideo = useUpdateVideo()
  
  return useMutation({
    mutationFn: async ({ videoId, matchTimeMarkers }: { 
      videoId: string; 
      matchTimeMarkers: { 
        firstHalfStart: number; 
        halfTime: number; 
        secondHalfStart: number; 
        fullTime: number; 
      } 
    }): Promise<Video> => {
      console.log('🏁 Updating video with match time markers:', { videoId, matchTimeMarkers })
      
      return updateVideo.mutateAsync({
        id: videoId,
        video: { matchTimeMarkers }
      })
    },
    onSuccess: (updatedVideo, variables) => {
      console.log('✅ Successfully updated video with match time markers:', variables.matchTimeMarkers)
    },
    onError: (error, variables) => {
      console.error('❌ Failed to update video with match time markers:', error, variables)
    },
  })
}

export function useDeleteVideo() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      await deleteVideo({
        client: client, // Use our configured client with auth interceptors
        path: { id }
      })
      return id
    },
    onSuccess: (deletedId) => {
      // Remove from caches
      queryClient.invalidateQueries({ queryKey: videoKeys.lists() })
      queryClient.removeQueries({ queryKey: videoKeys.detail(deletedId) })
    },
  })
}

// Hook to monitor video processing status and update when complete
// Upload or import video (file or URL)
export function useVideoUpload() {
  const getSignedUrl = useVideoSignedUrl();
  const uploadToS3 = useUploadToS3();
  const createVideoRecord = useCreateVideo();

  return useMutation({
    mutationFn: async ({
      file,
      videoUrl,
      teamId,
      gameId,
      isPublic = false,
      onProgress,
    }: {
      file?: File;
      videoUrl?: string;
      teamId: string;
      gameId: string;
      isPublic?: boolean;
      onProgress?: (progress: {
        stage: string;
        loaded?: number;
        total?: number;
        percentage: number;
      }) => void;
    }): Promise<Video> => {
      try {
        // Validate that either file or videoUrl is provided, but not both
        if (!file && !videoUrl) {
          throw new Error('Either file or videoUrl must be provided');
        }
        if (file && videoUrl) {
          throw new Error('Cannot provide both file and videoUrl');
        }

        if (file) {
          // File upload workflow using existing hooks
          onProgress?.({ stage: 'getting-url', percentage: 10 });

          // Get signed URL for upload
          const { url, key } = await getSignedUrl.mutateAsync({
            teamId,
            gameId,
            filename: file.name,
            isPublic,
          });

          if (!url || !key) {
            throw new Error('Failed to get upload URL');
          }

          onProgress?.({ stage: 'uploading', percentage: 20 });

          // Upload file to S3 with progress tracking
          await uploadToS3.mutateAsync({ 
            url, 
            file,
            onProgress: (uploadProgress) => {
              // Map upload progress to 20-80% range
              const mappedPercentage = 20 + Math.round((uploadProgress.percentage / 100) * 60);
              onProgress?.({
                stage: 'uploading',
                loaded: uploadProgress.loaded,
                total: uploadProgress.total,
                percentage: mappedPercentage
              });
            }
          });

          onProgress?.({ stage: 'creating-record', percentage: 90 });

          // Create video record
          const title = file.name.replace(/\.[^/.]+$/, "");
          const video = await createVideoRecord.mutateAsync({
            gameId,
            title,
            s3Key: key,
            s3Url: url.split('?')[0], // Remove query parameters to get clean S3 URL
            videoType: 'highlight',
            status: 'processing',
            fileSize: file.size,
            videoMetadata: {
              format: file.type.split('/')[1] || 'unknown',
            },
          });

          onProgress?.({ stage: 'complete', percentage: 100 });

          return video;
        } else if (videoUrl) {
          // URL upload workflow - use async endpoint
          onProgress?.({ stage: 'getting-url', percentage: 10 });

          // Import the configured client here to avoid circular imports
          const { client } = await import('@/lib/api-client');
          
          // Call the async upload endpoint using the generated SDK
          const response = await uploadVideoFromUrl({
            client: client,
            body: {
              gameId,
              videoUrl
            }
          });

          if (response.error) {
            throw new Error('Failed to start video upload from URL');
          }

          const result = response.data;

          onProgress?.({ stage: 'uploading', percentage: 50 });

          // Poll for task completion
          const taskId = result.taskId;
          // Poll every 5 seconds for up to 10 minutes
          const maxAttempts = 120; // 10 minutes / 5 seconds
          let attempts = 0;

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

            // Poll the task status using the generated SDK
            const pollResponse = await pollTask({
              client: client,
              path: { taskId }
            });

            if (pollResponse.error) {
              throw new Error('Failed to check upload status');
            }

            const taskStatus = pollResponse.data;

            if (taskStatus.status === 'completed') {
              onProgress?.({ stage: 'complete', percentage: 100 });

              // Check if the result is a VideoUploadResult
              if ('videoId' in taskStatus.result) {
                // Get the created video using the generated SDK
                const videoResult = await getVideo({
                  client: client,
                  path: { id: taskStatus.result.videoId }
                });

                if (videoResult.error) {
                  throw new Error('Failed to get created video');
                }

                return videoResult.data?.data as Video;
              } else {
                throw new Error('Unexpected task result type');
              }
            } else if (taskStatus.status === 'failed') {
              const errorMessage = typeof taskStatus.result === 'string'
                ? taskStatus.result
                : taskStatus.result?.error || 'Video upload failed';
              
              // Provide more user-friendly error messages for common issues
              let userFriendlyError = errorMessage;
              
              if (errorMessage.includes('Speed too slow') || errorMessage.includes('throttling')) {
                userFriendlyError = 'The video source is downloading too slowly. This may be due to server throttling or network issues. Please try a different video URL or check with the video provider.';
              } else if (errorMessage.includes('Lambda timeout') || errorMessage.includes('took too long')) {
                userFriendlyError = 'The video download is taking too long to complete. This usually happens when the source server is very slow. Please try a different video URL or contact support.';
              } else if (errorMessage.includes('does not point to a video file')) {
                userFriendlyError = 'The URL does not appear to be a direct link to a video file. Please provide a direct link to a video file (e.g., ending in .mp4, .mov, .avi).';
              } else if (errorMessage.includes('File size too small')) {
                userFriendlyError = 'The file at the URL is too small to be a valid video. Please check the URL and ensure it points to a video file.';
              }
              
              throw new Error(userFriendlyError);
            }

            // Update progress based on attempts
            const progress = Math.min(50 + (attempts / maxAttempts) * 40, 90);
            onProgress?.({ stage: 'uploading', percentage: progress });

            attempts++;
          }

          throw new Error('Upload timeout - video upload took too long');
        }

        throw new Error('Invalid upload parameters');
      } catch (error) {
        console.error('Video upload failed:', error);
        throw error;
      }
    },
  });
}

export function useVideoProcessingMonitor(videoId?: string, enabled = true) {
  const queryClient = useQueryClient()

  const videoQuery = useQuery({
    queryKey: videoKeys.detail(videoId || ''),
    queryFn: async () => {
      if (!videoId) return null
      
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const result = await getVideo({
        client: client,
        path: { id: videoId }
      })
      return result.data?.data || null
    },
    enabled: enabled && !!videoId,
    refetchInterval: false, // Disable all refetching when processing
    refetchIntervalInBackground: false, // Don't poll in background to save resources
    // Add stale time to prevent unnecessary refetches
    staleTime: 5000, // Consider data fresh for 5 seconds
  })

  useEffect(() => {
    const video = videoQuery.data
    
    if (video && video.status !== 'processing') {
      // Processing is complete, update related caches
      queryClient.invalidateQueries({ queryKey: videoKeys.lists() })
      
      if (video.gameId) {
        queryClient.invalidateQueries({ queryKey: videoKeys.gameVideos(video.gameId) })
      }
      
      // Update the specific video cache
      if (video.id) {
        queryClient.setQueryData(videoKeys.detail(video.id), video)
      }
    }
  }, [videoQuery.data, queryClient])

  const video = videoQuery.data
  
  return {
    video,
    isProcessing: video?.status === 'processing',
    isReady: video?.status === 'ready',
    hasFailed: video?.status === 'failed',
    hasProcessedVideo: !!(video?.hlsPlaylistUrl || video?.mp4StreamUrl),
    isLoading: videoQuery.isLoading,
    error: videoQuery.error,
    refetch: videoQuery.refetch,
  }
} 