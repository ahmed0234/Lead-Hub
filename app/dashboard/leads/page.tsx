import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import LeadsDashboard from "./_components/LeadsDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads Log — Lead Hub",
  description: "View and manage all lead form submissions.",
};

export default async function LeadsPage() {
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

  // Fetch websites for filtering dropdown
  const websites = await prisma.website.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  // Fetch all leads belonging to any of the user's websites
  const leads = await prisma.lead.findMany({
    where: {
      website: {
        userId: user.id,
      },
    },
    include: {
      website: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const serializableLeads = leads.map((l) => ({
    id: l.id,
    websiteId: l.websiteId,
    websiteName: l.website.name,
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads Central</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search, filter, delete, or export your form submissions.
        </p>
      </div>

      <LeadsDashboard
        initialLeads={serializableLeads}
        websites={websites}
      />
    </div>
  );
}
