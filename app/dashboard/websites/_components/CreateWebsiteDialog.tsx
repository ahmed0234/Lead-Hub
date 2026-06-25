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
import { Check, Copy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateWebsiteDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Failed to create website");
        return;
      }

      setCreatedSecret(json.apiSecret as string);
      toast.success("Website created successfully!");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setName("");
    setDomain("");
    setCreatedSecret(null);
    setCopied(false);
    onOpenChange(false);
  }

  function handleCopy() {
    if (!createdSecret) return;
    navigator.clipboard.writeText(createdSecret);
    setCopied(true);
    toast.success("API secret key copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!createdSecret ? (
          <>
            <DialogHeader>
              <DialogTitle>Register Website</DialogTitle>
              <DialogDescription>
                Add a new website to start capturing lead submissions.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="website-name">Website Name</Label>
                <Input
                  id="website-name"
                  placeholder="My Portfolio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="website-domain">Domain Name</Label>
                <Input
                  id="website-domain"
                  placeholder="myportfolio.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                />
              </div>

              <DialogFooter className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Registering..." : "Register Website"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Website Registered!</DialogTitle>
              <DialogDescription>
                Copy your unique API secret key. It will only be shown once.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 py-2">
              <p className="text-sm text-muted-foreground font-medium">
                Include this secret key in your submissions payload:
              </p>
              
              <div className="flex items-center gap-2 rounded-md bg-muted px-4 py-3 font-mono text-sm break-all relative group select-all">
                <span className="flex-1 pr-8">{createdSecret}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopy}
                  className="h-8 w-8 absolute right-2 top-1/2 -translate-y-1/2"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Keep this key confidential. You can regenerate it if it gets compromised.
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
