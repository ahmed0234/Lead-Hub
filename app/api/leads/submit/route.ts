import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Public endpoint — no authentication required.
 * External websites POST leads here using their website secret.
 *
 * Body: { websiteSecret: string, data: Record<string, unknown>, source?: string }
 */
export async function POST(req: NextRequest) {
  let body: {
    websiteSecret?: string;
    data?: Record<string, unknown>;
    source?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { websiteSecret, data, source } = body;

  if (!websiteSecret || typeof websiteSecret !== "string") {
    return NextResponse.json(
      { error: "websiteSecret is required" },
      { status: 400 },
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json(
      { error: "data must be a JSON object" },
      { status: 400 },
    );
  }

  // Look up the website by secret
  const website = await prisma.website.findUnique({
    where: { secret: websiteSecret },
  });

  if (!website) {
    return NextResponse.json(
      { error: "Invalid website secret" },
      { status: 404 },
    );
  }

  if (!website.isActive) {
    return NextResponse.json(
      { error: "This website is inactive and is not accepting leads" },
      { status: 403 },
    );
  }

  const lead = await prisma.lead.create({
    data: {
      websiteId: website.id,
      data,
      source: source ?? null,
      status: "NEW",
    },
  });

  return NextResponse.json(
    { success: true, leadId: lead.id },
    { status: 201 },
  );
}
