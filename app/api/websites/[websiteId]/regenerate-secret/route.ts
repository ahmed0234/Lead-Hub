import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkWebsitePermission } from "@/lib/permissions";
import { generateWebsiteSecret } from "@/lib/generateSecret";

interface Params {
  params: Promise<{ websiteId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { websiteId } = await params;

  // Require OWNER or ADMIN role
  const { authorized, website } = await checkWebsitePermission(
    websiteId,
    ["OWNER", "ADMIN"]
  );

  if (!authorized || !website) {
    return NextResponse.json(
      { error: "Unauthorized. Only workspace owners and admins can regenerate secrets." },
      { status: 403 }
    );
  }

  const newSecret = generateWebsiteSecret();

  await prisma.website.update({
    where: { id: websiteId },
    data: {
      secret: newSecret,
    },
  });

  return NextResponse.json({ secret: newSecret });
}
