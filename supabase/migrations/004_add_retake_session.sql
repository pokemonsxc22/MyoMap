-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

-- Unique session ID so the retake can find and update the original row
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS assessments_session_id_idx ON assessments (session_id);

-- Retake answers (one column per question, mirroring the originals)
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS retake_overhead_reach  TEXT CHECK (retake_overhead_reach  IN ('yes','no')),
  ADD COLUMN IF NOT EXISTS retake_heels_flat       TEXT CHECK (retake_heels_flat       IN ('yes','no')),
  ADD COLUMN IF NOT EXISTS retake_touch_toes       TEXT CHECK (retake_touch_toes       IN ('yes','no')),
  ADD COLUMN IF NOT EXISTS retake_knee_cave        TEXT CHECK (retake_knee_cave        IN ('yes','no')),
  ADD COLUMN IF NOT EXISTS retake_shoulder_clasp   TEXT CHECK (retake_shoulder_clasp   IN ('yes','no')),
  ADD COLUMN IF NOT EXISTS retake_plank_hold       TEXT CHECK (retake_plank_hold       IN ('yes','no')),
  ADD COLUMN IF NOT EXISTS retake_arm_overhead     TEXT CHECK (retake_arm_overhead     IN ('yes','no')),
  ADD COLUMN IF NOT EXISTS retake_at               TIMESTAMPTZ;

-- Allow the anon backend key to update existing rows (needed for retake)
CREATE POLICY "backend_update" ON assessments
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
