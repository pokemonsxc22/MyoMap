-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS user_id      uuid REFERENCES auth.users(id);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS exercises_json jsonb;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS routine_text   text;

-- Allow authenticated users to read their own assessments (for dashboard history)
DROP POLICY IF EXISTS "users_select_own" ON assessments;
CREATE POLICY "users_select_own" ON assessments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
