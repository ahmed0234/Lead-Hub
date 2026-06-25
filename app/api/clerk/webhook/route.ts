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
  image_url?: string | null;
  profile_image_url?: string | null;
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
  const clerkUserId = rawData.id as string | undefined;

  console.log(`[clerk-webhook] Received event: ${eventType} | clerkUserId: ${clerkUserId}`);

  if (!clerkUserId) {
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
      const image = data.image_url || data.profile_image_url || null;

      console.log(`[clerk-webhook] Parsed — email: ${email} | name: ${name}`);

      if (!email) {
        console.error("[clerk-webhook] user.created: no email found in payload");
        return new NextResponse("User has no email", { status: 400 });
      }

      // Idempotency check
      const existingUser = await prisma.user.findUnique({
        where: { clerkUserId },
      });

      if (existingUser) {
        console.log(`[clerk-webhook] user.created: User ${clerkUserId} already exists in DB — skipping creation`);
        return new NextResponse("User already exists", { status: 200 });
      }

      console.log(`[clerk-webhook] Creating user: clerkUserId: ${clerkUserId}, email: ${email}`);

      const user = await prisma.user.create({
        data: {
          clerkUserId,
          email,
          name,
          image,
        },
      });

      console.log(`[clerk-webhook] User record created: id ${user.id}`);
      return new NextResponse("User record created", { status: 201 });
    }

    // 2. Handle User Updated
    if (eventType === "user.updated") {
      const data = rawData as unknown as ClerkUserData;
      console.log("[clerk-webhook] user.updated raw data:", JSON.stringify(data, null, 2));

      const email = getPrimaryEmail(data);
      const name = buildUserName(data.first_name, data.last_name);
      const image = data.image_url || data.profile_image_url || null;

      console.log(`[clerk-webhook] Parsed — email: ${email} | name: ${name}`);

      if (!email) {
        console.error("[clerk-webhook] user.updated: no email found in payload");
        return new NextResponse("User has no email", { status: 400 });
      }

      const existingUser = await prisma.user.findUnique({
        where: { clerkUserId },
      });

      if (!existingUser) {
        console.warn(`[clerk-webhook] user.updated: clerkUserId ${clerkUserId} not found in DB — skipping update`);
        return new NextResponse("User not found", { status: 200 });
      }

      console.log(`[clerk-webhook] Updating user ${existingUser.id}...`);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email,
          name,
          image,
        },
      });
      console.log(`[clerk-webhook] User updated successfully:`, JSON.stringify(updatedUser, null, 2));
      return new NextResponse("User updated", { status: 200 });
    }

    // 3. Handle User Deleted
    if (eventType === "user.deleted") {
      console.log(`[clerk-webhook] user.deleted: looking up clerkUserId ${clerkUserId}`);
      const existingUser = await prisma.user.findUnique({
        where: { clerkUserId },
      });

      if (!existingUser) {
        console.warn(`[clerk-webhook] user.deleted: clerkUserId ${clerkUserId} not found in DB — already deleted`);
        return new NextResponse("User already deleted", { status: 200 });
      }

      console.log(`[clerk-webhook] Deleting user ${existingUser.id}...`);
      const deletedUser = await prisma.user.delete({
        where: { id: existingUser.id },
      });
      console.log(`[clerk-webhook] User deleted successfully:`, JSON.stringify(deletedUser, null, 2));
      return new NextResponse("User deleted", { status: 200 });
    }

    console.log(`[clerk-webhook] Unhandled event type: ${eventType}`);
    return new NextResponse("Webhook event ignored", { status: 200 });
  } catch (err) {
    console.error("[clerk-webhook] Error processing Clerk webhook:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
