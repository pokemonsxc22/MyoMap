-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS sport          TEXT,
  ADD COLUMN IF NOT EXISTS overhead_reach TEXT CHECK (overhead_reach IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS heels_flat     TEXT CHECK (heels_flat     IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS touch_toes     TEXT CHECK (touch_toes     IN ('yes', 'no'));
