import type { VercelRequest, VercelResponse } from "@vercel/node";
import { saveRetake } from "./_lib/supabase.js";
import { verifyAuth } from "./_lib/auth.js";
import { setSecurityHeaders, checkSizeLimit } from "./_lib/security.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setSecurityHeaders(res);

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!checkSizeLimit(req, res)) return;

  const { userId, error: authError } = await verifyAuth(req);
  if (authError || !userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { sessionId, screen } = req.body as {
    sessionId?: string;
    screen?: Record<string, "yes" | "no">;
  };

  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 200) {
    res.status(400).json({ error: "Missing or invalid sessionId" });
    return;
  }

  if (!screen || typeof screen !== "object" || Array.isArray(screen)) {
    res.status(400).json({ error: "Missing or invalid screen answers" });
    return;
  }

  void saveRetake(sessionId, screen);
  res.json({ saved: true });
}
