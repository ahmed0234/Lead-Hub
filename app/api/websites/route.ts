import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateWebsiteSecret } from "@/lib/generateSecret";
import { getCurrentUser } from "@/lib/permissions";

// GET - Retrieve all websites belonging directly to the authenticated user
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const websites = await prisma.website.findMany({
    where: { userId: user.id },
    include: {
      _count: { select: { leads: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(websites, { status: 200 });
}

// POST - Create a website directly under the authenticated user
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; domain?: string; description?: string };
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

  const apiSecret = generateWebsiteSecret();

  const website = await prisma.website.create({
    data: {
      userId: user.id,
      name: name.trim(),
      domain: domain.trim().toLowerCase(),
      apiSecret,
      status: "ACTIVE",
    },
  });

  return NextResponse.json(website, { status: 201 });
}
