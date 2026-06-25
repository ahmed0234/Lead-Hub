import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkWebsitePermission } from "@/lib/permissions";

interface Params {
  params: Promise<{ websiteId: string }>;
}

// GET - Retrieve website details, stats, and workspace team members
export async function GET(req: NextRequest, { params }: Params) {
  const { websiteId } = await params;

  // Verify website belongs to user's active workspace (MEMBER role is sufficient for reading)
  const { authorized, website, workspace, role } = await checkWebsitePermission(
    websiteId,
    ["OWNER", "ADMIN", "MEMBER"]
  );

  if (!authorized || !website || !workspace) {
    return NextResponse.json(
      { error: "Not found or unauthorized" },
      { status: 404 }
    );
  }

  // Fetch website stats
  const totalLeads = await prisma.lead.count({
    where: { websiteId },
  });

  const newLeads = await prisma.lead.count({
    where: { websiteId, status: "NEW" },
  });

  const lastLead = await prisma.lead.findFirst({
    where: { websiteId },
    orderBy: { submittedAt: "desc" },
    select: { submittedAt: true },
  });

  // Fetch workspace members (read-only for the team list)
  const members = await prisma.workspaceMember.findMany({
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

  return NextResponse.json({
    website: {
      ...website,
      stats: {
        totalLeads,
        newLeads,
        lastSubmission: lastLead?.submittedAt || null,
        createdAt: website.createdAt,
      },
    },
    role, // Current user's workspace role (OWNER/ADMIN/MEMBER)
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      createdAt: m.createdAt,
    })),
  });
}

// PUT - Edit website details (requires OWNER or ADMIN)
export async function PUT(req: NextRequest, { params }: Params) {
  const { websiteId } = await params;

  // Require OWNER or ADMIN role
  const { authorized, website } = await checkWebsitePermission(
    websiteId,
    ["OWNER", "ADMIN"]
  );

  if (!authorized || !website) {
    return NextResponse.json(
      { error: "Unauthorized. Only workspace owners and admins can edit websites." },
      { status: 403 }
    );
  }

  let body: { name?: string; domain?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, domain, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Website name is required" }, { status: 400 });
  }

  if (!domain || typeof domain !== "string" || domain.trim().length === 0) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  // Check for domain conflict with other websites
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
      description: description?.trim() || null,
    },
  });

  return NextResponse.json(updatedWebsite);
}

// DELETE - Delete website and all cascaded data (requires OWNER or ADMIN)
export async function DELETE(req: NextRequest, { params }: Params) {
  const { websiteId } = await params;

  // Require OWNER or ADMIN role
  const { authorized, website } = await checkWebsitePermission(
    websiteId,
    ["OWNER", "ADMIN"]
  );

  if (!authorized || !website) {
    return NextResponse.json(
      { error: "Unauthorized. Only workspace owners and admins can delete websites." },
      { status: 403 }
    );
  }

  // Prisma handles cascading deletes for leads, schemas, etc. due to `onDelete: Cascade` in schema
  await prisma.website.delete({
    where: { id: websiteId },
  });

  return NextResponse.json({ success: true, message: "Website deleted successfully" });
}
