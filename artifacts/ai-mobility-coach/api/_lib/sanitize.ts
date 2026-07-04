function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export function sanitizeText(input: unknown, maxLen = 1000): string {
  if (typeof input !== "string") return "";
  return stripHtml(input).slice(0, maxLen);
}

export function sanitizeStringArray(input: unknown, maxItemLen = 200): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((v): v is string => typeof v === "string")
    .map(v => stripHtml(v).slice(0, maxItemLen));
}
