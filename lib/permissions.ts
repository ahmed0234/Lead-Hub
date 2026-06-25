import { auth } from "@clerk/nextjs/server";
import prisma from "./prisma";
import { getWorkspaceByClerkOrg } from "./workspace";
import { WorkspaceRole } from "@/app/generated/prisma/client";

export interface PermissionCheckResult {
  authorized: boolean;
  role: WorkspaceRole | null;
  workspaceId: string | null;
  userId: string | null;
}

/**
 * Checks if the current authenticated user has the required roles within the active Clerk organization's workspace.
 * Returns information about the resolved user, workspace, role, and authorization status.
 */
export async function checkWorkspacePermission(
  allowedRoles: WorkspaceRole[] = ["OWNER", "ADMIN"]
): Promise<PermissionCheckResult> {
  const { orgId, userId: clerkUserId } = await auth();

  if (!orgId || !clerkUserId) {
    return { authorized: false, role: null, workspaceId: null, userId: null };
  }

  const workspace = await getWorkspaceByClerkOrg(orgId);
  if (!workspace) {
    return { authorized: false, role: null, workspaceId: null, userId: null };
  }

  const user = await prisma.user.findFirst({
    where: { clerkId: clerkUserId },
  });

  if (!user) {
    return { authorized: false, role: null, workspaceId: workspace.id, userId: null };
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: workspace.id,
      userId: user.id,
    },
  });

  if (!member) {
    return { authorized: false, role: null, workspaceId: workspace.id, userId: user.id };
  }

  const authorized = allowedRoles.includes(member.role);

  return {
    authorized,
    role: member.role,
    workspaceId: workspace.id,
    userId: user.id,
  };
}

/**
 * Checks if a specific website belongs to the active organization's workspace,
 * and if the current user has the required roles.
 */
export async function checkWebsitePermission(
  websiteId: string,
  allowedRoles: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER"]
) {
  const { orgId, userId: clerkUserId } = await auth();

  if (!orgId || !clerkUserId) {
    return { authorized: false, website: null, role: null, workspace: null };
  }

  const workspace = await getWorkspaceByClerkOrg(orgId);
  if (!workspace) {
    return { authorized: false, website: null, role: null, workspace: null };
  }

  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website || website.workspaceId !== workspace.id) {
    return { authorized: false, website: null, role: null, workspace: null };
  }

  const user = await prisma.user.findFirst({
    where: { clerkId: clerkUserId },
  });

  if (!user) {
    return { authorized: false, website, role: null, workspace };
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: workspace.id,
      userId: user.id,
    },
  });

  if (!member) {
    return { authorized: false, website, role: null, workspace };
  }

  const authorized = allowedRoles.includes(member.role);

  return {
    authorized,
    website,
    role: member.role,
    workspace,
  };
}
