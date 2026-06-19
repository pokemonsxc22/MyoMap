-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
--
-- Adds flexible JSONB columns to store all movement screen answers (now 2-3 per pain area)
-- rather than individual per-question columns. Backward-compatible — old columns are kept.

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS screen_json        JSONB,
  ADD COLUMN IF NOT EXISTS retake_screen_json JSONB;
