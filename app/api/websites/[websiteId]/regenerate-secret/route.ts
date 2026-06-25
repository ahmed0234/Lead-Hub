import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkWebsiteOwnership } from "@/lib/permissions";
import { generateWebsiteSecret } from "@/lib/generateSecret";

interface Params {
  params: Promise<{ websiteId: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { websiteId } = await params;

  const { authorized, website } = await checkWebsiteOwnership(websiteId);

  if (!authorized || !website) {
    return NextResponse.json(
      { error: "Unauthorized. You do not own this website." },
      { status: 403 }
    );
  }

  const apiSecret = generateWebsiteSecret();

  await prisma.website.update({
    where: { id: websiteId },
    data: {
      apiSecret,
    },
  });

  return NextResponse.json({ apiSecret });
}
