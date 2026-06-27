---
name: MyoMap security architecture
description: Security middleware and patterns established during the security audit — what's wired up and where.
---

# MyoMap Security Architecture

## Backend (api-server)

**Packages installed:** `helmet`, `express-rate-limit`

**Middleware order in `app.ts`:**
1. `helmet()` — security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.)
2. `cors({ origin: isAllowedOrigin, credentials: true })` — allowlist-based CORS
3. `pinoHttp` — structured logging
4. `express.json({ limit: "50kb" })` — body size cap
5. `generalLimiter` (100 req/15min) — applied to all routes
6. `/api` router (AI routes also apply `aiLimiter`: 10 req/15min inline)
7. Global error handler — returns generic "Something went wrong" message, never exposes stack traces

**CORS allowlist** (`app.ts`):
- `http://localhost:5173`
- `http://localhost:3000`
- `https://web-builder-tool--sohancherukuri.replit.app`
- Any `https://${REPLIT_DOMAINS}` entry (comma-separated env var)
- Any `*.replit.dev` subdomain (regex for dev previews)
- TODO placeholder for Vercel domain

**Rate limiters** (`src/middlewares/rateLimiter.ts`):
- `generalLimiter`: 100 req / 15 min per IP — applied globally in `app.ts`
- `aiLimiter`: 10 req / 15 min per IP — applied per-route on `/analyze`, `/daily-checkin`, `/followup`
- Both return `{ error: "Too many requests. Please wait a moment and try again." }`

**Input sanitization** (`src/lib/sanitize.ts`):
- `sanitizeText(input, maxLen)` — strips HTML tags, truncates; returns `""` for non-strings
- `sanitizeStringArray(input, maxItemLen)` — strips non-strings from array, strips HTML from each item
- All AI routes apply these before processing; max 1000 chars for user messages, 100 chars for classification fields

## Frontend (ai-mobility-coach)

**Protected routes** (`App.tsx`):
- `PrivateRoute` component wraps `/dashboard`, `/intake`, `/results`, `/retake`, `/progress`
- Uses `useUser()` hook; redirects to `/welcome` if no session while not loading
- Works in tandem with per-page guards already in Dashboard.tsx and Intake.tsx

**Env var exposure:**
- Frontend only sees `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (injected via `vite.config.ts` define)
- GROQ_API_KEY: backend only (never exposed to frontend)
- SUPABASE_SERVICE_ROLE_KEY: not currently used (backend uses anon key)

## Supabase RLS (manual — must be done in Supabase SQL Editor)

Run these SQL policies; see user-facing summary for exact SQL.

**Why:** The backend uses the anon key, so RLS is the only thing preventing users from reading each other's data via direct Supabase SDK calls from the frontend.
