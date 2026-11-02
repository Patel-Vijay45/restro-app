# DFC Family Restaurant: restaurant system

Website, ordering, kitchen screen, billing, table QR and stock for **DFC Family Restaurant** and the **DFC Mall Stall**, Gajendragad.
Everything works from a phone. A PC or tablet is optional.

## Documentation

| For | Read |
|---|---|
| Owner and staff: how to use every screen, daily routine, problems | [docs/USER-GUIDE.md](docs/USER-GUIDE.md) |
| Business rules: roles and permissions, order / payment / stock flows, numbering, limits | [docs/FLOWS-AND-RULES.md](docs/FLOWS-AND-RULES.md) |
| Changing the code: folder map, coding rules, adding features, fixing bugs, releasing | [docs/DEVELOPER.md](docs/DEVELOPER.md) |
| Browser tests | [tests/e2e/README.md](tests/e2e/README.md) |
| Free online test site (Vercel + Neon) | [deploy/FREE-TEST-SETUP.md](deploy/FREE-TEST-SETUP.md) |
| Going live on a server | [deploy/SERVER-SETUP.md](deploy/SERVER-SETUP.md) |
| What changed when | [CHANGELOG.md](CHANGELOG.md) |
| Rules for AI assistants working on this repo | [CLAUDE.md](CLAUDE.md) |

## What works now (phases 1–5)

| Who | Screen | What they do |
|---|---|---|
| Waiter | **Orders → Tables** | 12-table map (free / eating / bill given / food ready). Tap a table, add dishes, notes like "less spicy", send to kitchen. |
| Kitchen | **Kitchen** | New tickets appear by themselves with a beep. *Start cooking* → *Food ready*. Tickets older than 20 min turn red. |
| Waiter | **Order** | Sees *READY* on the table, marks it served. Can add more items any time. |
| Cashier / owner | **Bill** | Generates the bill, discount (% or ₹), takes Cash / UPI (QR shown on screen) / Card, split payments, shows change to give back. Print or WhatsApp the bill. |
| Stall | **Orders** (counter mode) | Tap dishes → *Charge* → take payment → token number. **Tokens** tab: *Food ready: call #12* → *Collected*. |
| Public | **Website** (`/`) | **English / ಕನ್ನಡ / हिंदी**, logo, Call / Map buttons, opening hours, **live menu with dish photos** for the restaurant and the stall (prices and *sold out* come straight from the system), veg filter, search, **takeaway ordering**: name + mobile, pay at the counter on pickup, **live tracking page** (token number, Accepted → Cooking → Ready for pickup → Collected → Bill → Paid), add more items, Google map, set up for Google search. |
| Customer | **Table QR** (scan, no app, no login) | English / ಕನ್ನಡ / हिंदी, menu with photos (tap to enlarge), veg filter and sold-out dishes; sends dishes **to the waiter for confirmation**; progress bar Sent → Accepted → Cooking → Ready → Served → Bill → Paid with each round's status; **add more items** to the same bill any time; *Call waiter*, *Ask for bill*, *Pay by UPI*. |
| Staff | **Orders → Customer requests** | Phone beeps and vibrates. Table and website orders: *Accept / Send to kitchen* or *Reject* with a reason the customer sees. Calls and bill requests: *Done* / *Open bill*. The table tile glows with 🛒 🔔 🧾; website orders show 🌐 with name, mobile and pickup time. |
| Owner / manager | **Manage** | Menu (add/edit dishes, *sold out today* switch), tables, staff and PINs, outlet details (UPI ID, bill footer, printer paper size, GST switch). |
| Owner / manager | **Stock** | Ingredients per outlet with live stock (kg / L / pcs) and *running low* list (red badge on the Stock tab). **Purchase** (quantity, amount paid, supplier: updates the average cost), **Wastage** (with reason), **Count** (enter what is really there; the difference is saved). History of every change per ingredient. |
| Owner / manager | **Manage → Menu → 📷 Photos** | Real **photo for every dish** from the phone camera or gallery (made small automatically), with a count of dishes still missing one. Kannada / Hindi dish names inside each dish. |
| Owner / manager | **Manage → Menu → dish → Recipe** | How much of each ingredient one portion uses (g / ml / pcs). Shows cost to make, selling price and **food cost %**. |
| Owner / manager | **Sales** | Day's sales, bills, average bill, cash vs UPI vs card, food cost of paid bills, purchases, wastage, stock missing in counts, top dishes, **removed items and cancelled orders with reasons**, both outlets combined. |

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
npm run db:seed               # sample menu with recipes, stock, 12 tables, test logins
                              # (on an older demo database it adds the sample stock and recipes)
npm run dev                   # website http://localhost:3000, staff app http://localhost:3000/staff
```

Sample logins. **The owner/admin login is "Owner" with PIN 1234.** There are no passwords: each person taps their
name and enters a 4–6 digit PIN. Change every PIN before going live (Manage → Staff).

| Login | PIN | Role |
|---|---|---|
| Owner | 1234 | everything, both outlets |
| Ravi (Waiter) | 1111 | restaurant waiter |
| Kitchen | 2222 | restaurant kitchen screen |
| Counter | 3333 | restaurant cashier |
| Stall | 4444 | mall stall counter |

Forgot the owner PIN? `npm run set-pin -- "Owner" 5678` sets a new one (see the user guide for the server and Vercel).

`npm test` runs the unit tests, `npm run lint` type-checks, `npm run test:e2e` runs the browser tests
(after `npm run build`; they use their own database, see [tests/e2e/README.md](tests/e2e/README.md)).

To try the table QR: log in as Owner → *Manage → Tables* → *Customer view* next to any table
(or *Print QR codes* and scan one with a phone on the same Wi-Fi).

## Addresses

| Address | Who |
|---|---|
| `/` | Public website |
| `/staff` (or `/login`) | Staff app. On each staff phone open this and use *Add to Home screen*. |
| `/t/<code>` | Customer page behind each table QR |

Website details (short line, opening hours, Google Maps link, show/hide an outlet) are in **Manage → Outlet**.
After going live, add the website address to the restaurant's Google Maps listing (Google Business Profile, free),
so people searching on Google see the menu.

## How stock works

- When an order goes to the kitchen, each dish's recipe amounts are taken out of stock automatically
  (2 × Chicken Biryani with 200 g chicken each = 400 g less chicken). Dishes without a recipe are simply not tracked.
- An item removed **before** the kitchen starts cooking puts its ingredients back. Removed after cooking started, they stay used.
- Stock can go below zero if more was used than recorded. That is a sign to do a **Count**.
- Do a quick **Count** every night (or once a week for slow items). "Missing in stock count" in Sales shows the value
  that disappeared: wrong recipes, unrecorded wastage or theft.
- The restaurant and the stall have separate ingredients and stock.

## Cost plan (lowest cost)

| What | Cost | Notes |
|---|---|---|
| Server (app + database + HTTPS + daily backups, both outlets) | **≈ ₹400–600 / month** | One 1 GB RAM Linux server in India. See [deploy/SERVER-SETUP.md](deploy/SERVER-SETUP.md). |
| Web address | ≈ ₹500–900 / year (optional) | A `.in` domain looks better on table QR codes. Free alternative: `<ip>.sslip.io`. |
| Bills on WhatsApp, UPI QR, customer QR menu, website orders, dish photos | ₹0 | Uses WhatsApp links and UPI links (no SMS charges, no payment-gateway fees); photos are stored in the same database. |
| Software licences | ₹0 | All open source. |
| One-time | ≈ ₹20 per table (print + laminate) or ≈ ₹100–150 (acrylic stand) | QR sheet: *Manage → Tables → Print QR codes* (6 per A4 page). |

**Total ≈ ₹500–650 a month** for both outlets. POS software subscriptions usually charge per outlet per year on top of that.

Why a server and not a "free" cloud plan: every phone checks for new orders every few seconds. Pay-per-request hosting
counts each check, and Vercel's free plan does not allow business use. On your own server those checks cost nothing.

### Demo first (₹0)
**Free online test link:** follow [deploy/FREE-TEST-SETUP.md](deploy/FREE-TEST-SETUP.md) (Vercel + Neon, about 15 minutes,
works on any phone). For testing only. Other ways:
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
src/app/(staff)/stock      ingredients, purchase, wastage, stock count
src/app/(staff)/reports    sales report
src/app/page.tsx           public website (src/components/site: menu with takeaway ordering)
src/app/track/[token]      customer tracking page for a website order (public)
src/app/photo/[id]         dish photos
src/app/t/[token]          customer page behind each table QR (public)
src/app/print              thermal receipt, table QR sheet
src/app/actions            all changes (orders, manage, login)
src/lib                    bill maths, money, stock units, login sessions, numbering
tests/e2e                  browser tests
docs                       user guide, business rules, developer guide
```

## Roadmap

- [x] **Phase 1: restaurant core:** waiter app, kitchen screen, billing, menu/staff/tables admin
- [x] **Phase 2: stall counter:** quick billing, token numbers
- [x] Basic sales report (both outlets)
- [x] **Phase 3: table QR:** customer scans → menu, order request (waiter confirms), live status, call waiter, ask for bill, pay by UPI
- [x] Low-cost hosting: Docker setup for one small server (app + database + HTTPS + backups)
- [x] **Phase 4: inventory:** ingredients, recipes per dish with food cost, auto stock deduction, purchases, wastage, stock count, low-stock alerts (per outlet)
- [x] **Phase 5: public website:** live menu, call / map, Google search basics
- [x] Customer ordering: website takeaway with tracking, one status flow for table and website, add more items, dish photos
- [ ] Logo refresh (later)
- [ ] Later: offline mode for weak internet, table move/merge, direct Bluetooth printing
