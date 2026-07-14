# REQ: Blog System — DB-backed Style Journal (manual, editorial redesign)

**Status:** Implemented
**Date:** 2026-07-12 (initial) · 2026-07-13 (pivoted off paid AI + editorial redesign)
**Scope:** Backend (`/api/blog` module), frontend storefront blog, admin Blog panel.

## History / Decision

The first cut (2026-07-12) added an AI draft generator via the Claude API. The
operator can't take on a separate per-use API cost (they expected their Claude
Pro *chat* subscription to cover it — it doesn't; the API is prepaid pay-per-
use). **Pivot (2026-07-13): remove the paid AI path entirely** and instead make
manual blog posting genuinely good — a template-driven admin flow (no API) and
a customer-attracting editorial storefront design.

## Problem

The storefront had an SEO-ready `/blog` scaffold, but posts lived in a hardcoded
array (a code deploy to publish) and the page was visually bare. Goal: DB-backed
posts, a non-technical-friendly authoring flow with **zero external cost**, and a
premium editorial design that drives organic traffic + converts (avg AOV ₹4,500,
prepaid-only, so shoppers research before buying).

## Acceptance Criteria

### Data & API (no external services)
- [x] `BlogPost` table: slug, title, description, HTML body, coverImage, author,
      **category**, tags[], **featured**, **relatedProductSlugs[]**,
      DRAFT/PUBLISHED, publishedAt. Additive migrations, applied via
      `prisma migrate deploy` (already in the `start` script).
- [x] Public: `GET /api/blog` (published; featured-first; `readMinutes` computed
      server-side; body omitted for payload size) and `GET /api/blog/:slug`
      (single, with body + relatedProductSlugs). No auth.
- [x] Admin (requireAuth): list all, create, update, delete. **No generate
      route, no scheduler, no @anthropic-ai/sdk dependency.**

### Admin authoring flow (free replacement for "AI generate")
- [x] **Starter templates** (Styling Guide, Occasion Lookbook, Fabric & Care,
      Size & Fit, Blank) — seed a proven heading structure so the operator fills
      blanks instead of facing an empty page; a template also sets the category.
- [x] **Formatting toolbar** — H2/H3/¶/Bold/Italic/List/Link buttons wrap the
      textarea selection in HTML, so the operator never types raw tags.
- [x] **Live preview** — side panel renders the exact `.blog-body` output.
- [x] Category select (fixed `BLOG_CATEGORIES`), Featured toggle, cover image,
      tags, SEO description with a 160-char counter, and a **Shop this Story**
      product picker (search live products, store slugs as chips).
- [x] Publish/unpublish/delete from the list; category + AI + status badges.

### Storefront — editorial magazine with hierarchy
- [x] `/blog`: NTFabulous "Style Journal" masthead + standfirst; a **featured
      hero** (featured post, or latest) as an editorial split; **category filter**
      pills; a 3-col editorial **card grid** (cover, category kicker, serif title,
      excerpt, date · reading time). Hover language matches ProductCard.
- [x] `/blog/[slug]`: centered kicker + serif headline + meta; cover band;
      generous `.blog-article` typography (lead paragraph, serif h2, blockquote);
      **Shop this Story** strip (related products resolved by slug — the
      content→commerce bridge); **WhatsApp size-help CTA**; **Keep reading** strip
      (same category first). Full Article + Breadcrumb JSON-LD + sitemap kept.
- [x] Body renders as HTML; graceful empty states if the backend is unreachable.

## Design system (matches the existing storefront)
- Fonts: **NTFabulous** (display serif — headlines/masthead) + Poppins/Metropolis
  (body). Palette: cream paper `#FAF8F5`, near-black text, single **caramel
  `#8B6B47`** accent for kickers/links. Card idiom reused from ProductCard
  (image scale 1.03 @ 500ms, uppercase micro-labels).

## Content strategy (how the blog attracts + converts)
- **Hierarchy ladder:** masthead → featured hero (biggest weight) → category
  filter → uniform grid; on a post: kicker → headline → lead → sections → Shop
  this Story → CTA → related. Each step guides the eye toward the shop.
- **SEO:** long-tail queries the brand can rank on (plus-size Anarkali, modest
  fashion India, fabric care) via headings + JSON-LD; posts internal-link to
  live product URLs.
- **Conversion:** every post ends in a product strip + WhatsApp size help,
  turning a reader into a shopper while intent is high.

## Verified
End-to-end with Playwright against the real module + real DB (2026-07-13,
23 checks): admin login → template → toolbar → category → featured → product
pick → publish (×2) → public payload shape → storefront hero + category filter
→ post page (headline, kicker, styled body, Shop-this-Story with price,
WhatsApp CTA, Keep reading) → cleanup. Frontend production build clean (42/42
static pages).
