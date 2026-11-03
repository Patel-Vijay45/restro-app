# Changelog

Newest first. Add an entry for every change that people will notice.

## 2026-11-03: Staff and salary, save feedback
- **Every admin save now shows a message** at the top ("✓ … saved" in green, problems in red) and buttons show "Saving…".
- **Staff**: phone, joining date, salary per month or per day; **Helper** job for staff without an app login;
  *Mark as left* stops pay after that day.
- **Attendance**: daily screen (everyone present unless marked absent / half day / paid leave) and a month calendar per person.
- **Salary (owner only)**: advances, bonus, deductions, cancel with reason; monthly salary sheet with what each person
  earned and is still owed, and a *Pay* button. Sales report shows staff pay given that day.

## 2026-11-02: Languages, photos screen, dine-in hint
- Customer screens (website, table QR, order tracking) in **English, Kannada and Hindi**; Kannada / Hindi dish and category
  names (sample menu included; `npm run db:seed` adds them to an existing database).
- Website explains that dine-in orders are made from the table QR ("Eating here? Scan the QR code on your table").
- **📷 Photos** screen: every dish with its photo and an upload button; customers can tap a photo to see it large.
- `npm run set-pin` to reset a PIN when nobody can log in.

## 2026-11-01: Customer ordering and dish photos
- **Website takeaway orders** in the system (WhatsApp ordering removed): name + mobile, pay at the counter on pickup,
  live tracking page with token number, add more items until paid.
- **One status flow** for table QR and website: Sent → Accepted → Cooking → Ready → Served / Collected → Bill → Paid,
  with each round of added items shown separately; rejected orders show the staff's reason.
- Staff accept or reject website orders like table orders; stall token board shows online orders until collected and paid.
- **Dish photos**: upload from the phone (shrunk automatically), shown on the website and table QR menu; food icons for dishes without one.

## 2026-11-01
- Free online test setup (Vercel + Neon): `deploy/FREE-TEST-SETUP.md`.
- Documentation: user guide, business flows and rules, developer guide, project rules for AI assistants.
- Browser tests moved into the repository (`npm run test:e2e`), running on their own test database.

## 2026-10-31: Phase 5, public website
- Website at `/`: logo, call / WhatsApp / map buttons, opening hours, live menu for both outlets, veg filter, search.
- Takeaway order on WhatsApp from the website.
- Search engine basics (metadata, structured data, sitemap, robots). Staff app moved to `/staff`.
- Website details editable in Manage → Outlet.

## 2026-10-31: Phase 4, inventory
- Ingredients per outlet, recipes per dish with food cost %, automatic stock deduction from orders.
- Purchases (average cost), wastage, stock count, history per ingredient, low-stock alerts.
- Sales report: food cost, purchases, wastage, value missing in counts.

## 2026-10-31: Phase 3, table QR
- Customer page per table: menu, order requests (waiter confirms), live status, call waiter, ask for bill, pay by UPI.
- Waiter alerts (beep, vibrate, glowing table), printable QR sheet, "New QR" per table.
- Low-cost server setup (Docker Compose: app, Postgres, HTTPS, daily backups).

## 2026-10-31: Phases 1 and 2, core
- Waiter app, kitchen screen, billing (discount, split Cash/UPI/Card, receipt, WhatsApp bill).
- Mall stall counter mode with token numbers.
- Manage menu (sold-out switch), tables, staff and PINs, outlet settings; sales report.
