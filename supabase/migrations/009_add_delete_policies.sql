-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

-- Allow users to delete their own row (used by the "Delete Account" flow)
DROP POLICY IF EXISTS "users_delete_own" ON users;
CREATE POLICY "users_delete_own" ON users
  FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- Allow users to delete their own assessments (used by the "Delete Account" flow)
DROP POLICY IF EXISTS "users_delete_own" ON assessments;
CREATE POLICY "users_delete_own" ON assessments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
