# REQ: Blog System — DB-backed Posts, Admin Editor, AI Draft Generation

**Status:** Implemented
**Date:** 2026-07-12
**Scope:** Backend (Prisma model + `/api/blog` module + weekly scheduler),
frontend storefront blog pages, admin panel Blog section.

## Problem

The storefront has an SEO-ready `/blog` scaffold but posts live in a
hardcoded array (`frontend/lib/blog/posts.ts`) — publishing requires a code
deploy. The operator wants blogs to drive organic traffic for a high-AOV
(₹4,500 avg) store and asked for an automated setup that can generate and
publish posts, without needing an Anthropic *subscription* (the Claude API
is prepaid pay-per-use; the key is only needed at generation time).

## Acceptance Criteria

### Data & API
- [ ] `BlogPost` table (Prisma): slug, title, description, HTML body,
      coverImage, author, tags[], DRAFT/PUBLISHED status, aiGenerated flag,
      publishedAt. Additive migration; deploy applies it via
      `prisma migrate deploy` (already in the `start` script).
- [ ] Public: `GET /api/blog` (published, newest first),
      `GET /api/blog/:slug` (single published post). No auth.
- [ ] Admin (requireAuth): list all, create, update, delete,
      `POST /api/blog/admin/generate` — AI draft from an optional topic.
- [ ] Publish = PATCH with `status: PUBLISHED` (sets `publishedAt` first time).

### AI drafting
- [ ] Uses the official `@anthropic-ai/sdk`; model `claude-opus-4-8` by
      default, overridable via `BLOG_AI_MODEL` env.
- [ ] Structured output (JSON schema) → title/slug/description/tags/body;
      body is clean HTML with internal links to real live product/category
      URLs fetched from the DB at generation time.
- [ ] Missing `ANTHROPIC_API_KEY` → clear 503-style error in admin UI;
      nothing else on the site is affected.
- [ ] Weekly auto-draft scheduler (opt-in): `BLOG_AUTO_DRAFT=true` generates
      a draft if none was AI-generated in the last `BLOG_AUTO_DRAFT_DAYS`
      (default 7). `BLOG_AUTO_PUBLISH=true` additionally publishes it
      without review (default off — review recommended for SEO safety).

### Storefront
- [ ] `/blog` and `/blog/[slug]` read from the API with ISR (1h revalidate);
      graceful empty state if the backend is unreachable (build safety).
- [ ] Body renders as HTML; JSON-LD + sitemap keep working (sitemap pulls
      published posts from the API).

### Admin panel
- [ ] New sidebar entry "Blog" → `/admin/blog`: post list with status/AI
      badges, editor (title, slug, description, cover image URL, tags,
      HTML body), publish/unpublish, delete, and a "Generate with AI"
      action with an optional topic input.

## Env vars (backend)
| Var | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | for AI drafts only | — | Claude API (prepaid, pay-per-use) |
| `BLOG_AI_MODEL` | no | `claude-opus-4-8` | generation model |
| `BLOG_AUTO_DRAFT` | no | off | weekly auto-draft scheduler |
| `BLOG_AUTO_DRAFT_DAYS` | no | 7 | min days between auto drafts |
| `BLOG_AUTO_PUBLISH` | no | off | publish auto-drafts without review |

## Task Breakdown
1. Prisma model + migration.
2. `backend/src/modules/blog/` — service (CRUD + Claude generation),
   routes, scheduler; register in route index + boot.
3. Frontend `lib/blog/posts.ts` → async API fetchers; update blog pages
   and sitemap to await them; render HTML body.
4. `blogApi` in `frontend/lib/api.ts`; admin Blog page; sidebar entry.
