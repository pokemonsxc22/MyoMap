import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setSecurityHeaders } from "./_lib/security.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  setSecurityHeaders(res);
  res.json({ status: "ok" });
}
