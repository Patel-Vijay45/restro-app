# Browser tests

These tests click through the app in a real (headless) Chrome on a phone-sized screen, as staff and customers would.
Run them before every release and after every bug fix or new feature.

```bash
npm run build          # after any code change
npm run test:e2e       # all suites (about 5 minutes)
npm run test:e2e -- 03 # only suites starting with "03"
```

- They use their **own database**: the `.env` database name + `_e2e` (e.g. `restro_e2e`), local only.
  It is wiped and refilled with the sample data before each suite. Your normal data is never touched.
  The Postgres user needs permission to create databases.
- They start the app on port 3100 by themselves.
- Screenshots of every step land in `tests/e2e/screenshots/` (not committed).
- First time on a new computer: `npx playwright install chromium`.

| Suite | Checks |
|---|---|
| `01-staff-flow` | Waiter order → kitchen → served → bill, 10% discount, UPI + cash split, change, receipt → manager removes an item → sold-out switch → stall counter sale, tokens → sales report |
| `02-table-qr` | Customer scans T7 → order request → waiter confirms → kitchen cooking shows on customer phone → reject (reason shown) → add more items → ask for bill → QR sheet → table page in Kannada → invalid QR |
| `03-stock` | Stock goes down with orders, back when removed before cooking, not after → purchase and average cost → wastage → count → recipe editor → new ingredient → stall stock separate → food cost in report |
| `04-website` | Website buttons, takeaway checkout → tracking page, "Your order" bar, stall tab, veg filter, sold out on website, dine-in hint, Kannada and Hindi (with a Hindi error message), `/staff` entry, desktop layout |
| `05-online-order` | Website order → staff accept (token) → customer adds more → accept → kitchen → Ready for pickup → Collected → Bill → Paid; rejected order shows the reason; spam limit; stall online order; dish photos (dish page, all-dishes screen, tap to enlarge) |
| `06-staff-salary` | Save messages in admin (green and red) → add a helper with salary → attendance on the calendar → advance, bonus cancelled → salary sheet balance and pay → daily attendance → a manager can't see pay → helpers not on the login screen |

Adding a test: copy the closest suite, keep the `NN-name.js` file name, use the helpers in `helpers.js`
(`login`, `ctx`, `row`, `check`, `expectEq`, `stock`, `shot`). Each suite starts from fresh sample data.
