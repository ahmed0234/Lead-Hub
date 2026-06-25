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
  return primary ? primary.email_address : emails[0].email_address;
}

function buildUserName(
  firstName: string | null,
  lastName: string | null,
): string | null {
  if (!firstName && !lastName) return null;
  return [firstName, lastName].filter(Boolean).join(" ");
}

function generateWorkspaceSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${baseSlug || "workspace"}-${Math.random().toString(36).substring(2, 7)}`;
}

// -- Route Handler --

export async function POST(req: NextRequest) {
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;

  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("[clerk-webhook] Signature verification FAILED:", err);
    return new NextResponse("Webhook verification failed", { status: 400 });
  }

  const eventType = evt.type;
  const rawData = evt.data as Record<string, unknown>;
  const clerkId = rawData.id as string | undefined;

  console.log(`[clerk-webhook] Received event: ${eventType} | clerkId: ${clerkId}`);

  if (!clerkId) {
    console.error("[clerk-webhook] Payload missing id field:", rawData);
    return new NextResponse("Webhook payload missing id", { status: 400 });
  }

  try {
    // 1. Handle User Created
    if (eventType === "user.created") {
      const data = rawData as unknown as ClerkUserData;
      console.log("[clerk-webhook] user.created raw data:", JSON.stringify(data, null, 2));

      const email = getPrimaryEmail(data);
      const name = buildUserName(data.first_name, data.last_name);

      console.log(`[clerk-webhook] Parsed — email: ${email} | name: ${name}`);

      if (!email) {
        console.error("[clerk-webhook] user.created: no email found in payload");
        return new NextResponse("User has no email", { status: 400 });
      }

      // Idempotency: using findFirst is safer in case unique metadata mapping is out of sync
      const existingUser = await prisma.user.findFirst({
        where: { clerkId },
      });

      if (existingUser) {
        console.log(`[clerk-webhook] user.created: User ${clerkId} already exists in DB with id ${existingUser.id} — skipping creation`);
        return new NextResponse("User already exists", { status: 200 });
      }

      const workspaceName = name ? `${name}'s Workspace` : `${email}'s Workspace`;
      const workspaceSlug = generateWorkspaceSlug(workspaceName);

      console.log(`[clerk-webhook] Creating user and workspace: "${workspaceName}"`);

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            clerkId,
            email,
            name,
          },
        });
        console.log(`[clerk-webhook] User record created: id ${user.id}`);

        const workspace = await tx.workspace.create({
          data: {
            name: workspaceName,
            slug: workspaceSlug,
          },
        });
        console.log(`[clerk-webhook] Workspace record created: id ${workspace.id}`);

        const member = await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: "OWNER",
            updatedAt: new Date(),
          },
        });
        console.log(`[clerk-webhook] WorkspaceMember record created: id ${member.id}`);
      });

      console.log(`[clerk-webhook] user.created: SUCCESS for clerkId ${clerkId}`);
      return new NextResponse("User and personal workspace created", { status: 201 });
    }

    // 2. Handle User Updated
    if (eventType === "user.updated") {
      const data = rawData as unknown as ClerkUserData;
      console.log("[clerk-webhook] user.updated raw data:", JSON.stringify(data, null, 2));

      const email = getPrimaryEmail(data);
      const name = buildUserName(data.first_name, data.last_name);

      console.log(`[clerk-webhook] Parsed — email: ${email} | name: ${name}`);

      if (!email) {
        console.error("[clerk-webhook] user.updated: no email found in payload");
        return new NextResponse("User has no email", { status: 400 });
      }

      console.log(`[clerk-webhook] Searching for user with clerkId: ${clerkId}`);
      const existingUser = await prisma.user.findFirst({
        where: { clerkId },
      });

      if (!existingUser) {
        console.warn(`[clerk-webhook] user.updated: clerkId ${clerkId} not found in DB — skipping update`);
        return new NextResponse("User not found", { status: 200 });
      }

      console.log(`[clerk-webhook] Updating user ${existingUser.id} with new data...`);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email,
          name,
        },
      });
      console.log(`[clerk-webhook] User updated successfully:`, JSON.stringify(updatedUser, null, 2));

      console.log(`[clerk-webhook] user.updated: SUCCESS for clerkId ${clerkId}`);
      return new NextResponse("User updated", { status: 200 });
    }

    // 3. Handle User Deleted
    if (eventType === "user.deleted") {
      console.log(`[clerk-webhook] user.deleted: looking up clerkId ${clerkId}`);
      const existingUser = await prisma.user.findFirst({
        where: { clerkId },
      });

      if (!existingUser) {
        console.warn(`[clerk-webhook] user.deleted: clerkId ${clerkId} not found in DB — already deleted`);
        return new NextResponse("User already deleted", { status: 200 });
      }

      console.log(`[clerk-webhook] Deleting user ${existingUser.id}...`);
      const deletedUser = await prisma.user.delete({
        where: { id: existingUser.id },
      });
      console.log(`[clerk-webhook] User deleted successfully:`, JSON.stringify(deletedUser, null, 2));

      console.log(`[clerk-webhook] user.deleted: SUCCESS for clerkId ${clerkId}`);
      return new NextResponse("User deleted", { status: 200 });
    }

    console.log(`[clerk-webhook] Unhandled event type: ${eventType}`);
    return new NextResponse("Webhook event ignored", { status: 200 });
  } catch (err) {
    console.error("[clerk-webhook] DB/logic error processing webhook:", err);
    if (err instanceof Error) {
      console.error("[clerk-webhook] Error stack trace:", err.stack);
    }
    return new NextResponse("Internal server error", { status: 500 });
  }
}
