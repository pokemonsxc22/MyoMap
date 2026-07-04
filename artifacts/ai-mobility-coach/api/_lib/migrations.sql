-- ══════════════════════════════════════════════════════════════════
-- MyoMap — Required Supabase SQL migrations
-- ══════════════════════════════════════════════════════════════════
--
-- HOW TO RUN:
--   1. Open your Supabase project → SQL Editor (left sidebar)
--   2. Paste the entire contents of this file
--   3. Click "Run"
--
-- These statements are all idempotent (IF NOT EXISTS / IF NOT EXISTS
-- on policies). Running them twice does nothing harmful.
-- ══════════════════════════════════════════════════════════════════


-- ── Migration 006: Check-In streaks table ─────────────────────────
--
-- Required for "Check In Today" to persist across sessions.
-- Without this table the button appears to work (optimistic UI)
-- but the streak resets to 0 on every page reload.

CREATE TABLE IF NOT EXISTS public.streaks (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier  text         NOT NULL,
  completed_date   date         NOT NULL,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT streaks_user_date_unique UNIQUE (user_identifier, completed_date)
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'streaks'
      AND policyname = 'users can insert own streaks'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "users can insert own streaks"
        ON public.streaks FOR INSERT
        TO authenticated
        WITH CHECK (user_identifier = auth.uid()::text)
    $p$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'streaks'
      AND policyname = 'users can select own streaks'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "users can select own streaks"
        ON public.streaks FOR SELECT
        TO authenticated
        USING (user_identifier = auth.uid()::text)
    $p$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'streaks'
      AND policyname = 'service role bypass'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "service role bypass"
        ON public.streaks FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $p$;
  END IF;
END $$;


-- ── Migration 007: Discount code columns on users table ────────────
--
-- Required for discount codes (FREEFRVRFL, LAUNCHWEEK, MAXMONTH)
-- to persist after being applied. Without these columns the code
-- appears to apply but reverts on next login, and the full patch
-- fails with a PostgreSQL column-not-found error.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS discount_code       text,
  ADD COLUMN IF NOT EXISTS discount_type       text,
  ADD COLUMN IF NOT EXISTS discount_expires_at timestamptz;
