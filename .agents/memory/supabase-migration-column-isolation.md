---
name: Isolate newly-migrated Supabase columns into separate queries
description: Why usage/plan lookups in ai-mobility-coach split "new column" reads from core reads instead of one combined select.
---

Supabase migrations in this repo are applied manually by the user in the SQL editor, so there's always a window where the app code references a column that doesn't exist in the live DB yet.

If a `select()` includes even one column the DB doesn't have, PostgREST errors out the **entire** query — not just that column. When that combined query backs a core read (like fetching a user's plan/usage), an unrelated missing column (e.g. a brand-new `onboarding_complete` or `discount_*` field) silently drops the whole row to its fallback, which can wrongly reset a paying user's plan and traps users in redirect loops.

**Why:** Diagnosed after "Continue with Free" appeared to do nothing — the real cause was a combined select failing because a newer column wasn't migrated yet, which fed back a fallback `onboarding_complete: false` and re-triggered the onboarding redirect forever.

**How to apply:** When adding a column via a new migration, fetch it in its own `select()` separate from established core columns, and default it to a *safe/non-blocking* value (e.g. treat as already done / no discount) if that query errors — don't let a missing new column affect old, already-relied-upon data.
