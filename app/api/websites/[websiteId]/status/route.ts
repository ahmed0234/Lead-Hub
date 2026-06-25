import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkWebsiteOwnership } from "@/lib/permissions";

interface Params {
  params: Promise<{ websiteId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { websiteId } = await params;

  const { authorized, website } = await checkWebsiteOwnership(websiteId);

  if (!authorized || !website) {
    return NextResponse.json(
      { error: "Unauthorized. You do not own this website." },
      { status: 403 }
    );
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status } = body;

  if (status !== "ACTIVE" && status !== "INACTIVE") {
    return NextResponse.json(
      { error: "Status must be ACTIVE or INACTIVE" },
      { status: 400 }
    );
  }

  const updatedWebsite = await prisma.website.update({
    where: { id: websiteId },
    data: {
      status,
    },
  });

  return NextResponse.json(updatedWebsite);
}
