# Vami Clubwear — Monorepo

Premium Indo-Western fashion e-commerce + custom POS system.

## Architecture

```
vami-clubwear/
├── frontend/          Next.js 14 (App Router) + Tailwind + shadcn/ui
└── backend/           Node.js + Express + Prisma ORM + PostgreSQL (Neon)
```

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- PostgreSQL database (project uses [Neon](https://neon.tech))

---

## Setup

### 1. Environment variables

**Backend** — create `backend/.env.local`:
```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"   # Neon direct connection
ADMIN_API_KEY="generate-a-strong-random-string"
MANAGER_API_KEY="generate-a-strong-random-string"
FRONTEND_URL="http://localhost:3000"
PORT=3001
NODE_ENV=development
```

**Frontend** — create `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ADMIN_API_KEY=same-value-as-backend-ADMIN_API_KEY
```

> ⚠️ Neither `.env` nor `.env.local` is ever committed — both are gitignored.

### 2. Install dependencies

```bash
# From the monorepo root
npm install          # installs frontend + backend via workspaces
```

Or individually:
```bash
cd backend  && npm install
cd frontend && npm install
```

### 3. Database migration

```bash
cd backend
npm run db:migrate   # runs: dotenv -e .env.local -- prisma migrate dev
# Enter migration name when prompted, e.g.: production-schema
```

To completely reset and re-create all tables (dev only):
```bash
npm run db:reset
```

### 4. Start development servers

Two terminals:
```bash
# Terminal 1 — backend
cd backend && npm run dev      # → http://localhost:3001

# Terminal 2 — frontend
cd frontend && npm run dev     # → http://localhost:3000
```

Admin dashboard: http://localhost:3000/admin/dashboard

---

## API Reference

Base URL: `http://localhost:3001/api`

All write endpoints require `X-Api-Key` header.

### Products

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/products` | public | List products (pagination + filters) |
| POST | `/products` | manager | Create product + variants atomically |
| GET | `/products/:id` | public | Product detail by ID |
| GET | `/products/slug/:slug` | public | Product detail by slug |
| PATCH | `/products/:id` | manager | Update product metadata |
| POST | `/products/:productId/variants` | manager | Add variant to product |
| GET | `/products/variants/sku/:sku` | public | Variant by SKU |
| GET | `/products/categories` | public | List categories |
| POST | `/products/categories` | admin | Create category |

### Inventory

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/inventory` | public | All inventory rows (paginated) |
| GET | `/inventory/:variantId` | public | Inventory by variant (all locations) |
| PUT | `/inventory/:variantId/set` | manager | Set absolute quantity |
| POST | `/inventory/:variantId/adjust` | manager | +/- delta (optimistic lock) |
| GET | `/inventory/locations` | public | List locations |
| POST | `/inventory/locations` | admin | Create location |

### Orders

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/orders` | manager | Create order + deduct inventory atomically |
| GET | `/orders` | manager | List orders (paginated + status filter) |
| GET | `/orders/:id` | manager | Order detail |
| PATCH | `/orders/:id/status` | manager | Update order status |

### Webhooks

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/webhooks/pos` | public | Generic POS stock update |

**Webhook payload:**
```json
{
  "sku": "VCW-ZFUS-GRN-M-SILK-ANKA",
  "quantity": 10,
  "locationId": "clx...",
  "source": "POS"
}
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `Location` | Physical/logical stock locations |
| `Category` | Hierarchical product categories |
| `Product` | Catalogue entry with base price |
| `ProductVariant` | SKU with 4 dimensions: size, color, fabric, style |
| `Inventory` | Per-variant per-location stock (optimistic locking via `version`) |
| `Order` | Customer order with status + payment tracking |
| `OrderItem` | Line items with price snapshot |
| `WebhookLog` | Audit trail for all POS webhook events |

---

## RBAC

| Role | Key env var | Access |
|------|-------------|--------|
| admin | `ADMIN_API_KEY` | Full access |
| manager | `MANAGER_API_KEY` | Products + Inventory + Orders |
| public | — | Read-only product + inventory endpoints |

Send key as: `X-Api-Key: <key>` header.

> Auth will be upgraded to JWT in a future requirement.

---

## Frontend Admin

| Route | Access | Description |
|-------|--------|-------------|
| `/admin/dashboard` | admin, staff | KPI cards + sales chart |
| `/admin/products` | admin, staff | Product list + add button |
| `/admin/products/new` | admin, staff | Product upload form (5-dimension variants) |
| `/admin/inventory` | admin, staff | Live stock levels by SKU |
| `/admin/pos-sync` | admin only | Webhook event log |
