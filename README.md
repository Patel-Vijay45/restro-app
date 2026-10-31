# DFC Family Restaurant: staff app

Ordering, kitchen, billing and (soon) stock for **DFC Family Restaurant** and the **DFC Mall Stall**, Gajendragad.
Everything works from a phone. A PC or tablet is optional.

## What works now (phase 1 + 2)

| Who | Screen | What they do |
|---|---|---|
| Waiter | **Orders → Tables** | 12-table map (free / eating / bill given / food ready). Tap a table, add dishes, notes like "less spicy", send to kitchen. |
| Kitchen | **Kitchen** | New tickets appear by themselves with a beep. *Start cooking* → *Food ready*. Tickets older than 20 min turn red. |
| Waiter | **Order** | Sees *READY* on the table, marks it served. Can add more items any time. |
| Cashier / owner | **Bill** | Generates the bill, discount (% or ₹), takes Cash / UPI (QR shown on screen) / Card, split payments, shows change to give back. Print or WhatsApp the bill. |
| Stall | **Orders** (counter mode) | Tap dishes → *Charge* → take payment → token number. **Tokens** tab: *Food ready: call #12* → *Collected*. |
| Owner / manager | **Manage** | Menu (add/edit dishes, *sold out today* switch), tables, staff and PINs, outlet details (UPI ID, bill footer, printer paper size, GST switch). |
| Owner / manager | **Sales** | Day's sales, bills, average bill, cash vs UPI vs card, top dishes, **removed items and cancelled orders with reasons**, both outlets combined. |

Safety built in: only managers/owner can remove an item after it went to the kitchen (with a reason that shows in the report);
prices always come from the menu on the server, not the phone; 5 wrong PINs locks a login for 5 minutes;
bills are numbered and old bills keep the price the dish had at the time.

## Try it locally

Needs Node 20+ and Postgres.

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL / DIRECT_URL / SESSION_SECRET
npx prisma migrate deploy
npm run db:seed               # sample menu, 12 tables, test logins
npm run dev                   # http://localhost:3000
```

Sample logins (change these before going live, in Manage → Staff):

| Login | PIN | Role |
|---|---|---|
| Owner | 1234 | everything, both outlets |
| Ravi (Waiter) | 1111 | restaurant waiter |
| Kitchen | 2222 | restaurant kitchen screen |
| Counter | 3333 | restaurant cashier |
| Stall | 4444 | mall stall counter |

`npm test` runs the bill-maths tests. `npm run lint` type-checks.

## Going live (free tier is enough to start)

1. **Database:** create a project on [Supabase](https://supabase.com) in the **Mumbai (ap-south-1)** region.
   From *Connect*, copy the **Transaction pooler** URL into `DATABASE_URL` (add `?pgbouncer=true`) and the **direct / session** URL into `DIRECT_URL`.
2. **App:** import this repo on [Vercel](https://vercel.com). Add the three variables from `.env.example`
   (`SESSION_SECRET`: run `openssl rand -base64 32`). Build command is already set in `package.json`.
3. Run once from your computer with the live `DIRECT_URL`: `npx prisma migrate deploy` and `npm run db:seed`.
4. Log in as Owner → **Manage**: replace the sample menu and prices, set the UPI ID and phone, set real staff PINs, turn off sample logins.
5. On each phone open the site in Chrome → menu → **Add to Home screen**. It then opens like an app.

### Printing bills from a phone
The bill opens a receipt sized for 58 mm or 80 mm paper (set in Manage → Outlet) and starts printing.
- **From a PC** with the printer driver installed: works directly.
- **From an Android phone:** install the printer's print-service app or **RawBT** from the Play Store, pair the printer (Bluetooth/USB), then *Print* in the app uses it.
- No printer at hand: use **WhatsApp bill**.

## Tech

Next.js 15 (App Router, server actions) · React 19 · Tailwind CSS 4 · Prisma 6 · PostgreSQL.
Screens refresh every few seconds, so every phone sees new orders without reloading.
Money is stored in paise (integers). KOT and token numbers restart daily (India time); bill numbers never restart.

```
prisma/schema.prisma       data model (outlets, staff, tables, menu, orders, KOTs, payments)
src/app/(staff)/orders     tables, new order, order detail, bill & payment, stall counter
src/app/(staff)/kitchen    kitchen screen
src/app/(staff)/manage     menu, tables, staff, outlet settings
src/app/(staff)/reports    sales report
src/app/print              thermal receipt
src/app/actions            all changes (orders, manage, login)
src/lib                    bill maths, money, login sessions, numbering
```

## Roadmap

- [x] **Phase 1: restaurant core:** waiter app, kitchen screen, billing, menu/staff/tables admin
- [x] **Phase 2: stall counter:** quick billing, token numbers
- [x] Basic sales report (both outlets)
- [ ] **Phase 3: table QR:** customer scans → menu, live order status, call waiter, request bill, pay by UPI
- [ ] **Phase 4: inventory:** raw materials, recipes per dish, auto stock deduction, purchases, wastage, low-stock alerts (per outlet)
- [ ] **Phase 5: public website** + logo refresh
- [ ] Later: offline mode for weak internet, table move/merge, direct Bluetooth printing
