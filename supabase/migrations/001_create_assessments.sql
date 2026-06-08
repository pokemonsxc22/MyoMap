-- Run this once in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

CREATE TABLE IF NOT EXISTS assessments (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  pain_location TEXT      NOT NULL,
  duration    TEXT,
  worsens     TEXT[],
  goal        TEXT,
  severity    INTEGER     CHECK (severity BETWEEN 1 AND 5),
  gender      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Allow the anon key (used by the backend) to insert rows
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backend_insert" ON assessments
  FOR INSERT TO anon
  WITH CHECK (true);
