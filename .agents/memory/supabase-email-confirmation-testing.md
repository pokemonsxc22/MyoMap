---
name: Supabase email confirmation blocks e2e signup tests
description: Automated signup-based e2e tests get stuck on the "check your inbox" gate for this app's Supabase project.
---

This app (MyoMap / ai-mobility-coach) uses Supabase Auth with "Confirm email" enabled. `supabase.auth.signUp` returns no session until the confirmation link is clicked, so the Playwright testing subagent cannot complete a fresh signup and reach authenticated pages (dashboard, profile, intake).

**Why:** No `SUPABASE_SERVICE_ROLE_KEY` is configured for this project, so there's no way to programmatically create/confirm a user or query `auth.users` from the app. Only `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set.

**How to apply:** Before writing an e2e test plan that requires being logged in, either:
1. Ask the user for a known confirmed test account's credentials, or
2. Request a `SUPABASE_SERVICE_ROLE_KEY` secret and use it to create a pre-confirmed user via the Supabase Admin API, or
3. Ask the user to temporarily disable "Confirm email" in the Supabase dashboard for testing.
Otherwise scope e2e tests to unauthenticated pages/flows and rely on typecheck + manual code review for authenticated features.
