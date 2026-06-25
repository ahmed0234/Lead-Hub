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
  initialName: string;
  initialDomain: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditWebsiteDialog({
  websiteId,
  initialName,
  initialDomain,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [domain, setDomain] = useState(initialDomain);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Failed to update website");
        return;
      }

      toast.success("Website updated successfully");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Website Settings</DialogTitle>
          <DialogDescription>
            Update your registered website name or domain.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-website-name">Website Name</Label>
            <Input
              id="edit-website-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-website-domain">Domain</Label>
            <Input
              id="edit-website-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
