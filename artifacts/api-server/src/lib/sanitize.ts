/**
 * Strip HTML/script tags from a string to prevent XSS payloads reaching the
 * AI or being stored in the database.
 */
function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Sanitize a text field: strip HTML tags and hard-truncate to `maxLen`.
 * Returns an empty string for non-string inputs.
 */
export function sanitizeText(input: unknown, maxLen = 1000): string {
  if (typeof input !== "string") return "";
  return stripHtml(input).slice(0, maxLen);
}

/**
 * Sanitize an array of string values (e.g. the `worsens` field).
 * Non-string items are dropped.
 */
export function sanitizeStringArray(input: unknown, maxItemLen = 200): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((v): v is string => typeof v === "string")
    .map(v => stripHtml(v).slice(0, maxItemLen));
}
