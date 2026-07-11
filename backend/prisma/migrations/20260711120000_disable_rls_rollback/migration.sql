-- ROLLBACK of 20260711000000_enable_rls_on_public_tables.
--
-- Enabling RLS broke production auth. Supabase's managed `postgres` role
-- (the one Prisma connects as through Supavisor) does NOT have BYPASSRLS
-- by default in current Supabase Cloud — I misread its behaviour. With
-- RLS on and no policies, every SELECT from `AdminUser`, `Customer`,
-- `Order`, `Coupon`, etc. returned zero rows, which surfaced as "cannot
-- log in / checkout refreshes / profile empty".
--
-- Correct approach for the F4a Supabase advisor findings will be to
-- either (a) grant BYPASSRLS to the role Prisma authenticates as, or
-- (b) create RLS policies that explicitly allow the service role while
-- still denying `anon` and `authenticated`. That is a separate,
-- carefully-tested migration — for now we just get the site back.
--
-- Idempotent: disabling RLS on a table that already has it disabled is a
-- no-op, so this migration is safe to re-run.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
