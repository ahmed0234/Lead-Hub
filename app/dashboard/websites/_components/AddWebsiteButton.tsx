"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CreateWebsiteDialog from "./CreateWebsiteDialog";

export default function AddWebsiteButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus size={16} className="mr-1" />
        Add Website
      </Button>
      <CreateWebsiteDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
