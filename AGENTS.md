# AGENTS.md

## Supabase backend

This project uses [Supabase](https://supabase.com) for its database (Postgres), authentication, file storage and edge functions. The site is hosted on Vercel; order and sign-up emails go through Resend.

- **Project:** **Lagle Janaben** (ref `cjbbbssijasbujsbsast`, API base `https://cjbbbssijasbujsbsast.supabase.co`)
- **Schema:** versioned SQL in `supabase/migrations/`. Apply with `npx supabase db push`; never edit an applied migration, add a new one.
- **Edge functions:** `supabase/functions/<name>/index.ts`, deployed with `npx supabase functions deploy`. JWT verification is off for all of them (`supabase/config.toml`), so each function validates its own input.
- **Credentials:** app code reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `.env.local`. Server secrets (`RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`, `SSLCOMMERZ_*`) are edge function secrets (`npx supabase secrets set`). Never hardcode or commit keys.

Key patterns:

- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- Supabase grants `EXECUTE` on new public functions to `anon` and `authenticated` directly, so `REVOKE ... FROM PUBLIC` is not enough. Default privileges are already revoked (see `20261009090000_supabase-function-grants.sql`); every function the app calls needs an explicit `GRANT EXECUTE`.
- Money-related writes (pricing, inventory, promo redemption, payment fulfillment) happen only inside Postgres RPCs, never from the browser.
- For storage uploads, persist both the public URL and the object path (`image_url` + `image_key`).
