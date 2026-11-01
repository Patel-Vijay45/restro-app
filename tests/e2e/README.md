# Browser tests

These tests click through the app in a real (headless) Chrome on a phone-sized screen, as staff and customers would.
Run them before every release and after every bug fix or new feature.

```bash
npm run build          # after any code change
npm run test:e2e       # all suites (about 3 minutes)
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
| `02-table-qr` | Customer scans T7 → order request → waiter confirms → kitchen cooking shows on customer phone → reject a request → ask for bill → QR sheet → invalid QR |
| `03-stock` | Stock goes down with orders, back when removed before cooking, not after → purchase and average cost → wastage → count → recipe editor → new ingredient → stall stock separate → food cost in report |
| `04-website` | Website buttons, WhatsApp takeaway message, stall tab, veg filter, sold out on website, `/staff` entry, desktop layout |

Adding a test: copy the closest suite, keep the `NN-name.js` file name, use the helpers in `helpers.js`
(`login`, `ctx`, `row`, `check`, `expectEq`, `stock`, `shot`). Each suite starts from fresh sample data.
