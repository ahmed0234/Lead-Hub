"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  websiteId: string;
  websiteName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteWebsiteDialog({
  websiteId,
  websiteName,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidConfirmation = confirmName.trim() === websiteName;

  async function handleDelete() {
    if (!isValidConfirmation || loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Failed to delete website");
        return;
      }

      toast.success("Website deleted successfully");
      onOpenChange(false);
      router.push("/dashboard/websites");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-destructive/50">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Website</DialogTitle>
          <DialogDescription>
            This action is irreversible. Deleting this website will permanently delete
            all associated data, including API keys/secrets, lead submissions, and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm font-medium">
            Please type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-destructive">{websiteName}</span> to confirm.
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirm-input" className="sr-only">
              Confirmation Website Name
            </Label>
            <Input
              id="delete-confirm-input"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={websiteName}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={!isValidConfirmation || loading}
          >
            {loading ? "Deleting..." : "Delete Website"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
