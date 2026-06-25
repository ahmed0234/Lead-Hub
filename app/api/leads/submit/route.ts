import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Case-insensitive extractor helper for form data fields
function extractField(obj: Record<string, any>, possibleKeys: string[]): string | null {
  const keys = Object.keys(obj);
  for (const p of possibleKeys) {
    const match = keys.find((k) => k.toLowerCase() === p.toLowerCase());
    if (match) {
      const val = obj[match];
      if (typeof val === "string") return val.trim();
      if (typeof val === "number") return String(val);
    }
  }
  return null;
}

/**
 * Public Lead Submission API — no auth required.
 * Called by external user sites using the website's unique apiSecret key.
 *
 * Payload structure:
 * {
 *   "secretKey": "lh_...",
 *   "FormDataJson": {
 *      "name": "Jane Doe",
 *      "email": "jane@example.com",
 *      "phone": "+123456789",
 *      "message": "Interested in pricing info",
 *      ...
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  let body: {
    secretKey?: string;
    FormDataJson?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { secretKey, FormDataJson } = body;

  if (!secretKey || typeof secretKey !== "string") {
    return NextResponse.json(
      { error: "secretKey is required at the root level" },
      { status: 400 },
    );
  }

  if (!FormDataJson || typeof FormDataJson !== "object" || Array.isArray(FormDataJson)) {
    return NextResponse.json(
      { error: "FormDataJson must be a JSON object containing the submission fields" },
      { status: 400 },
    );
  }

  // 1. Find Website by Secret
  const website = await prisma.website.findUnique({
    where: { apiSecret: secretKey },
  });

  // 2. Validate it exists
  if (!website) {
    return NextResponse.json(
      { error: "Invalid API secret key" },
      { status: 404 },
    );
  }

  // 3. Validate it is active
  if (website.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "This website is currently inactive and not accepting submissions" },
      { status: 403 },
    );
  }

  // Extract lead fields case-insensitively
  const name = extractField(FormDataJson, ["name", "full_name", "fullname", "first_name", "contact_name"]);
  const email = extractField(FormDataJson, ["email", "email_address", "emailaddress", "mail"]);
  const phone = extractField(FormDataJson, ["phone", "phone_number", "phonenumber", "telephone", "tel", "mobile"]);
  const message = extractField(FormDataJson, ["message", "msg", "comment", "comments", "body", "note", "notes", "feedback"]);

  // Extract browser and request metadata
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "Unknown";
  const userAgent = req.headers.get("user-agent") || "Unknown";
  const referrer = req.headers.get("referer") || "Unknown";

  // 4. Store the lead under that Website
  const lead = await prisma.lead.create({
    data: {
      websiteId: website.id,
      name,
      email,
      phone,
      message,
      ip,
      userAgent,
      referrer,
      metadata: FormDataJson,
      submittedAt: new Date(),
    },
  });

  return NextResponse.json(
    { success: true, leadId: lead.id },
    { status: 201 },
  );
}
