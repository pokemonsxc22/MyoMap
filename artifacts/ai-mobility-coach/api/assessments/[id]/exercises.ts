import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseClient } from "../../_lib/supabase.js";
import { verifyAuth } from "../../_lib/auth.js";
import { setSecurityHeaders, checkSizeLimit } from "../../_lib/security.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setSecurityHeaders(res);

  if (req.method !== "PUT") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!checkSizeLimit(req, res)) return;

  const { userId, error: authError } = await verifyAuth(req);
  if (authError || !userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = req.query.id as string;
  const { exercises } = req.body as { exercises?: unknown[] };

  if (!id || typeof id !== "string" || id.length > 200) {
    res.status(400).json({ error: "Missing or invalid id" });
    return;
  }

  if (!Array.isArray(exercises) || exercises.length > 20) {
    res.status(400).json({ error: "Missing or invalid exercises array" });
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    res.json({ ok: true });
    return;
  }

  const { error } = await client
    .from("assessments")
    .update({ exercises_json: exercises })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    res.status(500).json({ error: "Failed to update exercises" });
    return;
  }

  res.json({ ok: true });
}
