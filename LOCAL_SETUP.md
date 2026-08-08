# Local Setup (Windows)

Verified working on 2026-08-06. Node v24.15.0, Docker 29.4.3, PostgreSQL 16.14.

> **Read this before following README.md's Quick Start.** That section does not
> produce a usable database — see "Why the README steps don't work" at the bottom.

---

## 1. Start PostgreSQL

```powershell
docker run -d --name ignitex_pg `
  -e POSTGRES_PASSWORD=sql123 -e POSTGRES_USER=postgres -e POSTGRES_DB=ignitex_erp `
  -p 5432:5432 -v ignitex_pgdata:/var/lib/postgresql/data `
  postgres:16-alpine
```

Redis is **not** required — the API runs fine without it (`REDIS_URL` stays commented out
in `api/.env.local`).

## 2. Environment files

Both already exist and point at the local database:

- `api/.env.local` — read by the running API (`npm run dev` loads it explicitly)
- `api/.env` — read by the **Prisma CLI** only (`prisma.config.ts` loads `dotenv/config`,
  which reads `.env`, not `.env.local`)

`DATABASE_URL` must be identical in both. The original remote Dev URL is kept commented
out at the bottom of `.env.local`.

- `app/.env` — copied from `app/.env.example`, no edits needed.

## 3. Build the database

The order matters. Migrations alone will fail — several of them insert menu rows that
reference seed data, so the seed has to go in between.

```powershell
cd api

# a) schema only — the baseline migration builds all 48 tables from nothing
docker exec ignitex_pg psql -U postgres -d ignitex_erp -v ON_ERROR_STOP=1 `
  -f /migs/20260716000001_baseline_reconciled_schema/migration.sql

# b) tell Prisma that baseline is already applied
npx prisma migrate resolve --applied 20260716000001_baseline_reconciled_schema

# c) load system seed data (users, roles, menus, permissions, lookups, project_config)
docker cp ..\database\local_seed.sql ignitex_pg:/tmp/local_seed.sql
docker exec ignitex_pg psql -U postgres -d ignitex_erp -f /tmp/local_seed.sql

# d) apply the remaining 31 migrations
npx prisma migrate deploy

# e) generate the Prisma client
npx prisma generate
```

`database/local_seed.sql` is a data-only dump produced from a verified working database.
It contains 66 menus, 381 role-menu permissions, 330 lookups and **207 `project_config`
rows** — the dynamic SQL that nearly every screen depends on.

## 4. Run it

Two terminals:

```powershell
cd api ; npm install ; npm run dev     # http://localhost:5000
cd app ; npm install ; npm run dev     # http://localhost:5173
```

## 5. Log in

| Employee ID | Password  | Role                 |
|-------------|-----------|----------------------|
| EMP001      | Admin@123 | System Administrator |
| EMP002      | Admin@123 | Manager              |
| EMP003      | Admin@123 | Operator             |

Log in with the **employee ID** (`EMP001`), not the email.

> Pages open by clicking them in the sidebar or on a home-screen card. Typing a page URL
> directly redirects to home — `AdminLayout` bounces any route that has no open tab.

---

## Why the README steps don't work

`README.md` says `npx prisma migrate deploy` against a fresh database is enough. It isn't,
for two separate reasons found while setting this up:

1. **The migration chain fails on a blank database.**
   `20260729000002_daily_rate_master` inserts a menu row with `parent_id = 2`, but nothing
   in the migration history ever creates menu id 2. It aborts with a foreign-key violation:
   `menu_master_parent_id_fkey ... Key (parent_id)=(2) is not present`.
   The README's verification only ever tested the *baseline* migration alone against a
   blank database, not the full chain.

2. **No migration contains the base seed data.**
   The baseline has zero `INSERT` statements, so even a fully-applied schema leaves
   `user_master`, `menu_master`, `master_lookup` and `project_config` empty — no login,
   no sidebar, and every dynamic query returning "API method not configured".

The base seed exists only in the historical `database/scripts/*.sql` files, which the
README describes as no longer applied anywhere. Those scripts were replayed into a
throwaway database to recover the data; 122 of 132 ran clean, and `database/local_seed.sql`
is the result. The 10 that failed were cascading failures from one broken statement in
`02_migrate_user_master.sql` (it renames `user_master.id` to `user_id`, but `01_init.sql`
already creates the column as `user_id`, so the rename errors and aborts the rest of the
file — including the `CREATE TABLE user_role` further down). The role assignments that
script would have made were restored separately from `07_user_role_seed.sql` and
`16_emp001_full_access.sql`.

## Known gaps in the local database

- **No business data** — no items, customers, suppliers, orders or stock. Every grid opens
  correctly but shows "No records found". Only system/configuration data was recoverable.
- **`user_menu_mapping` is empty** — per-user permission overrides. Not needed for EMP001,
  who has full access through the SYS_ADMIN role.
- The legacy scripts stop at #130 and never covered Metal Receipt, Daily Rate, Purchase
  Requisition or Stock Ledger. Those modules' schema and menus come from the Prisma
  migrations, which do include their own menu rows — they work, they're just empty.
