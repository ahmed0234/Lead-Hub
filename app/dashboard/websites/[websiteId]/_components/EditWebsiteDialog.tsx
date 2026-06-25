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
  initialDescription: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditWebsiteDialog({
  websiteId,
  initialName,
  initialDomain,
  initialDescription,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [domain, setDomain] = useState(initialDomain);
  const [description, setDescription] = useState(initialDescription || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain, description }),
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
            Update your website name, domain, or description.
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-website-desc">Description (Optional)</Label>
            <textarea
              id="edit-website-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="e.g. Main corporate website for lead capturing"
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
