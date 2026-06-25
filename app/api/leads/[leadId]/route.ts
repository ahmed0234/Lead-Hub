import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";

interface Params {
  params: Promise<{ leadId: string }>;
}

// DELETE - Delete a specific lead (requires website ownership check)
export async function DELETE(req: NextRequest, { params }: Params) {
  const { leadId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the lead and its associated website
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      website: true,
    },
  });

  if (!lead) {
    return NextResponse.json(
      { error: "Lead not found" },
      { status: 404 }
    );
  }

  // Authorize: website owner check
  if (lead.website.userId !== user.id) {
    return NextResponse.json(
      { error: "Unauthorized. You do not own this lead's website." },
      { status: 403 }
    );
  }

  await prisma.lead.delete({
    where: { id: leadId },
  });

  return NextResponse.json({ success: true, message: "Lead deleted successfully" });
}

// Case-insensitive extractor helper for form data fields
function extractField(obj: Record<string, any>, possibleKeys: string[]): string | null {
  const keys = Object.keys(obj);
  for (const p of possibleKeys) {
    const match = keys.find((k) => k.toLowerCase() === p.toLowerCase());
    if (match) {
      const val = obj[match];
      if (typeof val === "string") return val.trim();
      if (typeof val === "number") return String(val);
    }
  }
  return null;
}

// PATCH - Update a specific lead (requires website ownership check)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { leadId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the lead and its associated website
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      website: true,
    },
  });

  if (!lead) {
    return NextResponse.json(
      { error: "Lead not found" },
      { status: 404 }
    );
  }

  // Authorize: website owner check
  if (lead.website.userId !== user.id) {
    return NextResponse.json(
      { error: "Unauthorized. You do not own this lead's website." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { status, source, metadata } = body;

    // Merge status, source and other custom fields into metadata Json
    const existingMetadata = (lead.metadata as Record<string, any>) || {};
    const updatedMetadata = {
      ...existingMetadata,
      ...(metadata || {}),
    };
    if (status !== undefined) updatedMetadata.status = status;
    if (source !== undefined) updatedMetadata.source = source;

    // Sync database columns case-insensitively with metadata keys
    const name = extractField(updatedMetadata, ["name", "full_name", "fullname", "first_name", "contact_name"]);
    const email = extractField(updatedMetadata, ["email", "email_address", "emailaddress", "mail"]);
    const phone = extractField(updatedMetadata, ["phone", "phone_number", "phonenumber", "telephone", "tel", "mobile"]);
    const message = extractField(updatedMetadata, ["message", "msg", "comment", "comments", "body", "note", "notes", "feedback"]);

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        name,
        email,
        phone,
        message,
        metadata: updatedMetadata,
      },
    });

    // Make it serializable for frontend responses
    const serializableLead = {
      ...updatedLead,
      submittedAt: updatedLead.submittedAt.toISOString(),
      createdAt: updatedLead.createdAt.toISOString(),
    };

    return NextResponse.json({ success: true, lead: serializableLead });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update lead" },
      { status: 500 }
    );
  }
}


