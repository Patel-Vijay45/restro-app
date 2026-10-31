# DFC Family Restaurant: staff app

Ordering, kitchen, billing and (soon) stock for **DFC Family Restaurant** and the **DFC Mall Stall**, Gajendragad.
Everything works from a phone. A PC or tablet is optional.

## What works now (phases 1–3)

| Who | Screen | What they do |
|---|---|---|
| Waiter | **Orders → Tables** | 12-table map (free / eating / bill given / food ready). Tap a table, add dishes, notes like "less spicy", send to kitchen. |
| Kitchen | **Kitchen** | New tickets appear by themselves with a beep. *Start cooking* → *Food ready*. Tickets older than 20 min turn red. |
| Waiter | **Order** | Sees *READY* on the table, marks it served. Can add more items any time. |
| Cashier / owner | **Bill** | Generates the bill, discount (% or ₹), takes Cash / UPI (QR shown on screen) / Card, split payments, shows change to give back. Print or WhatsApp the bill. |
| Stall | **Orders** (counter mode) | Tap dishes → *Charge* → take payment → token number. **Tokens** tab: *Food ready: call #12* → *Collected*. |
| Customer | **Table QR** (scan, no app, no login) | Menu with veg filter and sold-out dishes, picks dishes and sends them **to the waiter for confirmation**, sees live status (received → cooking → coming → served), *Call waiter*, *Ask for bill*, *Pay by UPI* button. |
| Waiter | **Orders → Customer requests** | Phone beeps and vibrates. Order requests: *Send to kitchen* or *Reject*. Calls and bill requests: *Done* / *Open bill*. The table tile glows with 🛒 🔔 🧾. |
| Owner / manager | **Manage** | Menu (add/edit dishes, *sold out today* switch), tables, staff and PINs, outlet details (UPI ID, bill footer, printer paper size, GST switch). |
| Owner / manager | **Sales** | Day's sales, bills, average bill, cash vs UPI vs card, top dishes, **removed items and cancelled orders with reasons**, both outlets combined. |

Safety built in: nothing a customer orders reaches the kitchen until a waiter confirms it, so an old photo of a QR can't
place fake orders; each table allows at most 10 requests per 10 minutes; *Manage → Tables → New QR* makes a table's old
printed QR stop working; only managers/owner can remove an item after it went to the kitchen (with a reason that shows in the report);
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

To try the table QR: log in as Owner → *Manage → Tables* → *Customer view* next to any table
(or *Print QR codes* and scan one with a phone on the same Wi-Fi).

## Cost plan (lowest cost)

| What | Cost | Notes |
|---|---|---|
| Server (app + database + HTTPS + daily backups, both outlets) | **≈ ₹400–600 / month** | One 1 GB RAM Linux server in India. See [deploy/SERVER-SETUP.md](deploy/SERVER-SETUP.md). |
| Web address | ≈ ₹500–900 / year (optional) | A `.in` domain looks better on table QR codes. Free alternative: `<ip>.sslip.io`. |
| Bills on WhatsApp, UPI QR, customer QR menu | ₹0 | Uses WhatsApp links and UPI links: no SMS charges, no payment-gateway fees. |
| Software licences | ₹0 | All open source. |
| One-time | ≈ ₹20 per table (print + laminate) or ≈ ₹100–150 (acrylic stand) | QR sheet: *Manage → Tables → Print QR codes* (6 per A4 page). |

**Total ≈ ₹500–650 a month** for both outlets. POS software subscriptions usually charge per outlet per year on top of that.

Why a server and not a "free" cloud plan: every phone checks for new orders every few seconds. Pay-per-request hosting
counts each check, and Vercel's free plan does not allow business use. On your own server those checks cost nothing.

### Demo first (₹0)
For showing the owner, any of these is fine:
- run it on your laptop (`npm run dev`) and open it on phones on the same Wi-Fi at `http://<laptop-ip>:3000`
  (the table QR codes will point there too), or
- put it on the server above using the free `sslip.io` address.

Before printing the real QR codes, set the final web address. Changing it later means reprinting them.

## Printing bills from a phone
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
src/app/t/[token]          customer page behind each table QR (public)
src/app/print              thermal receipt, table QR sheet
src/app/actions            all changes (orders, manage, login)
src/lib                    bill maths, money, login sessions, numbering
```

## Roadmap

- [x] **Phase 1: restaurant core:** waiter app, kitchen screen, billing, menu/staff/tables admin
- [x] **Phase 2: stall counter:** quick billing, token numbers
- [x] Basic sales report (both outlets)
- [x] **Phase 3: table QR:** customer scans → menu, order request (waiter confirms), live status, call waiter, ask for bill, pay by UPI
- [x] Low-cost hosting: Docker setup for one small server (app + database + HTTPS + backups)
- [ ] **Phase 4: inventory:** raw materials, recipes per dish, auto stock deduction, purchases, wastage, low-stock alerts (per outlet)
- [ ] **Phase 5: public website** + logo refresh
- [ ] Later: offline mode for weak internet, table move/merge, direct Bluetooth printing
