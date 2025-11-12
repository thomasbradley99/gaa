"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Users } from "lucide-react"
import { useTeam } from "@/contexts/team-context"
import { useJoinTeam } from "@/hooks/use-team-joining"

interface JoinTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinTeamDialog({ open, onOpenChange }: JoinTeamDialogProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { setSelectedTeam } = useTeam();
  const joinTeam = useJoinTeam();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!inviteCode.trim()) {
      setError("Enter invite code");
      setIsLoading(false);
      return;
    }

    if (!/^[0-9]{4}$/.test(inviteCode.trim())) {
      setError("Enter 4 digits");
      setIsLoading(false);
      return;
    }

    try {
      const result = await joinTeam.mutateAsync(inviteCode.trim());

      if (result?.data?.team) {
        setSelectedTeam(result.data.team);
        setInviteCode("");
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join team");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    // Only allow digits and limit to 4 characters
    const filteredValue = value.replace(/\D/g, '').slice(0, 4);
    setInviteCode(filteredValue);
    setError(null); // Clear error when user starts typing
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">Join Team</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Enter the 4-digit invite code
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-center">
              <Input
                placeholder="0000"
                value={inviteCode}
                onChange={(e) => handleInputChange(e.target.value)}
                disabled={isLoading}
                className="text-center text-2xl font-mono tracking-widest h-12 text-lg max-w-[200px] mx-auto"
                maxLength={4}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || inviteCode.length !== 4}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner variant="inline" size="sm" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Join
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 