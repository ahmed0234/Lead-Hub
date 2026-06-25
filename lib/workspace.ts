import prisma from "./prisma";

/**
 * Resolves a DB Workspace from a Clerk Organization ID.
 * Returns null if no workspace is linked to that org yet.
 */
export async function getWorkspaceByClerkOrg(clerkOrgId: string) {
  return prisma.workspace.findFirst({
    where: { clerkOrgId },
  });
}
