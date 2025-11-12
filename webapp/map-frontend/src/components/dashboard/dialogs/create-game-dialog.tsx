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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateGame } from "@/hooks/use-games"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { CreateGameRequest } from '@/lib/api/generated/types.gen';

interface CreateGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId?: string;
  isPublic?: boolean;
}



export function CreateGameDialog({ open, onOpenChange, teamId, isPublic = false }: CreateGameDialogProps) {
  const [formData, setFormData] = useState<CreateGameRequest>({
    teamId,
    opponentTeam: "",
    gameType: "friendly",
    status: "scheduled",
    isPublic,
  });
  const [error, setError] = useState<string | null>(null);

  const createGame = useCreateGame();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.opponentTeam.trim()) {
      setError("Opponent team name is required");
      return;
    }

    

    try {
      await createGame.mutateAsync({
        ...formData,
        scheduledDate: new Date().toISOString(), // Set current date and time
      });
      setFormData({
        teamId,
        opponentTeam: "",
        gameType: "friendly",
        status: "scheduled",
        isPublic,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create game");
    }
  };

  const handleInputChange = (field: keyof CreateGameRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isPublic ? 'Create Public Game' : 'Add New Game'}</DialogTitle>
          <DialogDescription>
            {isPublic 
              ? 'Create a new public game that will be accessible to all users without authentication.'
              : 'Add a new game or match for your team.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="opponentTeam">Opponent Team</Label>
              <Input
                id="opponentTeam"
                placeholder="Enter opponent team name"
                value={formData.opponentTeam}
                onChange={(e) => handleInputChange("opponentTeam", e.target.value)}
                disabled={createGame.isPending}
              />
            </div>

            


          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createGame.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createGame.isPending}>
              {createGame.isPending ? (
                <>
                  <LoadingSpinner variant="inline" size="sm" />
                  Creating...
                </>
              ) : (
                isPublic ? "Create Public Game" : "Add Game"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 