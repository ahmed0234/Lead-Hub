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
