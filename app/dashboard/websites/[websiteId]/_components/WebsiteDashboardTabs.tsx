"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox, Eye, EyeOff, Copy, Check, ShieldAlert, Settings, Database, ArrowLeft, Key } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import StatusToggle from "./StatusToggle";
import EditWebsiteDialog from "./EditWebsiteDialog";
import DeleteWebsiteDialog from "./DeleteWebsiteDialog";
import RegenerateKeyDialog from "./RegenerateKeyDialog";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  ip: string | null;
  userAgent: string | null;
  referrer: string | null;
  metadata: any;
  submittedAt: string | Date;
}

interface Props {
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  status: string; // ACTIVE or INACTIVE
  apiSecret: string;
  leads: Lead[];
}

export default function WebsiteDashboardTabs({
  websiteId,
  websiteName,
  websiteDomain,
  status,
  apiSecret,
  leads,
}: Props) {
  const [activeTab, setActiveTab] = useState<"leads" | "settings">("leads");
  
  // Modal states
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  
  // API key visibility
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopySecret() {
    navigator.clipboard.writeText(apiSecret);
    setCopied(true);
    toast.success("Secret key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  const isActive = status === "ACTIVE";

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb back */}
      <div className="flex items-center">
        <Link
          href="/dashboard/websites"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={12} />
          Back to Websites
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {websiteName}
            </h1>
            <Badge variant={isActive ? "default" : "secondary"}>
              {status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {websiteDomain}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit Settings
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Delete Website
          </Button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("leads")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "leads"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Database size={15} />
          Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "settings"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings size={15} />
          API & Settings
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-2">
        {/* LEADS TAB */}
        {activeTab === "leads" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Submissions Log</h2>

            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center bg-card">
                <Inbox size={36} className="text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No submissions yet
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  Submit form submissions with your API secret key to see them here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {leads.map((lead) => (
                  <Card key={lead.id} className="overflow-hidden shadow-sm">
                    <CardContent className="flex flex-col md:flex-row md:items-start justify-between gap-4 py-4">
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs border-b border-border pb-2">
                          <div>
                            <span className="font-semibold text-muted-foreground">Name:</span>{" "}
                            <span className="text-foreground">{lead.name || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Email:</span>{" "}
                            <span className="text-foreground">{lead.email || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Phone:</span>{" "}
                            <span className="text-foreground">{lead.phone || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">IP Address:</span>{" "}
                            <span className="text-foreground font-mono">{lead.ip || "N/A"}</span>
                          </div>
                        </div>

                        {lead.message && (
                          <div className="text-sm text-foreground bg-muted/30 p-2.5 rounded border border-border/40">
                            <span className="font-semibold text-xs text-muted-foreground block mb-1">Message:</span>
                            {lead.message}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-1 bg-muted/15 p-2 rounded">
                          <span className="font-semibold text-foreground">Payload Data (JSON):</span>
                          <pre className="font-mono text-[11px] whitespace-pre-wrap break-all mt-1">
                            {JSON.stringify(lead.metadata, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0 justify-between self-stretch">
                        <span className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-2 py-0.5 rounded font-medium">
                          {new Date(lead.submittedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        
                        <div className="text-[10px] text-muted-foreground max-w-[200px] text-right truncate italic">
                          {lead.userAgent || "Unknown Browser"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS & API TAB */}
        {activeTab === "settings" && (
          <div className="flex flex-col gap-6">
            {/* Status Switch Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Website Status</CardTitle>
                <CardDescription>
                  Enable or disable lead submissions. When inactive, any submission attempt using this API key will be rejected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatusToggle
                  websiteId={websiteId}
                  initialStatus={status}
                />
              </CardContent>
            </Card>

            {/* API Key Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key size={16} className="text-muted-foreground" />
                  API Secret Key
                </CardTitle>
                <CardDescription>
                  Use this key to authenticate form submissions from your website. Keep this key private and secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-md font-mono text-sm relative group border border-border">
                    <span className="flex-1 select-all break-all pr-12">
                      {showSecret ? apiSecret : "lh_" + "•".repeat(24)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={handleCopySecret}
                      >
                        {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start justify-between border-t border-border pt-4">
                  <div>
                    <p className="text-sm font-semibold">Regenerate Key</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      If you believe your key has been compromised, regenerate it immediately.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setRegenOpen(true)}>
                    Regenerate
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <ShieldAlert size={16} />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Permanent, destructive actions that cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between border-t border-destructive/10 pt-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Delete this website</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Once deleted, all lead data and secrets will be gone forever.
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  Delete Website
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Dialog Modals */}
      <EditWebsiteDialog
        websiteId={websiteId}
        initialName={websiteName}
        initialDomain={websiteDomain}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteWebsiteDialog
        websiteId={websiteId}
        websiteName={websiteName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <RegenerateKeyDialog
        websiteId={websiteId}
        open={regenOpen}
        onOpenChange={setRegenOpen}
      />
    </div>
  );
}
