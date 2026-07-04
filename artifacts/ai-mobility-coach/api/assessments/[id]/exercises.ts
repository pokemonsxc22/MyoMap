import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseClient } from "../../_lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const id        = req.query.id as string;
  const { exercises } = req.body as { exercises?: unknown[] };

  if (!id || !Array.isArray(exercises)) {
    res.status(400).json({ error: "Missing id or exercises array" });
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
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: "Failed to update exercises" });
    return;
  }

  res.json({ ok: true });
}
