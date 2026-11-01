# Developer guide

How the code is organised, the rules it follows, and how to change it safely.
Business rules: [FLOWS-AND-RULES.md](FLOWS-AND-RULES.md). Screens: [USER-GUIDE.md](USER-GUIDE.md).

## Stack

Next.js 15 (App Router, server components, server actions) · React 19 · TypeScript · Tailwind CSS 4 ·
Prisma 6 · PostgreSQL 16 · Vitest (unit) · Playwright (browser tests). One app serves the website, the staff app and the table QR pages.

## Folder map

```
prisma/
  schema.prisma            data model (read this first)
  migrations/              database changes, applied in order; never edit one that is already committed
  seed.ts                  sample data (outlets, tables, menus, recipes, stock, test logins)
src/
  middleware.ts            sends logged-out visitors of staff pages to /login
  app/
    page.tsx               public website
    login/                 staff login (PIN pad)
    staff/                 /staff: sends each role to its home screen
    (staff)/               every logged-in screen; layout.tsx = top bar + bottom tabs
      orders/              tables, new order, order detail, bill & payment, stall counter, customer requests
      kitchen/             kitchen screen
      stock/               ingredients, purchase, wastage, count
      reports/             sales report
      manage/              menu (+ recipe), tables, staff, outlet settings
    t/[token]/             customer page behind a table QR (public)
    track/[token]/         customer tracking page for a website takeaway order (public)
    photo/[id]/            dish photos (long browser cache)
    print/                 thermal receipt, table QR sheet
    actions/               ALL data changes (server actions): orders, customer (table + website, no login),
                           requests (staff accept/reject), photos, stock, manage, auth
    robots.ts, sitemap.ts  search engines
  components/              shared UI (MenuPicker, VegMark, BottomNav, …); site/ = website-only
  lib/
    auth.ts                requireStaff() and the role lists
    session.ts, pin.ts     signed login cookie, PIN hashing
    bill.ts                bill maths (tested)
    money.ts               paise ⇄ "₹" (tested)
    units.ts               stock units and costs (tested)
    orderOps.ts            price a cart, open/append a table order, create a KOT (shared by waiter, QR, website and stall)
    customerStatus.ts      what a customer sees: rounds, progress stage, bill (table page and tracking page)
    requests.ts            pending customer requests for the staff panel
    stock.ts               stock moves: deduct for orders, return, purchase average cost
    counters.ts            bill / KOT / token numbers
    time.ts                India time helpers
tests/e2e/                 browser tests (see tests/e2e/README.md)
deploy/                    server (Docker) and free test (Vercel + Neon) guides
```

## Rules the code follows

1. **Every change goes through a server action** in `src/app/actions/`. Pages only read.
2. **Every action and staff page starts with `requireStaff(ROLE_LIST)`.** Never trust the client about who is logged in.
3. **Every query is limited to the user's outlet** (`outletId: me.outletId`). Customers are identified only by the table's
   `qrToken` or the website order's `trackToken` (random, unguessable). Customer actions never change orders directly:
   they create a `CustomerRequest` that staff accept.
4. **Never trust prices, names or totals from the browser.** Load them from the database (`priceCart` in `orderOps.ts`).
5. **Money is integer paise. Stock is integer milli-units.** Never store floats. Convert only for display/input (`money.ts`, `units.ts`).
6. **Dates are shown in India time** (`time.ts`). Daily numbers reset on the India date.
7. **Multi-step changes run in one transaction** (`db.$transaction`). Use a Postgres advisory lock where two phones could race (see table orders, payments).
8. **Actions return `{ ok: true, … } | { ok: false, error }`** for mistakes a person can fix (throw `UserError` inside `run`). Form actions in `manage.ts`/`stock.ts` redirect back with `?error=`.
9. **After a change call `revalidatePath("/", "layout")`** so every screen shows it.
10. **Keep history:** menu items, staff, tables and ingredients are turned off (`active: false`), not deleted. Orders and stock moves are never deleted.
11. **Snapshot what a bill needs** (name, price, veg) onto the order item when ordering.
12. **Screens poll** with `<AutoRefresh seconds={…} />` instead of websockets: simpler and free on our hosting.
13. **Phone first:** test every screen at 390 px wide; buttons at least 44 px tall; plain words on screen.
14. **Write for people:** error messages say what to do ("Enter a 10-digit mobile number"), not codes.

## Common tasks

### Add a feature
1. Write down the rule in `docs/FLOWS-AND-RULES.md` (who can do it, what changes).
2. Database change? Edit `prisma/schema.prisma`, then `npx prisma migrate dev --name short_name`. Commit the new migration folder.
   Update `prisma/seed.ts` if the sample data should show it.
3. Logic in `src/lib/` (pure functions get a `*.test.ts`), the change in `src/app/actions/`, the screen in `src/app/(staff)/…`.
4. Add a step to the closest browser test in `tests/e2e/` (or a new `NN-name.js`).
5. Update `docs/USER-GUIDE.md` and `CHANGELOG.md`.
6. Run the checks below.

### Fix a bug
1. Reproduce it: add a failing check to a browser test or a unit test first.
2. Fix it. The test now passes.
3. Note it in `CHANGELOG.md`. If the bug was a misunderstood rule, fix `FLOWS-AND-RULES.md` too.

### Change a role's permissions
Edit the lists in `src/lib/auth.ts` (or the `requireStaff([...])` call in that action), and the table in `FLOWS-AND-RULES.md`.

### Checks before every commit
```bash
npm run lint        # type check
npm test            # unit tests (bill maths, money, units)
npm run build       # production build
npm run test:e2e    # browser tests on their own database (about 3 minutes)
```

## Database changes in production

- `prisma migrate deploy` runs automatically: in the Docker container on start, and in the Vercel build.
- Never edit or delete a migration that was already deployed; add a new one.
- Renaming or removing a column loses data: add the new column, copy data in the migration SQL, remove the old one later.
- Take a backup before a risky change (`deploy/SERVER-SETUP.md` → Backups).

## Environment variables

| Name | Needed | What |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection used by the app (pooled URL on Neon/Supabase) |
| `DIRECT_URL` | yes | Connection for migrations (same as above for a normal Postgres) |
| `SESSION_SECRET` | yes | Long random string that signs staff logins. Changing it logs everyone out. |
| `PUBLIC_URL` | recommended in production | Web address used inside table QR codes, e.g. `https://dfc.example.in` |
| `E2E_DATABASE_URL`, `E2E_PORT` | no | Override the browser tests' database / port |

## Releasing

1. Checks above pass. `CHANGELOG.md` updated.
2. Push to `main`.
3. Free test site (Vercel) updates by itself. Server: `cd restro-app && git pull && sudo docker compose up -d --build`.
4. Open the site on a phone and try the changed screen.

## Gotchas

- Tailwind 4: shared classes (`btn`, `card`, `input`, …) are defined with `@utility` in `globals.css`, not `@layer components`.
- Next.js page files (`page.tsx`) may only export the page and Next.js settings. Put shared components in `src/components/`.
- `next.config.ts` builds `standalone` output for Docker but not on Vercel.
- Vercel's free plan is for testing only (no business use).
- The table QR codes contain the site address: decide the final domain before printing them.
- The `CustomerRequest` model is stored in the database table `TableRequest` (`@@map`), its name before website orders existed.
