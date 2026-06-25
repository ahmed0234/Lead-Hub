import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ─── Interfaces ──────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // BUG FIX #1: verifyWebhook() from @clerk/nextjs/webhooks auto-reads
  // CLERK_WEBHOOK_SIGNING_SECRET from env — NOT CLERK_WEBHOOK_SECRET.
  // Your .env already has the correct key name so this will work.
  // However if verification silently fails, it throws, which is caught below.
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;

  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    // This is the most common failure point — log the full error so you can
    // distinguish a bad signature from a missing env var.
    console.error("[clerk-webhook] Signature verification FAILED:", err);
    return new NextResponse("Webhook verification failed", { status: 400 });
  }

  // ── Extract top-level fields ──────────────────────────────────────────────
  const eventType = evt.type;

  // BUG FIX #2: For user.deleted, Clerk sends a *partial* payload where
  // email_addresses and other fields may be absent. Casting the whole payload
  // as ClerkUserData and then reading email_addresses crashes the handler for
  // deletions. We keep ClerkUserData only for user.created / user.updated.
  const rawData = evt.data as Record<string, unknown>;
  const clerkId = rawData.id as string | undefined;

  console.log(`[clerk-webhook] Received event: ${eventType} | clerkId: ${clerkId}`);

  if (!clerkId) {
    console.error("[clerk-webhook] Payload missing id field:", rawData);
    return new NextResponse("Webhook payload missing id", { status: 400 });
  }

  try {
    // ── user.created ────────────────────────────────────────────────────────
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

      // Idempotency: skip if already exists (handles webhook retries)
      const existingUser = await prisma.user.findUnique({ where: { clerkId } });
      if (existingUser) {
        console.log(`[clerk-webhook] user.created: User ${clerkId} already exists — skipping`);
        return new NextResponse("User already exists", { status: 200 });
      }

      const workspaceName = name
        ? `${name}'s Workspace`
        : `${email}'s Workspace`;
      const workspaceSlug = generateWorkspaceSlug(workspaceName);

      console.log(`[clerk-webhook] Creating user + workspace "${workspaceName}" (slug: ${workspaceSlug})`);

      // BUG FIX #3: WorkspaceMember.updatedAt has @updatedAt but NO @default().
      // When Prisma creates a WorkspaceMember row it needs an initial value for
      // updatedAt. In older Prisma versions this was implicit; in Prisma 6+ with
      // the pg adapter it throws "null value in column violates not-null" inside
      // the transaction, which rolls everything back silently.
      // Fix: add @default(now()) to WorkspaceMember.updatedAt in schema (done
      // below as a schema patch note) AND pass an explicit value here as a
      // belt-and-suspenders guard until the next migration runs.
      await prisma.$transaction(async (tx) => {
        console.log("[clerk-webhook] TX: creating User row...");
        const user = await tx.user.create({
          data: { clerkId, email, name },
        });
        console.log(`[clerk-webhook] TX: User created — id: ${user.id}`);

        console.log("[clerk-webhook] TX: creating Workspace row...");
        const workspace = await tx.workspace.create({
          data: { name: workspaceName, slug: workspaceSlug },
        });
        console.log(`[clerk-webhook] TX: Workspace created — id: ${workspace.id}`);

        console.log("[clerk-webhook] TX: creating WorkspaceMember row...");
        const member = await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: "OWNER",
            // Explicit updatedAt guards against Prisma adapter not auto-filling it
            updatedAt: new Date(),
          },
        });
        console.log(`[clerk-webhook] TX: WorkspaceMember created — id: ${member.id}`);
      });

      console.log(`[clerk-webhook] user.created: SUCCESS for clerkId ${clerkId}`);
      return new NextResponse("User and personal workspace created", { status: 201 });
    }

    // ── user.updated ────────────────────────────────────────────────────────
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

      const existingUser = await prisma.user.findUnique({ where: { clerkId } });
      if (!existingUser) {
        console.warn(`[clerk-webhook] user.updated: clerkId ${clerkId} not found — skipping`);
        return new NextResponse("User not found", { status: 200 });
      }

      console.log(`[clerk-webhook] Updating user ${clerkId}...`);
      await prisma.user.update({
        where: { clerkId },
        data: { email, name },
      });

      console.log(`[clerk-webhook] user.updated: SUCCESS for clerkId ${clerkId}`);
      return new NextResponse("User updated", { status: 200 });
    }

    // ── user.deleted ────────────────────────────────────────────────────────
    if (eventType === "user.deleted") {
      // BUG FIX #4: Clerk sends user.deleted with a *partial* payload.
      // The id field is present but email_addresses is NOT. Any code that
      // tries to read data.email_addresses here will throw TypeError and the
      // catch block returns 400, making Clerk retry forever.
      // We only need clerkId here — already extracted above.

      console.log(`[clerk-webhook] user.deleted: looking up clerkId ${clerkId}`);

      const existingUser = await prisma.user.findUnique({ where: { clerkId } });
      if (!existingUser) {
        console.warn(`[clerk-webhook] user.deleted: clerkId ${clerkId} not found — already deleted`);
        return new NextResponse("User already deleted", { status: 200 });
      }

      console.log(`[clerk-webhook] Deleting user ${clerkId}...`);
      // onDelete: Cascade on WorkspaceMember + LeadNote handles child rows
      await prisma.user.delete({ where: { clerkId } });

      console.log(`[clerk-webhook] user.deleted: SUCCESS for clerkId ${clerkId}`);
      return new NextResponse("User deleted", { status: 200 });
    }

    // Unhandled event — return 200 so Clerk does not retry
    console.log(`[clerk-webhook] Unhandled event type: ${eventType} — ignoring`);
    return new NextResponse("Webhook event ignored", { status: 200 });

  } catch (err) {
    // Log the full error object and stack so you can pinpoint the exact line
    console.error("[clerk-webhook] DB/logic error:", err);
    if (err instanceof Error) {
      console.error("[clerk-webhook] Stack:", err.stack);
    }
    return new NextResponse("Internal server error", { status: 500 });
  }
}
