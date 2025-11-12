"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Users, CheckCircle, Info, Lock } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useTeam } from "@/contexts/team-context"
import { useJoinTeam, useVerifyInviteCode } from "@/hooks/use-team-joining"

export default function JoinTeamPage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.inviteCode as string
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localTeamInfo, setLocalTeamInfo] = useState<any>(null)
  const [joinStatus, setJoinStatus] = useState<'loading' | 'success' | 'error' | 'already-member' | null>(null)
  
  const { user, isAuthenticated } = useAuth()
  const { setSelectedTeam } = useTeam()
  const joinTeam = useJoinTeam()
  const { data: teamInfo, isLoading: isVerifying, error: verifyError } = useVerifyInviteCode(inviteCode)

  // Set loading state based on verification
  useEffect(() => {
    setIsLoading(isVerifying)
  }, [isVerifying])

  // Set error state based on verification
  useEffect(() => {
    if (verifyError) {
      setError(verifyError.message || 'Failed to verify invite code')
    }
  }, [verifyError])

  // Auto-join if user is authenticated and team info is loaded
  useEffect(() => {
    const autoJoinTeam = async () => {
      if (isAuthenticated && teamInfo && !joinStatus && !isLoading) {
        setJoinStatus('loading')
        try {
          const { data, error } = await client.POST('/users/join-team', {
            body: { inviteCode }
          })

          if (error) {
            // Check if user is already a member
            if (error.message?.includes('already a member')) {
              setJoinStatus('already-member')
              return
            }
            throw new Error(error.message || 'Failed to join team')
          }

          if (data?.data?.team) {
            setSelectedTeam(data.data.team)
            setJoinStatus('success')
            
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['teams'] })
            queryClient.invalidateQueries({ queryKey: ['users'] })
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              router.push('/dashboard')
            }, 2000)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to join team')
          setJoinStatus('error')
        }
      }
    }

    autoJoinTeam()
  }, [isAuthenticated, teamInfo, inviteCode, setSelectedTeam, queryClient, router, joinStatus, isLoading])

  const handleSignIn = () => {
    // Store the invite code in sessionStorage for after login
    sessionStorage.setItem('pendingTeamInvite', inviteCode)
    router.push('/login')
  }

  const handleJoinTeam = async () => {
    if (!isAuthenticated) {
      handleSignIn()
      return
    }

    setJoinStatus('loading')
    try {
      const { data, error } = await client.POST('/users/join-team', {
        body: { inviteCode }
      })

      if (error) {
        // Check if user is already a member
        if (error.message?.includes('already a member')) {
          setJoinStatus('already-member')
          return
        }
        throw new Error(error.message || 'Failed to join team')
      }

      if (data?.data?.team) {
        setSelectedTeam(data.data.team)
        setJoinStatus('success')
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['teams'] })
        queryClient.invalidateQueries({ queryKey: ['users'] })
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team')
      setJoinStatus('error')
    }
  }

  // Show authentication required screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Authentication Required</CardTitle>
            <CardDescription>
              You need to sign in to join a team
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 mx-auto mb-3">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Join Team Invitation</h3>
              <p className="text-sm text-muted-foreground">
                You've been invited to join a team using invite code: <code className="bg-muted px-1 rounded text-xs">{inviteCode}</code>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Please sign in to verify and accept this invitation.
              </p>
            </div>

            <div className="space-y-3">
              <Button onClick={handleSignIn} className="w-full">
                Sign In to Continue
              </Button>
              
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <LoadingSpinner variant="inline" size="lg" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold">Verifying invite code...</h2>
                <p className="text-sm text-muted-foreground">Please wait while we check your invite</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold">Invalid Invite</h2>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (joinStatus === 'already-member') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center border border-warning/20">
                <Info className="h-8 w-8 text-warning" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold">Already a Member</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  You are already a member of {teamInfo?.name}
                </p>
                <Button onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (joinStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center border border-success/20">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold">Successfully joined!</h2>
                <p className="text-sm text-muted-foreground">
                  Welcome to {teamInfo?.name}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Redirecting to dashboard...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Join Team</CardTitle>
          <CardDescription>
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {teamInfo && (
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 mx-auto mb-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{teamInfo.name}</h3>
              {teamInfo.sport && (
                <p className="text-sm text-muted-foreground">{teamInfo.sport}</p>
              )}
              {teamInfo.description && (
                <p className="text-sm text-muted-foreground mt-2">{teamInfo.description}</p>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleJoinTeam} 
              disabled={joinStatus === 'loading'}
              className="w-full"
            >
              {joinStatus === 'loading' ? (
                <>
                  <LoadingSpinner variant="inline" size="sm" />
                  Joining...
                </>
              ) : (
                'Join Team'
              )}
            </Button>
            
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 