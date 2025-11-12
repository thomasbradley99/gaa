"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTeam } from "@/contexts/team-context"
import { useGame } from "@/hooks/use-games"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { CreateGameDialog } from "@/components/dashboard/dialogs/create-game-dialog"
import { Upload, Settings } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import { getCurrentUser } from "@/lib/api/generated/sdk.gen"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { client } from "@/lib/api-client"

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { selectedTeam, clearSelectedTeam } = useTeam()
  const { signOut, user: authUser } = useAuth()
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = React.useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Extract game ID if present
  const gameMatch = pathname.match(/\/games\/([A-Za-z0-9-]+)/)
  const gameId = gameMatch ? gameMatch[1] : ""
  const { data: gameResponse } = useGame(gameId)
  const opponentName = gameResponse?.opponentTeam

  // Build breadcrumb items
  type Crumb = { label: string; href?: string; clear?: boolean }
  const crumbs: Crumb[] = []

  if (selectedTeam) {
    // Team context: show Teams > Team Name (and optionally Games etc.)
    crumbs.push({ label: "Teams", href: "/dashboard", clear: true })
    crumbs.push({ label: selectedTeam.name, href: "/dashboard" })

    if (pathname.includes("/games")) {
      if (gameId && opponentName) {
        // Specific game page
        crumbs.push({ label: `vs ${opponentName}` })
      } else {
        crumbs.push({ label: "Games", href: `/dashboard/teams/${selectedTeam.id}/games` })
      }
    } else if (pathname.includes("/videos")) {
      crumbs.push({ label: "Videos", href: `/dashboard/teams/${selectedTeam.id}/videos` })
      if (pathname.match(/\/videos\/[A-Za-z0-9-]+/)) {
        crumbs.push({ label: "Video" })
      }
    }
  } else if (pathname.startsWith("/dashboard/teams")) {
    // Teams list when no team selected
    crumbs.push({ label: "Teams" })
  } else {
    // Fallback / other routes
    crumbs.push({ label: "Dashboard", href: "/dashboard" })
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setShowSettingsDialog(false)
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    if (showSettingsDialog) {
      setProfileLoading(true)
      setProfileError(null)
      getCurrentUser({ client })
        .then((res) => {
          setUserProfile(res.data?.data)
        })
        .catch((err) => {
          setProfileError("Failed to load user profile")
        })
        .finally(() => setProfileLoading(false))
    }
  }, [showSettingsDialog])

  return (
    <header className="sticky top-0 z-50 flex h-20 shrink-0 items-center gap-2 bg-transparent backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex w-full items-center justify-between">
          {/* Logo on the left */}
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="ClannAi Logo"
              width={128}
              height={128}
              className="h-6 w-auto object-contain transition-all duration-200"
            />
          </div>
          {/* Right actions */}
          <div className="flex items-center gap-2">
            {selectedTeam && selectedTeam.id && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Upload className="h-4 w-4" />
                  Add Game
                </Button>
                <CreateGameDialog
                  open={showCreateDialog}
                  onOpenChange={setShowCreateDialog}
                  teamId={selectedTeam.id}
                />
              </>
            )}
            {/* <ThemeToggle /> */}
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowSettingsDialog(true)}>
                  <Settings className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Account Settings</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Account Details</h3>
                    {profileLoading ? (
                      <div className="text-muted-foreground">Loading...</div>
                    ) : profileError ? (
                      <div className="text-destructive">{profileError}</div>
                    ) : userProfile ? (
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Email:</span> {userProfile.email}</div>
                        <div><span className="font-medium">First Name:</span> {userProfile.firstName}</div>
                        <div><span className="font-medium">Last Name:</span> {userProfile.lastName}</div>
                        <div><span className="font-medium">Date Joined:</span> {userProfile.createdAt ? format(new Date(userProfile.createdAt), 'PPP') : '-'}</div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No user data.</div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Subscription</h3>
                    <div className="text-muted-foreground">Subscription info goes here.</div>
                  </div>
                  <div>
                    <Button variant="destructive" className="w-full mt-4" onClick={handleSignOut}>Sign Out</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  )
}
