import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Globe, Inbox, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
  });

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch statistics
  const totalWebsites = await prisma.website.count({
    where: { userId: user.id },
  });

  const activeWebsites = await prisma.website.count({
    where: { userId: user.id, status: "ACTIVE" },
  });

  const totalLeads = await prisma.lead.count({
    where: { website: { userId: user.id } },
  });

  // Fetch 10 most recent leads across all user's websites
  const recentLeads = await prisma.lead.findMany({
    where: {
      website: {
        userId: user.id,
      },
    },
    include: {
      website: true,
    },
    orderBy: { submittedAt: "desc" },
    take: 10,
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Dashboard Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {user.name || user.email}. Monitor your websites and submissions.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Total Websites
            </CardTitle>
            <Globe size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalWebsites}</div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {activeWebsites} active / {totalWebsites - activeWebsites} inactive
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Total Leads
            </CardTitle>
            <Database size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1.5">All-time form submissions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Conversion Rate
            </CardTitle>
            <TrendingUp size={16} className="text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground mt-1.5">Lead acceptance integrity</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              Recent Lead Submissions
            </h2>
            <CardDescription className="mt-0.5">
              The latest leads captured from your integrated websites.
            </CardDescription>
          </div>
          <Link
            href="/dashboard/leads"
            className="text-xs font-medium text-primary hover:underline"
          >
            View All Leads
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center bg-card">
            <Inbox size={40} className="text-muted-foreground mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No leads yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
              Set up a website, copy your API secret, and submit a form to see data here.
            </p>
            <Link
              href="/dashboard/websites"
              className="mt-4 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/95 transition-colors"
            >
              Configure Websites
            </Link>
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 text-left font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <Link
                        href={`/dashboard/websites/${lead.websiteId}`}
                        className="hover:text-primary hover:underline transition-colors"
                      >
                        {lead.website.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {lead.email || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                      {lead.message || <span className="italic text-xs text-muted-foreground/50">Custom Payload</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(lead.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
