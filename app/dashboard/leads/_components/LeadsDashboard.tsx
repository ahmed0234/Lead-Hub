"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Search, Download, Inbox, Globe } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Lead {
  id: string;
  websiteId: string;
  websiteName: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
  metadata: any;
  submittedAt: string;
}

interface Website {
  id: string;
  name: string;
}

interface Props {
  initialLeads: Lead[];
  websites: Website[];
}

export default function LeadsDashboard({ initialLeads, websites }: Props) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter leads based on search term and selected website
  const filteredLeads = leads.filter((lead) => {
    const matchesWebsite =
      selectedWebsiteId === "all" || lead.websiteId === selectedWebsiteId;

    const query = searchTerm.toLowerCase().trim();
    if (!query) return matchesWebsite;

    const matchesSearch =
      (lead.name?.toLowerCase().includes(query)) ||
      (lead.email?.toLowerCase().includes(query)) ||
      (lead.phone?.toLowerCase().includes(query)) ||
      (lead.message?.toLowerCase().includes(query)) ||
      (lead.ip?.toLowerCase().includes(query)) ||
      (JSON.stringify(lead.metadata).toLowerCase().includes(query));

    return matchesWebsite && matchesSearch;
  });

  // Handle lead deletion
  async function handleDelete(leadId: string) {
    if (deletingId) return;
    setDeletingId(leadId);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Failed to delete lead");
        return;
      }

      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      toast.success("Lead deleted successfully");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  // Handle CSV export
  function handleExportCSV() {
    if (filteredLeads.length === 0) {
      toast.error("No leads found to export");
      return;
    }

    const headers = [
      "Website",
      "Name",
      "Email",
      "Phone",
      "Message",
      "IP Address",
      "User Agent",
      "Referrer",
      "Submitted At"
    ];

    const rows = filteredLeads.map((l) => [
      l.websiteName,
      l.name || "",
      l.email || "",
      l.phone || "",
      l.message || "",
      l.ip || "",
      l.userAgent || "",
      l.referrer || "",
      l.submittedAt
    ]);

    // Construct CSV String
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((val) => `"${String(val).replace(/"/g, '""')}"`)
            .join(",")
        )
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `leads_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredLeads.length} leads successfully`);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search leads by name, email, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        {/* Filters & Export */}
        <div className="flex items-center gap-3">
          <select
            value={selectedWebsiteId}
            onChange={(e) => setSelectedWebsiteId(e.target.value)}
            className="flex h-9 w-[180px] rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Websites</option>
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download size={15} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Leads list */}
      {filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center bg-card shadow-sm">
          <Inbox size={40} className="text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">
            No matching leads found
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Try adjusting your search query or website filters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col lg:flex-row items-start justify-between gap-4 py-4">
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs border-b border-border pb-2">
                    <span className="font-semibold text-muted-foreground flex items-center gap-1">
                      <Globe size={12} />
                      Website:
                    </span>
                    <span className="text-foreground font-semibold">
                      {lead.websiteName}
                    </span>
                    <span className="text-muted-foreground/45">|</span>
                    <span className="font-semibold text-muted-foreground">Name:</span>{" "}
                    <span className="text-foreground">{lead.name || "N/A"}</span>
                    <span className="text-muted-foreground/45">|</span>
                    <span className="font-semibold text-muted-foreground">Email:</span>{" "}
                    <span className="text-foreground">{lead.email || "N/A"}</span>
                    <span className="text-muted-foreground/45">|</span>
                    <span className="font-semibold text-muted-foreground">Phone:</span>{" "}
                    <span className="text-foreground">{lead.phone || "N/A"}</span>
                  </div>

                  {lead.message && (
                    <div className="text-sm text-foreground bg-muted/20 p-2.5 rounded border border-border/40">
                      <span className="font-semibold text-xs text-muted-foreground block mb-1">Message:</span>
                      {lead.message}
                    </div>
                  )}

                  {/* Metadata display */}
                  <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-1 bg-muted/10 p-2 rounded">
                    <span className="font-semibold text-foreground">Metadata Payload:</span>
                    <pre className="font-mono text-[10px] whitespace-pre-wrap break-all mt-1">
                      {JSON.stringify(lead.metadata, null, 2)}
                    </pre>
                  </div>

                  {/* Browser/Referrer Metadata */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-1 italic">
                    {lead.referrer && lead.referrer !== "Unknown" && (
                      <span>Referrer: {lead.referrer}</span>
                    )}
                    <span>IP: {lead.ip}</span>
                    <span>Agent: {lead.userAgent}</span>
                  </div>
                </div>

                {/* Date & Actions */}
                <div className="flex flex-row lg:flex-col lg:items-end justify-between items-center shrink-0 lg:self-stretch gap-2 w-full lg:w-auto">
                  <Badge variant="outline" className="text-xs font-mono">
                    {new Date(lead.submittedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(lead.id)}
                    disabled={deletingId === lead.id}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
