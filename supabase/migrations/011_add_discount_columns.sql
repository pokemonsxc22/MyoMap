-- Run this in your Supabase project's SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_code       text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_type       text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_expires_at timestamptz;

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
