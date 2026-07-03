-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan                  text        NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_messages_today     integer     NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_messages_reset_at  timestamptz NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS assessments_today     integer     NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assessments_reset_at  timestamptz NOT NULL DEFAULT now();

-- Constrain plan to known values
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('free', 'pro_monthly', 'pro_unlimited', 'pro_annual'));

-- Make sure RLS is enabled on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users may read only their own row
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users may update only their own row (needed for usage counters, plan placeholder changes)
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users may insert only their own row (needed at signup upsert)
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
