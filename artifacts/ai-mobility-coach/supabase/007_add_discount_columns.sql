-- Run this in your Supabase SQL Editor if discount codes show "something went wrong"
-- Adds discount metadata columns to the users table (idempotent).

alter table public.users
  add column if not exists discount_code        text         null,
  add column if not exists discount_type        text         null,
  add column if not exists discount_expires_at  timestamptz  null;
