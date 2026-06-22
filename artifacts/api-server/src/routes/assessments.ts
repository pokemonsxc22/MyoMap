import { Router, type IRouter } from "express";
import { getSupabaseClient } from "../lib/supabase";

const router: IRouter = Router();

// PUT /assessments/:id/exercises — overwrite exercises_json for an assessment
router.put("/assessments/:id/exercises", async (req, res): Promise<void> => {
  const { id } = req.params;
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

  req.log.info({ id, count: exercises.length }, "Updating exercises_json");

  const { error } = await client
    .from("assessments")
    .update({ exercises_json: exercises })
    .eq("id", id);

  if (error) {
    req.log.error({ code: error.code, message: error.message }, "exercises PUT error");
    res.status(500).json({ error: "Failed to update exercises" });
    return;
  }

  res.json({ ok: true });
});

export default router;
