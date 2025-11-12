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
import { useCreateTeam } from "@/hooks/use-teams"
import { useTeam } from "@/contexts/team-context"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { CreateTeamRequest } from '@/lib/api/generated/types.gen';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}



export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const [formData, setFormData] = useState<CreateTeamRequest>({
    name: "",
    sport: "GAA", // Always set sport to GAA
    status: "active",
  });
  const [error, setError] = useState<string | null>(null);

  const createTeam = useCreateTeam();
  const { setSelectedTeam } = useTeam();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Team name is required");
      return;
    }

    

    try {
      const result = await createTeam.mutateAsync(formData);
      if (result) {
        setSelectedTeam(result);
        setFormData({
          name: "",
          sport: "GAA", // Always set sport to GAA
          status: "active",
        });
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    }
  };

  const handleInputChange = (field: keyof CreateTeamRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          
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
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                placeholder="Enter team name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                disabled={createTeam.isPending}
              />
            </div>

            
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createTeam.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? (
                <>
                  <LoadingSpinner variant="inline" size="sm" />
                  Creating...
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 