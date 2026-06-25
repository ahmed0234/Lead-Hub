import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getWorkspaceByClerkOrg } from "@/lib/workspace";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe, Inbox } from "lucide-react";
import type { Metadata } from "next";
import { LeadStatus } from "@/app/generated/prisma/client";

interface Props {
  params: Promise<{ websiteId: string }>;
}

const statusVariant: Record<
  LeadStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  NEW: "default",
  CONTACTED: "secondary",
  QUALIFIED: "outline",
  WON: "outline",
  LOST: "destructive",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { websiteId } = await params;
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  return {
    title: website ? `${website.name} — Lead Hub` : "Website — Lead Hub",
  };
}

export default async function WebsiteDetailPage({ params }: Props) {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const { websiteId } = await params;

  const workspace = await getWorkspaceByClerkOrg(orgId);

  if (!workspace) {
    notFound();
  }

  // Fetch the website, ensuring it belongs to the current org's workspace
  const website = await prisma.website.findFirst({
    where: {
      id: websiteId,
      workspaceId: workspace.id, // Cross-tenant guard
    },
  });

  if (!website) {
    notFound();
  }

  const leads = await prisma.lead.findMany({
    where: { websiteId: website.id },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {website.name}
          </h1>
          <Badge variant={website.isActive ? "default" : "secondary"}>
            {website.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Globe size={13} />
          {website.domain}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{leads.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
              New
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {leads.filter((l) => l.status === "NEW").length}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
              Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">
              {leads.filter((l) => l.status === "WON").length}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Leads list */}
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-medium">Leads</h2>

        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <Inbox size={36} className="text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No leads yet. Leads will appear here once your form starts
              submitting.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {leads.map((lead) => (
              <Card key={lead.id} className="overflow-hidden">
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono break-all">
                      {JSON.stringify(lead.data, null, 2)}
                    </pre>
                    {lead.source && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Source: {lead.source}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={statusVariant[lead.status]}>
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
    </div>
  );
}
