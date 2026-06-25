import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { checkWebsiteOwnership } from "@/lib/permissions";
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
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const { websiteId } = await params;

  // Use the checkWebsiteOwnership helper to verify user owner constraints
  const { authorized, website, user } = await checkWebsiteOwnership(websiteId);

  if (!authorized || !website || !user) {
    notFound();
  }

  // Fetch leads for this website
  const leads = await prisma.lead.findMany({
    where: { websiteId: website.id },
    orderBy: { submittedAt: "desc" },
  });

  // Calculate website stats
  const totalLeads = leads.length;
  const lastLead = leads[0]; // ordered by submittedAt desc
  
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

  const serializableLeads = leads.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    message: l.message,
    ip: l.ip,
    userAgent: l.userAgent,
    referrer: l.referrer,
    metadata: l.metadata,
    submittedAt: l.submittedAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Total Submissions
            </CardTitle>
            <Database size={15} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Captured leads</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Last Lead Captured
            </CardTitle>
            <Inbox size={15} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold truncate mt-1">
              {lastSubmissionText}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Most recent payload date</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Registered Since
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
        status={website.status}
        apiSecret={website.apiSecret}
        leads={serializableLeads}
      />
    </div>
  );
}
