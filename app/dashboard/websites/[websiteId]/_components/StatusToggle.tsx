"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  websiteId: string;
  initialActive: boolean;
  disabled?: boolean;
}

export default function StatusToggle({ websiteId, initialActive, disabled }: Props) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (disabled || loading) return;
    
    setLoading(true);
    const nextState = !isActive;
    
    try {
      const res = await fetch(`/api/websites/${websiteId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Failed to update status");
        return;
      }

      setIsActive(nextState);
      toast.success(nextState ? "Website activated" : "Website deactivated");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        disabled={disabled || loading}
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
          ${isActive ? "bg-primary" : "bg-muted-foreground/30"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out
            ${isActive ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
      <span className="text-sm font-medium text-muted-foreground">
        {isActive ? "Accepting lead submissions" : "Rejecting lead submissions"}
      </span>
    </div>
  );
}
