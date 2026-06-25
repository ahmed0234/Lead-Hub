import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkWebsitePermission } from "@/lib/permissions";

interface Params {
  params: Promise<{ websiteId: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { websiteId } = await params;

  // Require OWNER or ADMIN role
  const { authorized, website } = await checkWebsitePermission(
    websiteId,
    ["OWNER", "ADMIN"]
  );

  if (!authorized || !website) {
    return NextResponse.json(
      { error: "Unauthorized. Only workspace owners and admins can toggle website status." },
      { status: 403 }
    );
  }

  let body: { isActive?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { isActive } = body;

  if (typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive must be a boolean" },
      { status: 400 }
    );
  }

  const updatedWebsite = await prisma.website.update({
    where: { id: websiteId },
    data: {
      isActive,
    },
  });

  return NextResponse.json(updatedWebsite);
}
