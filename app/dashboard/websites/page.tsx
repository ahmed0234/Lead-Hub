import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Inbox } from "lucide-react";
import AddWebsiteButton from "./_components/AddWebsiteButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Websites — Lead Hub",
  description: "Manage your registered websites.",
};

export default async function WebsitesPage() {
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

  const websites = await prisma.website.findMany({
    where: { userId: user.id },
    include: { _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registered Websites</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage websites to receive form submissions.
          </p>
        </div>
        <AddWebsiteButton />
      </div>

      {/* Content */}
      {websites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center bg-card">
          <Globe size={40} className="text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No websites registered yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Register your first website to start collecting form leads.
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
              <Card className="h-full transition-all hover:shadow-md cursor-pointer border border-border hover:border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-tight group-hover:text-primary transition-colors truncate">
                      {site.name}
                    </CardTitle>
                    <Badge
                      variant={site.status === "ACTIVE" ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {site.status === "ACTIVE" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 text-xs mt-1 font-mono">
                    <Globe size={13} className="text-muted-foreground" />
                    {site.domain}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                    <Inbox size={15} />
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
