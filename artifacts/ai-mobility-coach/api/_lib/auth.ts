import type { VercelRequest } from "@vercel/node";
import { getSupabaseClient } from "./supabase.js";

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
  const client = getSupabaseClient();
  if (!client) {
    return { userId: null, error: "Auth service unavailable" };
  }
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    return { userId: null, error: "Invalid or expired token" };
  }
  return { userId: user.id, error: null };
}
