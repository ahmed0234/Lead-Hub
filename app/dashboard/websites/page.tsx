import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { getWorkspaceByClerkOrg } from "@/lib/workspace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Users } from "lucide-react";
import AddWebsiteButton from "./_components/AddWebsiteButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Websites — Lead Hub",
  description: "Manage your websites and collect leads.",
};

export default async function WebsitesPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  const workspace = await getWorkspaceByClerkOrg(orgId);

  const websites = workspace
    ? await prisma.website.findMany({
        where: { workspaceId: workspace.id },
        include: { _count: { select: { leads: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Websites</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your websites and their lead collection.
          </p>
        </div>
        <AddWebsiteButton />
      </div>

      {/* Content */}
      {websites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <Globe size={40} className="text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">No websites yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add your first website to start collecting leads.
          </p>
          <AddWebsiteButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((site) => (
            <Link
              key={site.id}
              href={`/dashboard/websites/${site.id}`}
              className="group"
            >
              <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight group-hover:text-primary transition-colors">
                      {site.name}
                    </CardTitle>
                    <Badge
                      variant={site.isActive ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {site.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1 text-xs mt-1">
                    <Globe size={12} />
                    {site.domain}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users size={14} />
                    <span>
                      {site._count.leads}{" "}
                      {site._count.leads === 1 ? "lead" : "leads"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
