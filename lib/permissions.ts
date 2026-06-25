import { auth } from "@clerk/nextjs/server";
import prisma from "./prisma";

export interface WebsitePermissionResult {
  authorized: boolean;
  website: any | null;
  user: any | null;
}

/**
 * Checks if the current authenticated user owns the requested website.
 * Verified entirely server-side.
 */
export async function checkWebsiteOwnership(
  websiteId: string
): Promise<WebsitePermissionResult> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { authorized: false, website: null, user: null };
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
  });

  if (!user) {
    return { authorized: false, website: null, user: null };
  }

  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website || website.userId !== user.id) {
    return { authorized: false, website: null, user };
  }

  return {
    authorized: true,
    website,
    user,
  };
}

/**
 * Gets the current authenticated DB User based on Clerk userId.
 */
export async function getCurrentUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  return prisma.user.findUnique({
    where: { clerkUserId },
  });
}
