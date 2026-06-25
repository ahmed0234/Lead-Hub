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

// Extract API secret key from headers, search query, or body
function getSecretKey(req: NextRequest, body: any): string | null {
  // 1. Check headers
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  const xApiKey = req.headers.get("x-api-key");
  if (xApiKey) return xApiKey.trim();

  const xApiSecret = req.headers.get("x-api-secret");
  if (xApiSecret) return xApiSecret.trim();

  // 2. Check query params
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secretKey") || url.searchParams.get("secret") || url.searchParams.get("apiKey");
  if (querySecret) return querySecret.trim();

  // 3. Check body fields
  if (body && typeof body === "object") {
    const keys = ["secretKey", "secret", "apiSecret", "_secret", "apiKey", "key"];
    for (const key of keys) {
      if (body[key] && typeof body[key] === "string") {
        return body[key].trim();
      }
    }
  }

  return null;
}

// Extract form data from body (either nested in a field or as flat keys)
function getFormData(body: any): Record<string, any> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }

  // If there is a nested object under a standard key, return that
  const nestedKeys = ["FormDataJson", "data", "fields", "payload"];
  for (const key of nestedKeys) {
    if (body[key] && typeof body[key] === "object" && !Array.isArray(body[key])) {
      return body[key];
    }
  }

  // Otherwise, return a shallow copy of the body with secret fields excluded
  const secretFields = ["secretKey", "secret", "apiSecret", "_secret", "apiKey", "key"];
  const formData: Record<string, any> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!secretFields.includes(key)) {
      formData[key] = value;
    }
  }
  return formData;
}

// Helper to set CORS headers on the response
function setCorsHeaders(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-api-secret");
  return res;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
}

/**
 * Public Lead Submission API — no auth required.
 * Called by external user sites using the website's unique apiSecret key.
 */
export async function POST(req: NextRequest) {
  let body: any = null;

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const secretKey = getSecretKey(req, body);

  if (!secretKey) {
    const errorResponse = NextResponse.json(
      { error: "API Secret Key is required (pass via secretKey in body, or Authorization/x-api-key headers)" },
      { status: 400 },
    );
    return setCorsHeaders(errorResponse);
  }

  const formData = getFormData(body);

  // 1. Find Website by Secret
  const website = await prisma.website.findUnique({
    where: { apiSecret: secretKey },
  });

  // 2. Validate it exists
  if (!website) {
    const errorResponse = NextResponse.json(
      { error: "Invalid API secret key" },
      { status: 404 },
    );
    return setCorsHeaders(errorResponse);
  }

  // 3. Validate it is active
  if (website.status !== "ACTIVE") {
    const errorResponse = NextResponse.json(
      { error: "This website is currently inactive and not accepting submissions" },
      { status: 403 },
    );
    return setCorsHeaders(errorResponse);
  }

  // Extract lead fields case-insensitively
  const name = extractField(formData, ["name", "full_name", "fullname", "first_name", "contact_name"]);
  const email = extractField(formData, ["email", "email_address", "emailaddress", "mail"]);
  const phone = extractField(formData, ["phone", "phone_number", "phonenumber", "telephone", "tel", "mobile"]);
  const message = extractField(formData, ["message", "msg", "comment", "comments", "body", "note", "notes", "feedback"]);

  // Extract browser and request metadata
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "Unknown";
  const userAgent = req.headers.get("userAgent") || req.headers.get("user-agent") || "Unknown";
  const referrer = req.headers.get("referer") || req.headers.get("referrer") || "Unknown";

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
      metadata: formData,
      submittedAt: new Date(),
    },
  });

  const successResponse = NextResponse.json(
    { success: true, leadId: lead.id },
    { status: 201 },
  );
  return setCorsHeaders(successResponse);
}
