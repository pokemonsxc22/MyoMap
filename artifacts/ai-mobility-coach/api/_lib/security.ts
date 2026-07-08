import type { VercelRequest, VercelResponse } from "@vercel/node";

export function setSecurityHeaders(res: VercelResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

const requestBuckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const existing = requestBuckets.get(key) ?? [];
  const recent = existing.filter((t) => now - t < windowMs);
  if (recent.length >= maxRequests) return false;
  recent.push(now);
  requestBuckets.set(key, recent);
  return true;
}

export function checkSizeLimit(
  req: VercelRequest,
  res: VercelResponse,
  maxBytes = 1_000_000,
): boolean {
  const cl = req.headers["content-length"];
  if (cl && parseInt(cl, 10) > maxBytes) {
    setSecurityHeaders(res);
    res.status(413).json({ error: "Payload too large" });
    return false;
  }
  return true;
}
