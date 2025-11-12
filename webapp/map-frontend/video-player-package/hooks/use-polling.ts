"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { pollTask } from '@/lib/api/generated/sdk.gen'

export interface TaskState<T = any> {
  PK: string
  SK: string
  taskId: string
  status: 'processing' | 'completed' | 'failed'
  timestamp: string
  result?: T
  event?: any
}

interface UsePollingOptions<T> {
  taskId: string | null
  pollInterval?: number // milliseconds, default 3000 (3 seconds)
  maxAttempts?: number // maximum polling attempts, default 300 (15 minutes at 3s intervals)
  onCompleted?: (result: T) => void
  onFailed?: (error: string | any) => void
  onProgress?: (attempt: number, maxAttempts: number) => void
  enabled?: boolean
}

interface UsePollingReturn<T> {
  data: T | null
  isPolling: boolean
  error: string | null
  attempt: number
  progress: number // 0-100 percentage
  stop: () => void
  restart: () => void
}

export function usePolling<T = any>({
  taskId,
  pollInterval = 3000,
  maxAttempts = 300,
  onCompleted,
  onFailed,
  onProgress,
  enabled = true
}: UsePollingOptions<T>): UsePollingReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isStoppedRef = useRef(false)
  const isPollingRef = useRef(false)

  const progress = Math.min((attempt / maxAttempts) * 100, 100)

  const stop = useCallback(() => {
    isStoppedRef.current = true
    isPollingRef.current = false
    setIsPolling(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const pollTaskFn = useCallback(async () => {
    if (!taskId || isStoppedRef.current || isPollingRef.current) return

    isPollingRef.current = true
    setIsPolling(true)

    try {
      // Import the configured client here to avoid circular imports
      const { client } = await import('@/lib/api-client');
      
      const response = await pollTask({
        client: client, // Use our configured client with auth interceptors
        path: { taskId }
      })

      if (!response.data) {
        throw new Error('No data received from polling')
      }

      const task = response.data as TaskState<T>

      if (task.status === 'completed') {
        setData(task.result || null)
        setIsPolling(false)
        isPollingRef.current = false
        if (task.result) {
          onCompleted?.(task.result)
        }
        return
      }

      if (task.status === 'failed') {
        const errorMessage = typeof task.result === 'string' 
          ? task.result 
          : (task.result && typeof task.result === 'object' && 'error' in task.result) 
            ? (task.result as any).error 
            : 'Task failed'
        setError(errorMessage)
        setIsPolling(false)
        isPollingRef.current = false
        onFailed?.(task.result)
        return
      }

      // Still processing - continue polling
      const newAttempt = attempt + 1
      setAttempt(newAttempt)
      onProgress?.(newAttempt, maxAttempts)
      
      if (newAttempt >= maxAttempts) {
        setError('Polling timed out - task is taking longer than expected')
        setIsPolling(false)
        isPollingRef.current = false
        onFailed?.('Polling timeout')
        return
      }

      // Schedule next poll after the interval
      if (!isStoppedRef.current) {
        timeoutRef.current = setTimeout(() => {
          isPollingRef.current = false
          if (!isStoppedRef.current) {
            pollTaskFn()
          }
        }, pollInterval)
      } else {
        isPollingRef.current = false
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown polling error'
      setError(errorMessage)
      setIsPolling(false)
      isPollingRef.current = false
      onFailed?.(errorMessage)
    }
  }, [taskId, pollInterval, maxAttempts, onCompleted, onFailed, onProgress, attempt])

  const restart = useCallback(() => {
    if (!taskId) return
    
    // Stop any existing polling
    stop()
    
    // Reset state
    isStoppedRef.current = false
    isPollingRef.current = false
    setData(null)
    setError(null)
    setAttempt(0)
    
    // Start polling
    pollTaskFn()
  }, [taskId, pollTaskFn, stop])

  // Start polling when taskId is provided and enabled
  useEffect(() => {
    if (!taskId || !enabled) {
      stop()
      return
    }

    restart()

    return () => {
      stop()
    }
  }, [taskId, enabled]) // Removed restart and stop from dependencies to prevent excessive re-runs

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    data,
    isPolling,
    error,
    attempt,
    progress,
    stop,
    restart
  }
} 