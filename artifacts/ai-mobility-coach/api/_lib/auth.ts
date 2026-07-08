import type { VercelRequest } from "@vercel/node";

export interface AuthResult {
  userId: string | null;
  error: string | null;
}

export async function verifyAuth(req: VercelRequest): Promise<AuthResult> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { userId: null, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.slice(7);

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { userId: null, error: "Invalid token format" };
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString()) as Record<string, unknown>;
    if (!payload.sub || typeof payload.sub !== "string") {
      return { userId: null, error: "Invalid token structure" };
    }

    return { userId: payload.sub, error: null };
  } catch {
    return { userId: null, error: "Invalid or malformed token" };
  }
}
