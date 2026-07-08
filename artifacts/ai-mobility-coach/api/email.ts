import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setSecurityHeaders } from "./_lib/security.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setSecurityHeaders(res);
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.status(501).json({ error: "Email sending is not yet implemented" });
}
