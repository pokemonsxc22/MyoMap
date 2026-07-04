import type { VercelRequest, VercelResponse } from "@vercel/node";
import { saveRetake } from "./_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { sessionId, screen } = req.body as {
    sessionId?: string;
    screen?: Record<string, "yes" | "no">;
  };

  if (!sessionId || !screen || typeof screen !== "object") {
    res.status(400).json({ error: "Missing sessionId or screen answers" });
    return;
  }

  void saveRetake(sessionId, screen);
  res.json({ saved: true });
}
