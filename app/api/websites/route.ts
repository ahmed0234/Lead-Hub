import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateWebsiteSecret } from "@/lib/generateSecret";
import { getWorkspaceByClerkOrg } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json(
      { error: "No active organization. Please select an organization." },
      { status: 403 },
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
    return NextResponse.json(
      { error: "Website name is required" },
      { status: 400 },
    );
  }

  if (!domain || typeof domain !== "string" || domain.trim().length === 0) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  // Resolve the DB workspace for this Clerk org
  const workspace = await getWorkspaceByClerkOrg(orgId);

  if (!workspace) {
    // Auto-create the workspace linked to this Clerk org if it doesn't exist yet
    const newWorkspace = await prisma.workspace.create({
      data: {
        name: `Org Workspace`,
        slug: `org-${orgId.slice(-8)}`,
        clerkOrgId: orgId,
      },
    });

    const secret = generateWebsiteSecret();

    const website = await prisma.website.create({
      data: {
        workspaceId: newWorkspace.id,
        name: name.trim(),
        domain: domain.trim().toLowerCase(),
        secret,
      },
    });

    return NextResponse.json(website, { status: 201 });
  }

  // Check for domain conflict
  const existingDomain = await prisma.website.findUnique({
    where: { domain: domain.trim().toLowerCase() },
  });

  if (existingDomain) {
    return NextResponse.json(
      { error: "A website with this domain already exists" },
      { status: 409 },
    );
  }

  const secret = generateWebsiteSecret();

  const website = await prisma.website.create({
    data: {
      workspaceId: workspace.id,
      name: name.trim(),
      domain: domain.trim().toLowerCase(),
      secret,
    },
  });

  return NextResponse.json(website, { status: 201 });
}

export async function GET() {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const workspace = await getWorkspaceByClerkOrg(orgId);

  if (!workspace) {
    return NextResponse.json([], { status: 200 });
  }

  const websites = await prisma.website.findMany({
    where: { workspaceId: workspace.id },
    include: {
      _count: { select: { leads: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(websites, { status: 200 });
}
