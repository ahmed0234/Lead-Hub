import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkWebsiteOwnership } from "@/lib/permissions";

interface Params {
  params: Promise<{ websiteId: string }>;
}

// GET - Retrieve website details, stats, and leads
export async function GET(req: NextRequest, { params }: Params) {
  const { websiteId } = await params;

  const { authorized, website, user } = await checkWebsiteOwnership(websiteId);

  if (!authorized || !website || !user) {
    return NextResponse.json(
      { error: "Website not found or unauthorized" },
      { status: 404 }
    );
  }

  // Fetch website stats
  const totalLeads = await prisma.lead.count({
    where: { websiteId },
  });

  const lastLead = await prisma.lead.findFirst({
    where: { websiteId },
    orderBy: { submittedAt: "desc" },
    select: { submittedAt: true },
  });

  // Fetch leads
  const leads = await prisma.lead.findMany({
    where: { websiteId },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json({
    website: {
      ...website,
      stats: {
        totalLeads,
        lastSubmission: lastLead?.submittedAt || null,
      },
    },
    leads,
  });
}

// PUT - Edit website details
export async function PUT(req: NextRequest, { params }: Params) {
  const { websiteId } = await params;

  const { authorized, website } = await checkWebsiteOwnership(websiteId);

  if (!authorized || !website) {
    return NextResponse.json(
      { error: "Unauthorized. You do not own this website." },
      { status: 403 }
    );
  }

  let body: { name?: string; domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, domain } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Website name is required" }, { status: 400 });
  }

  if (!domain || typeof domain !== "string" || domain.trim().length === 0) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  // Check for domain conflict
  const domainConflict = await prisma.website.findFirst({
    where: {
      domain: domain.trim().toLowerCase(),
      NOT: { id: websiteId },
    },
  });

  if (domainConflict) {
    return NextResponse.json(
      { error: "A website with this domain already exists" },
      { status: 409 }
    );
  }

  const updatedWebsite = await prisma.website.update({
    where: { id: websiteId },
    data: {
      name: name.trim(),
      domain: domain.trim().toLowerCase(),
    },
  });

  return NextResponse.json(updatedWebsite);
}

// DELETE - Delete website and all cascaded data
export async function DELETE(req: NextRequest, { params }: Params) {
  const { websiteId } = await params;

  const { authorized, website } = await checkWebsiteOwnership(websiteId);

  if (!authorized || !website) {
    return NextResponse.json(
      { error: "Unauthorized. You do not own this website." },
      { status: 403 }
    );
  }

  await prisma.website.delete({
    where: { id: websiteId },
  });

  return NextResponse.json({ success: true, message: "Website deleted successfully" });
}
