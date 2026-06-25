import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { checkWebsitePermission } from "@/lib/permissions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";
import WebsiteDashboardTabs from "./_components/WebsiteDashboardTabs";
import { Calendar, Database, Inbox, Sparkles } from "lucide-react";

interface Props {
  params: Promise<{ websiteId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { websiteId } = await params;
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  return {
    title: website ? `${website.name} — Lead Hub` : "Website Details — Lead Hub",
  };
}

export default async function WebsiteDetailPage({ params }: Props) {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const { websiteId } = await params;

  // Use the checkWebsitePermission helper to verify tenant boundary and retrieve roles
  const { authorized, website, workspace, role } = await checkWebsitePermission(
    websiteId,
    ["OWNER", "ADMIN", "MEMBER"]
  );

  if (!authorized || !website || !workspace || !role) {
    notFound();
  }

  // Fetch leads for this website
  const leads = await prisma.lead.findMany({
    where: { websiteId: website.id },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });

  // Calculate website stats
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "NEW").length;
  const lastLead = leads[0]; // because they are ordered by submittedAt desc
  
  // Format last submission date
  let lastSubmissionText = "No submissions yet";
  if (lastLead) {
    lastSubmissionText = new Date(lastLead.submittedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Fetch workspace members for the Team tab
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { role: "asc" },
  });

  const formattedMembers = workspaceMembers.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
  }));

  const serializableLeads = leads.map((l) => ({
    id: l.id,
    data: l.data,
    status: l.status,
    source: l.source,
    submittedAt: l.submittedAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Total Leads
            </CardTitle>
            <Database size={15} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time submissions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              New Leads
            </CardTitle>
            <Sparkles size={15} className="text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Last Submission
            </CardTitle>
            <Inbox size={15} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-md font-bold truncate mt-1">
              {lastSubmissionText}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Most recent lead date</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Created Date
            </CardTitle>
            <Calendar size={15} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(website.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Website registration date</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <WebsiteDashboardTabs
        websiteId={website.id}
        websiteName={website.name}
        websiteDomain={website.domain}
        websiteDescription={website.description}
        isActive={website.isActive}
        userRole={role}
        currentSecret={website.secret}
        leads={serializableLeads}
        members={formattedMembers}
      />
    </div>
  );
}
