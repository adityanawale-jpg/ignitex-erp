# 💎 IgniteX.ai ERP — Enterprise Application

A full-stack enterprise IgniteX.ai ERP system built with **Node.js + Express + TypeScript** (backend) and **React + Vite + Redux Toolkit + Tailwind CSS** (frontend).

---

## 🏗️ Project Structure

```
ERP/
├── api/                     → Backend API (Node/Express/TypeScript)
│   ├── src/
│   │   ├── controllers/     → Request handlers
│   │   ├── services/        → Business logic
│   │   ├── repository/      → Data access layer
│   │   ├── middleware/       → Auth, error handling
│   │   ├── routes/          → API route definitions
│   │   ├── utils/           → Helpers, logger, response
│   │   ├── database/        → PostgreSQL connection
│   │   └── app.ts           → Express app entry
│   ├── .env.example
│   └── package.json
│
├── app/                     → React Frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── api/             → Axios API service
│   │   ├── components/      → Reusable UI components
│   │   ├── layouts/         → Admin layout (Sidebar + Navbar)
│   │   ├── pages/           → Feature pages (masters, sales, etc.)
│   │   ├── redux/           → State management (auth, theme, tabs)
│   │   ├── routes/          → React Router setup
│   │   ├── types/           → TypeScript definitions
│   │   ├── utils/           → Helper functions
│   │   └── main.tsx         → App entry point
│   └── package.json
│
└── database/
    └── scripts/             → Historical/archived — see "Database Migrations" below
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

---

### 1. Database Setup

> ⚠️ **`npx prisma migrate deploy` alone does not work on a blank database.** It fails
> part-way through, and even when the schema is complete the tables are empty — no
> login, no menus, no dynamic queries. The order below is the one that actually works.
> Full explanation in **[LOCAL_SETUP.md](LOCAL_SETUP.md)**.

```bash
psql -U postgres -c "CREATE DATABASE ignitex_erp;"
cd api

# a) Schema only — the baseline migration builds all 48 tables from nothing
psql -U postgres -d ignitex_erp -f prisma/migrations/20260716000001_baseline_reconciled_schema/migration.sql

# b) Record it as applied so Prisma does not try to run it again
npx prisma migrate resolve --applied 20260716000001_baseline_reconciled_schema

# c) System seed data — users, roles, menus, permissions, lookups, project_config
psql -U postgres -d ignitex_erp -f ../database/local_seed.sql

# d) The remaining migrations, which depend on the seed rows existing
npx prisma migrate deploy
npx prisma generate
```

**Why the seed step sits in the middle:** several later migrations insert menu rows
that reference a parent menu no migration ever creates, so they abort with a foreign
key error unless the base data is already loaded.

`database/local_seed.sql` carries 66 menus, 381 role permissions, 330 lookups and 207
`project_config` rows — the dynamic SQL almost every screen depends on.

See **"Database Migrations"** below for the history of the numbered SQL scripts.

---

### 2. Backend Setup

```bash
cd api

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your DB credentials

# Start development server
npm run dev
```

Backend runs at: `http://localhost:5000`

> The API and the Prisma CLI both read **`.env.local`** — keep the connection string
> in that one file only. `npm run build` is only needed for a production build;
> `npm run dev` runs the TypeScript directly.

---

### 3. Frontend Setup

```bash
cd app

# Install dependencies
npm install

# Configure environment (defaults work for local development)
cp .env.example .env

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

The dev server proxies `/api` and `/uploads` to `http://localhost:5000`, so the
backend must be running first. See **"Frontend Guide"** below for how the app is
put together.

---

## 🖥️ Frontend Guide

**Where things live** (`app/src/`):

| Folder | Contents |
|--------|----------|
| `api/` | The single axios instance every page uses, plus the global loading counter |
| `components/common/` | Shared UI — `Modal`, `ConfirmDialog`, `DataTable`, `PageBreadcrumb`, `Badge` |
| `components/layout/` | `Sidebar`, `Navbar`, `TabBar` |
| `layouts/AdminLayout.tsx` | The shell wrapping every signed-in page |
| `pages/` | One folder per module — masters, orders, purchase, inventory, settings |
| `redux/slices/` | Shared state — auth, menu, tabs, theme, notifications |
| `routes/` | `AppRoutes.tsx` (URL → page) and `routeRegistry.ts` (tab → page) |
| `hooks/` | Typed Redux hooks plus `usePermission` and `useFocusTrap` |
| `utils/` | Formatting, export and HTML-escaping helpers |

**Three things that are easy to miss:**

1. **The sidebar is built from the database, not the code.** `/auth/profile` returns the
   menus the signed-in user's role allows, and `Sidebar` renders that tree. Adding a
   screen means adding a `menu_master` row, not editing a menu constant.

2. **Most screens do not have their own endpoint.** They call `/common/get` with a
   *method name* such as `fg_item_list_get`; the backend looks that name up in the
   `project_config` table and runs the SQL stored there. Newer modules (Sales Order,
   Purchase Order, Metal Receipt, BOM, Stock) do have dedicated endpoints.

3. **Routing is declared twice.** A new page must be registered in **both**
   `AppRoutes.tsx` and `routeRegistry.ts` — the first drives the URL, the second drives
   the keep-alive tab system. Missing either one gives a blank tab or a redirect home.

**Conventions:** `app` uses no semicolons, `api` uses them — `.prettierrc` encodes both.
Import with the `@/` alias rather than long relative paths. Prefer the shared components
in `components/common/` over rebuilding a table or dialog.

---

## 🔑 Default Credentials

Sign in with the **employee ID**, not the email address.

| Employee ID | Password  | Role                 |
|-------------|-----------|----------------------|
| EMP001      | Admin@123 | System Administrator |
| EMP002      | Admin@123 | Manager              |
| EMP003      | Admin@123 | Operator             |

> **Note:** These are demo accounts from the seed data. Change every password before
> any deployment.

---

## 🌐 API Architecture

### Endpoints

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | `/api/auth/login`     | User authentication      |
| POST   | `/api/auth/logout`    | Logout & invalidate token |
| GET    | `/api/auth/profile`   | Get user profile         |
| GET    | `/api/auth/menus`     | Get role-based menus     |
| GET    | `/api/common/get`     | Dynamic GET query        |
| POST   | `/api/common/post`    | Dynamic INSERT           |
| PUT    | `/api/common/put`     | Dynamic UPDATE           |
| DELETE | `/api/common/delete`  | Dynamic DELETE           |
| POST   | `/api/common/execute` | Execute stored procedure |
| GET    | `/api/common/lookup/:type` | Get lookup values   |
| GET    | `/api/common/dashboard-stats` | Dashboard KPIs  |

### Request Format

Every protected API call:

```json
{
  "api_key": "ERP2026",
  "token": "JWT_TOKEN",
  "method": "party_list_get",
  "params": {
    "is_active": { "type": "bool", "value": true }
  }
}
```

### Response Format

```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": [...],
  "total": 25
}
```

---

## 🎨 Features

### Frontend
- ✅ Professional Login Page (split-panel, validation)
- ✅ Dark / Light theme toggle
- ✅ Collapsible Sidebar with multi-level menu
- ✅ Dynamic Tab System (no duplicates, auto-close)
- ✅ Notification Panel with read/unread states
- ✅ Dashboard with Recharts analytics
- ✅ Party Master — full CRUD
- ✅ Metal Master — CRUD + rate cards
- ✅ Category Master — CRUD + icon grid
- ✅ Product Master — CRUD with metal/category lookup
- ✅ Sales Orders — list, filter by status, detail view
- ✅ Stock Ledger — movement history with IN/OUT/ADJ
- ✅ Sales Report — area/bar/pie charts + top products
- ✅ User Management — CRUD with role assignment
- ✅ Breadcrumb navigation on all pages
- ✅ CSV export on all tables
- ✅ Responsive design

### Backend
- ✅ JWT Authentication + API Key validation
- ✅ Dynamic Query Engine (SQL from project_config table)
- ✅ Role-based authorization middleware
- ✅ SQL injection prevention (parameterized queries)
- ✅ bcrypt password hashing
- ✅ Login history tracking
- ✅ Winston logging (console + file)
- ✅ Rate limiting (express-rate-limit, Redis-backed store — survives restarts)
- ✅ Redis caching — lookup master LOVs, per-user menu tree/permissions (optional, fails open)
- ✅ GCP Secret Manager for DB password / JWT secret (optional, falls back to `.env`)
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Global error handler

---

## 🗄️ Database Tables

| Table               | Description                        |
|---------------------|------------------------------------|
| `user_master`       | System users + JWT tokens          |
| `role_master`       | User roles                         |
| `menu_master`       | Application menu hierarchy         |
| `role_menu_mapping` | Role-based menu permissions        |
| `project_config`    | Dynamic SQL query store            |
| `master_lookup`     | Common dropdown/lookup values      |
| `login_history`     | Audit log of all logins            |
| `notification_master` | User notifications               |
| `party_master`      | Customers & suppliers              |
| `metal_master`      | Precious metals + rates            |
| `category_master`   | Product categories                 |
| `product_master`    | Jewellery products                 |
| `sales_order`       | Customer orders                    |
| `sales_order_items` | Order line items                   |
| `purchase_order`    | Supplier purchase orders           |
| `stock_ledger`      | Stock movement records             |

---

## 🗃️ Database Migrations

**Prisma migrations (`api/prisma/migrations/`) are the single authoritative schema history.** Every schema change from here forward must go through `npx prisma migrate dev` (creates a new timestamped migration folder) — do not hand-write ad-hoc SQL scripts for schema changes.

**Why this section exists:** the project used to track schema changes two ways at once — a handful of Prisma migrations *and* ~115 hand-numbered SQL scripts in `database/scripts/`. An audit in 2026-07 flagged this as unreliable for standing up new environments, and investigating it turned out to be worse than it looked: the original Prisma migration history (`0001_init` + 11 incrementals) was missing 19 of the schema's 48 tables entirely — they'd only ever been created via the numbered scripts, never captured by any Prisma migration. Running the old migration set against a blank database failed immediately.

**What was done (2026-07-16):** generated a single new migration (`20260716000001_baseline_reconciled_schema`) directly from the live database's actual structure, replacing the incomplete `0001_init`-based history. Verified by:
- Running it alone against a blank database — succeeds, no errors.
- Column-by-column, index-by-index, constraint-by-constraint diff against the live dev database — full match (a few cosmetic differences were investigated and confirmed harmless: `now()` vs `CURRENT_TIMESTAMP` are identical functions, auto-generated sequence names differ but aren't referenced anywhere by name, and some UNIQUE constraints are enforced via unique indexes rather than named `pg_constraint` rows — confirmed by directly testing that duplicate-value inserts are still correctly rejected).
- Two real bugs the diff-generation tool introduced were caught and fixed: an invalid `ASC` clause on a GIN index, and a missing `NOT NULL` on `operation_master.machine_ids`.

The old 12-migration history is preserved for reference in `api/prisma/migrations_archive/` (not deleted, just out of Prisma's active migrations path). The numbered SQL scripts in `database/scripts/` are similarly historical — they document how the schema evolved before this reconciliation, but are no longer applied to any environment.

**Deploying this change to an existing environment (Dev/UAT):** since that environment's database already has these tables (created via the old scripts/migrations), do not run the new migration for real there — mark it as already applied instead:
```bash
npx prisma migrate resolve --applied 20260716000001_baseline_reconciled_schema
```

---

## ⚡ Redis Cache

**Optional, and never a hard dependency.** Set `REDIS_URL` (see `api/.env.example`) to enable it; leave it unset and the API runs exactly as before, reading straight from Postgres. Every cache helper in `api/src/utils/redisClient.ts` fails open — a Redis outage falls back to a direct DB query, it never turns into a 500. The client also fails *fast*: commands only run when the connection is actually `ready`, so an unreachable Redis degrades requests by milliseconds, not by however long a reconnect/retry cycle would otherwise take.

What's cached (5-minute TTL, all under `api/src/utils/redisClient.ts` + `permissionCache.ts`):
- **Lookup master LOVs** (`lookup:*`) — `master_lookup` backs dropdowns across nearly every page. Any create/update/deactivate in Lookup Master clears the whole `lookup:*` namespace.
- **Per-user menu tree + permission map** (`menu:tree:*`, `menu:perm:*`) — the sidebar tree (`getUserMenus`) and the `requirePermission` middleware both derive from `role_menu_mapping` + `user_menu_mapping`; caching the whole per-user permission map (not per menu-code) turns what used to be one query per protected request into one query per user per 5 minutes. Cleared immediately on: bulk role-permission save, per-user permission override save, or a user's role reassignment.
- **Rate-limit counters** — `express-rate-limit`'s store is Redis-backed (`rate-limit-redis`) instead of the default in-memory store, so limits survive container restarts and are shared if the API ever runs multiple replicas. `passOnStoreError: true` means a Redis outage here makes rate limiting a no-op, not a 500.

Docker Compose runs a `redis:7-alpine` service (`docker-compose.yml`) with a bounded `maxmemory`/`allkeys-lru` policy — it's a cache, not a system of record, so eviction under memory pressure is fine.

---

## 🔐 Secrets (GCP Secret Manager)

**Optional, opt-in via `GCP_PROJECT_ID`.** Historically `DB_PASSWORD` and `JWT_SECRET` (the two secrets the app actually reads from env vars at runtime — `API_KEY` and `SMTP_PASS` are unused leftovers from earlier versions, mail credentials now live in the DB-driven Mail Configuration page instead) sit in plain text in the server's `.env` file. Leave `GCP_PROJECT_ID` unset and nothing changes — those two values are read from the environment exactly as before. Set it, and `api/src/utils/secrets.ts` fetches both from GCP Secret Manager at container startup and overwrites `process.env.DB_PASSWORD` / `process.env.JWT_SECRET` before anything else (the DB pool, Prisma client, or the JWT_SECRET-required startup check) reads them.

This is why the entrypoint is split into two files: `api/src/app.ts` is now a thin bootstrap — it awaits the secret fetch, *then* dynamically imports `api/src/server.ts` (everything the old `app.ts` used to be). A static top-level import would have run before the fetch ever got a chance to complete, since ES imports are hoisted ahead of any of a file's own code.

If the Secret Manager fetch fails for any reason (API not enabled, missing IAM binding, wrong project ID), it logs the failure and keeps whatever was already in `process.env` — it degrades to "acts like `GCP_PROJECT_ID` was never set," never to a crash. Verified locally by pointing at a nonexistent project: both secrets correctly logged `PERMISSION_DENIED` and fell back, and the server started normally.

**One-time GCP setup** (run in Cloud Shell, against the Dev/UAT project):
```bash
PROJECT_ID="your-gcp-project-id"

# 1. Enable the API
gcloud services enable secretmanager.googleapis.com --project="$PROJECT_ID"

# 2. Create the two secrets from the server's current .env values
#    (run these from the server itself, or paste the values manually —
#    don't leave them in shell history on a shared machine)
echo -n "the-current-db-password" | gcloud secrets create db-password --data-file=- --project="$PROJECT_ID"
echo -n "the-current-jwt-secret"  | gcloud secrets create jwt-secret  --data-file=- --project="$PROJECT_ID"

# 3. Find the VM's service account
gcloud compute instances describe INSTANCE_NAME --zone=ZONE \
  --format='value(serviceAccounts[0].email)' --project="$PROJECT_ID"

# 4. Grant that service account read access to both secrets
SA_EMAIL="the-email-from-step-3"
gcloud secrets add-iam-policy-binding db-password --project="$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding jwt-secret --project="$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" --role="roles/secretmanager.secretAccessor"
```
Then add `GCP_PROJECT_ID=your-gcp-project-id` to the server's `.env` and redeploy as usual. Auth uses Application Default Credentials — the VM's attached service account — so no key file is needed or should be created.

**Not yet verified against a real GCP project** (this environment has no GCP credentials to test with) — only the fallback/failure paths above were confirmed directly. Please verify the actual successful fetch on Dev after running the setup above (check the startup logs for the absence of the `PERMISSION_DENIED`/"Failed to load secret" lines).

---

## 🛠️ Tech Stack

**Backend:** Node.js · Express · TypeScript · PostgreSQL · Redis · JWT · bcrypt · Winston · Helmet

**Frontend:** React 18 · TypeScript · Vite · Redux Toolkit · React Router v6 · Tailwind CSS · Recharts · React Hook Form · Yup · Lucide React · React Hot Toast

---

## 📦 Adding New Queries

Add rows to `project_config` table:

```sql
INSERT INTO project_config (key_code, key_value, description) VALUES
('my_query_get', 'SELECT * FROM my_table WHERE id = :id', 'My custom query');
```

Then call from frontend:

```typescript
await dynamicApi.get('my_query_get', { id: { type: 'int', value: 1 } })
```

---

## 🧮 BOM Header Totals (Postgres Functions)

`bom_fg`/`bom_fin` header rows carry weight/carat totals (`gross_weight`, `net_weight`, `stone_cts`, `stone_gms`, `component_weight`) that must equal the sum of those columns across that BOM's active detail lines. Before 2026-07-16 this sum was computed independently in three places — two frontend pages' `reduce()` calls and a third hand-rolled accumulator in the bulk FG importer — all in JS float arithmetic despite the columns being fixed-point `NUMERIC(12,6)`, and the manual save endpoints (`saveFGBOM`/`saveFINBOM`) didn't verify the client-supplied totals against the detail lines at all.

Two Postgres functions now make the database the single source of truth: `fn_bom_fg_recalc_header(bom_id)` and `fn_bom_fin_recalc_header(bom_id)` (`prisma/migrations/20260716000002_add_bom_header_recalc_functions/`) `UPDATE` the header from a `SUM()` over that BOM's active detail rows. `saveFGBOM`, `saveFINBOM`, and `fgImport.controller.ts`'s bulk importer all call the relevant function right after writing detail rows, inside the same transaction — so whatever total the request body claims is immediately superseded by the DB-computed truth. Verified directly: a request sending wildly wrong header values (e.g. `gross_weight: 99999`) with real detail lines persists the *correct* recalculated total, not the client's number, for both the create and update paths.

If you add another place that writes `bom_fg_detail`/`bom_fin_detail` rows, call the matching recalc function afterward rather than computing the header total in application code.

---

## 🔒 Security Notes

1. Change `JWT_SECRET` in production to a long random string
2. Change `API_KEY` from `ERP2026` to a secure key
3. Set `DB_SSL=true` for production PostgreSQL
4. Change all default passwords before deployment
5. Set `NODE_ENV=production` to disable debug output

---

## 📄 License

MIT — Built for enterprise jewellery management.
