"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

interface Props {
  websiteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RegenerateKeyDialog({
  websiteId,
  open,
  onOpenChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleRegenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}/regenerate-secret`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Failed to regenerate secret key");
        return;
      }

      setNewSecret(json.secret);
      toast.success("API secret regenerated successfully");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setNewSecret(null);
    setCopied(false);
    onOpenChange(false);
  }

  function handleCopy() {
    if (!newSecret) return;
    navigator.clipboard.writeText(newSecret);
    setCopied(true);
    toast.success("Secret key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!newSecret ? (
          <>
            <DialogHeader>
              <DialogTitle>Regenerate API Secret Key</DialogTitle>
              <DialogDescription>
                This will immediately invalidate the existing API key. Any contact forms using the old key will stop submitting leads.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4 gap-2 sm:gap-0">
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
                onClick={handleRegenerate}
                disabled={loading}
              >
                {loading ? "Regenerating..." : "Regenerate Key"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New API Secret Key Generated</DialogTitle>
              <DialogDescription>
                Please copy your new API key now. It will not be shown again.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 py-2">
              <p className="text-sm text-muted-foreground">
                Update your application forms with this new secret:
              </p>
              
              <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-3 font-mono text-sm break-all relative group select-all">
                <span className="flex-1 pr-8">{newSecret}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopy}
                  className="h-8 w-8 absolute right-2 top-1/2 -translate-y-1/2"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </Button>
              </div>
              
              <p className="text-xs text-destructive font-medium">
                Warning: The old API key is now completely invalid.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
