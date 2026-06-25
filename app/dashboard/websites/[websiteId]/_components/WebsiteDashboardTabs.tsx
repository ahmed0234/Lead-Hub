"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox, Eye, EyeOff, Copy, Check, Shield, ShieldAlert, Users, Settings, Database, ArrowLeft, Key } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import StatusToggle from "./StatusToggle";
import EditWebsiteDialog from "./EditWebsiteDialog";
import DeleteWebsiteDialog from "./DeleteWebsiteDialog";
import RegenerateKeyDialog from "./RegenerateKeyDialog";

interface Lead {
  id: string;
  data: any;
  status: string;
  source: string | null;
  submittedAt: string | Date;
}

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string | Date;
}

interface Props {
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  websiteDescription: string | null;
  isActive: boolean;
  userRole: string; // OWNER, ADMIN, MEMBER
  currentSecret: string;
  leads: Lead[];
  members: Member[];
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NEW: "default",
  CONTACTED: "secondary",
  QUALIFIED: "outline",
  WON: "outline",
  LOST: "destructive",
};

export default function WebsiteDashboardTabs({
  websiteId,
  websiteName,
  websiteDomain,
  websiteDescription,
  isActive,
  userRole,
  currentSecret,
  leads,
  members,
}: Props) {
  const [activeTab, setActiveTab] = useState<"leads" | "settings" | "team">("leads");
  
  // Modal states
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  
  // API key visibility
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwnerOrAdmin = userRole === "OWNER" || userRole === "ADMIN";

  function handleCopySecret() {
    navigator.clipboard.writeText(currentSecret);
    setCopied(true);
    toast.success("Secret key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

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
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {websiteDomain}
          </p>
          {websiteDescription && (
            <p className="text-xs text-muted-foreground mt-1 max-w-xl italic">
              {websiteDescription}
            </p>
          )}
        </div>
        
        {isOwnerOrAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit Settings
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              Delete Website
            </Button>
          </div>
        )}
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
        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "team"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users size={15} />
          Team ({members.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-2">
        {/* LEADS TAB */}
        {activeTab === "leads" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Submissions</h2>

            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
                <Inbox size={36} className="text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No leads yet
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  Submit form submissions with your API key to see them here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {leads.map((lead) => (
                  <Card key={lead.id} className="overflow-hidden">
                    <CardContent className="flex items-start justify-between gap-4 py-4">
                      <div className="flex-1 min-w-0">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono break-all bg-muted p-3 rounded-md">
                          {JSON.stringify(lead.data, null, 2)}
                        </pre>
                        {lead.source && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Source: {lead.source}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant={statusVariant[lead.status] || "default"}>
                          {lead.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(lead.submittedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
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
                  initialActive={isActive}
                  disabled={!isOwnerOrAdmin}
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
                      {showSecret ? currentSecret : "lh_" + "•".repeat(24)}
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

                {isOwnerOrAdmin && (
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
                )}
              </CardContent>
            </Card>

            {/* Danger Zone (Visible only to owners/admins) */}
            {isOwnerOrAdmin && (
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
            )}
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === "team" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h2 className="text-base font-semibold">Organization Members</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All members of this workspace have access to this website's data based on their roles.
                </p>
              </div>
            </div>

            {/* Table of Members */}
            <div className="rounded-md border border-border overflow-hidden bg-card">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50 text-left font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Workspace Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/35 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {member.name || "Invite Pending"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {member.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            member.role === "OWNER"
                              ? "default"
                              : member.role === "ADMIN"
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize"
                        >
                          {member.role.toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Note about Clerk */}
            <div className="rounded-md bg-muted p-4 border border-border flex items-start gap-2.5">
              <Shield size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Clerk Organization Membership</p>
                <p>
                  Team members are managed at the organization level via Clerk. To invite new team members, remove members, or change roles, please use the Clerk Organization interface.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Modals */}
      {isOwnerOrAdmin && (
        <>
          <EditWebsiteDialog
            websiteId={websiteId}
            initialName={websiteName}
            initialDomain={websiteDomain}
            initialDescription={websiteDescription}
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
        </>
      )}
    </div>
  );
}
