-- Supabase Security Advisor: "RLS Disabled in Public" (21 errors)
--
-- Every table Prisma creates lives in the `public` schema, which Supabase
-- auto-exposes via PostgREST at
--   https://<project-ref>.supabase.co/rest/v1/<TableName>
-- Without RLS, an attacker who obtains the project's anon key can read or
-- mutate any row from a browser. Our anon key is not shipped anywhere
-- client-side today (we use Prisma via the private backend), but this
-- migration adds defense-in-depth so a future anon-key leak or an
-- accidental Supabase SDK addition cannot suddenly expose the database.
--
-- Prisma keeps working: `DATABASE_URL` connects as `postgres.<ref>` via
-- Supavisor, and that role is a Postgres superuser (BYPASSRLS is implicit
-- for superusers). No policies are created, so every non-superuser role
-- — including `anon` and `authenticated` that PostgREST uses — is denied
-- by default.
--
-- Iterates over pg_tables instead of hard-coding names so this covers
-- every current table and any table added by future migrations that
-- happens to land in this schema before the operator adds explicit
-- policies. `_prisma_migrations` is included on purpose — the migration
-- runner writes to it as the superuser, so RLS on it is harmless.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
