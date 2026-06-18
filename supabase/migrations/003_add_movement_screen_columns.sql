-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- (Run migration 002 first if you haven't already)

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS knee_cave      TEXT CHECK (knee_cave      IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS shoulder_clasp TEXT CHECK (shoulder_clasp IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS plank_hold     TEXT CHECK (plank_hold     IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS arm_overhead   TEXT CHECK (arm_overhead   IN ('yes', 'no'));
