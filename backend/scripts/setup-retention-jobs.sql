-- Supabase pg_cron retention jobs
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- It is idempotent: safe to re-run; existing jobs with the same name will be replaced.
--
-- Why pg_cron and not an in-app setInterval: the backend should not be coupled
-- to storage hygiene. These deletes run inside Postgres on Supabase's schedule
-- even when Cloud Run is scaled to zero, and they survive backend redeploys.
--
-- Times are UTC. Chosen for low-traffic IST early morning (~08:30 / 09:00 IST).

-- 1. Enable pg_cron (no-op if already enabled).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. WebhookLog — prune rows older than 90 days. Razorpay + Delhivery payloads
--    are the largest single contributor to DB storage growth.
--    Schedule: every Sunday 03:00 UTC (08:30 IST Sunday).
SELECT cron.schedule(
  'webhooklog-retention-90d',
  '0 3 * * 0',
  $$DELETE FROM public."WebhookLog" WHERE "createdAt" < NOW() - INTERVAL '90 days';$$
);

-- 3. InventoryHistory — prune rows older than 180 days. Keeps a 6-month audit
--    window, which is plenty for stock dispute investigations.
--    Schedule: 1st of each month 03:30 UTC (09:00 IST on the 1st).
SELECT cron.schedule(
  'inventoryhistory-retention-180d',
  '30 3 1 * *',
  $$DELETE FROM public."InventoryHistory" WHERE "createdAt" < NOW() - INTERVAL '180 days';$$
);

-- 4. Verify the jobs are registered. After running the above, this should
--    return two rows with the job names + schedules.
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname IN ('webhooklog-retention-90d', 'inventoryhistory-retention-180d')
ORDER BY jobname;
