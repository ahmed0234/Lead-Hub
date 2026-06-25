import crypto from "crypto";

/**
 * Generates a cryptographically secure website API key.
 * Format: lh_<16 random hex chars>
 * Example: lh_x8f3k29s7d91ab4c
 */
export function generateWebsiteSecret(): string {
  const randomPart = crypto.randomBytes(12).toString("hex");
  return `lh_${randomPart}`;
}
