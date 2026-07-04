-- ══════════════════════════════════════════════════════════════
-- Migration 008: Daily Mobility Score tracker
-- ══════════════════════════════════════════════════════════════
--
-- HOW TO RUN:
--   1. Open your Supabase project → SQL Editor (left sidebar)
--   2. Paste the entire contents of this file
--   3. Click "Run"
--
-- This is idempotent — safe to run multiple times.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mobility_scores (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score       integer      NOT NULL CHECK (score >= 1 AND score <= 10),
  note        text,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.mobility_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mobility_scores'
      AND policyname = 'users can insert own scores'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "users can insert own scores"
        ON public.mobility_scores FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid())
    $p$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mobility_scores'
      AND policyname = 'users can select own scores'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "users can select own scores"
        ON public.mobility_scores FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
    $p$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mobility_scores'
      AND policyname = 'users can update own scores'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "users can update own scores"
        ON public.mobility_scores FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid())
    $p$;
  END IF;
END $$;

-- Fast per-user lookup ordered by date
CREATE INDEX IF NOT EXISTS mobility_scores_user_date_idx
  ON public.mobility_scores (user_id, created_at DESC);
