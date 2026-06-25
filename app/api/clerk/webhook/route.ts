import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// -- Interfaces for type safety --

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
}

// -- Helper Functions --

function getPrimaryEmail(data: ClerkUserData): string {
  const emails = data.email_addresses;
  if (!emails || !Array.isArray(emails) || emails.length === 0) return "";
  const primary = emails.find((e) => e.id === data.primary_email_address_id);
  if (primary) return primary.email_address;
  return emails[0].email_address; // Fallback to first email if primary ID doesn't match
}

function buildUserName(firstName: string | null, lastName: string | null): string | null {
  if (!firstName && !lastName) return null;
  return [firstName, lastName].filter(Boolean).join(" ");
}

function generateWorkspaceSlug(name: string): string {
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  // Append random string to guarantee uniqueness
  return `${baseSlug || "workspace"}-${Math.random().toString(36).substring(2, 7)}`;
}

// -- Route Handler --

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);
    const { id: clerkId } = evt.data as { id: string };
    const eventType = evt.type;

    if (!clerkId) {
      return new NextResponse("Webhook payload missing id", { status: 400 });
    }

    // 1. Handle User Created
    if (eventType === "user.created") {
      const data = evt.data as ClerkUserData;
      const email = getPrimaryEmail(data);
      const name = buildUserName(data.first_name, data.last_name);

      if (!email) {
        return new NextResponse("User has no email", { status: 400 });
      }

      // Check for existing user to remain idempotent and avoid unique constraint errors
      const existingUser = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (existingUser) {
        console.log(`User ${clerkId} already exists. Skipping creation.`);
        return new NextResponse("User already exists", { status: 200 });
      }

      const workspaceName = name ? `${name}'s Workspace` : `${email}'s Workspace`;
      const workspaceSlug = generateWorkspaceSlug(workspaceName);

      // Use a transaction to ensure User, Workspace, and WorkspaceMember are created atomically
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            clerkId,
            email,
            name,
          },
        });

        const workspace = await tx.workspace.create({
          data: {
            name: workspaceName,
            slug: workspaceSlug,
          },
        });

        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: "OWNER",
          },
        });
      });

      return new NextResponse("User and personal workspace created", { status: 201 });
    }

    // 2. Handle User Updated
    if (eventType === "user.updated") {
      const data = evt.data as ClerkUserData;
      const email = getPrimaryEmail(data);
      const name = buildUserName(data.first_name, data.last_name);

      if (!email) {
        return new NextResponse("User has no email", { status: 400 });
      }

      const existingUser = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!existingUser) {
        // Return 200 so webhook isn't retried unnecessarily for an unknown user
        console.warn(`User ${clerkId} not found for update. Gracefully skipping.`);
        return new NextResponse("User not found", { status: 200 });
      }

      await prisma.user.update({
        where: { clerkId },
        data: {
          email,
          name,
        },
      });

      return new NextResponse("User updated", { status: 200 });
    }

    // 3. Handle User Deleted
    if (eventType === "user.deleted") {
      const existingUser = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!existingUser) {
        console.warn(`User ${clerkId} not found for deletion. Gracefully skipping.`);
        return new NextResponse("User already deleted", { status: 200 });
      }

      // Prisma relation onDelete: Cascade will handle deleting associated WorkspaceMembers, etc.
      await prisma.user.delete({
        where: { clerkId },
      });

      return new NextResponse("User deleted", { status: 200 });
    }

    // Return 200 for unhandled event types so Clerk doesn't retry them
    return new NextResponse("Webhook event ignored", { status: 200 });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new NextResponse("Error processing webhook", { status: 400 });
  }
}
