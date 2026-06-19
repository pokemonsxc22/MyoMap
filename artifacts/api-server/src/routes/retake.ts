import { Router, type IRouter } from "express";
import { saveRetake } from "../lib/supabase";

const router: IRouter = Router();

router.post("/retake", async (req, res): Promise<void> => {
  const { sessionId, screen } = req.body as {
    sessionId?: string;
    screen?: Record<string, "yes" | "no">;
  };

  if (!sessionId || !screen || typeof screen !== "object") {
    res.status(400).json({ error: "Missing sessionId or screen answers" });
    return;
  }

  req.log.info({ sessionId, questionCount: Object.keys(screen).length }, "Retake submitted");

  // Best-effort Supabase update — does not fail the request if Supabase is down
  void saveRetake(sessionId, screen);

  res.json({ saved: true });
});

export default router;
