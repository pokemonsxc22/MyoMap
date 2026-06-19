-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

CREATE TABLE IF NOT EXISTS streaks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier  TEXT        NOT NULL,
  completed_date   DATE        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_identifier, completed_date)
);

CREATE INDEX IF NOT EXISTS streaks_user_date_idx ON streaks (user_identifier, completed_date DESC);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Allow the anon backend key to insert new completion records
CREATE POLICY "anon_insert_streaks" ON streaks
  FOR INSERT TO anon WITH CHECK (true);

-- Allow the anon backend key to read completion records (needed for streak calculation)
CREATE POLICY "anon_select_streaks" ON streaks
  FOR SELECT TO anon USING (true);
