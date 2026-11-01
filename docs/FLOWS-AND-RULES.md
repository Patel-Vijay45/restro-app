# Business flows and rules

How the system behaves, and the rules it enforces. When you change a rule in the code, change it here too.
For how to use the screens, see [USER-GUIDE.md](USER-GUIDE.md).

## Outlets

| Outlet | Type | Service |
|---|---|---|
| DFC Family Restaurant | `RESTAURANT` | Tables, waiters, kitchen screen, table QR, takeaway |
| DFC Mall Stall | `COUNTER` | Pay at the counter first, token number, no tables |

Each outlet has its own menu, prices, tables, staff, stock, bill numbers and settings. Only the owner sees both.

## Roles and permissions

| Can… | Owner | Manager | Cashier | Waiter | Kitchen |
|---|:-:|:-:|:-:|:-:|:-:|
| Work at every outlet (switch outlet) | ✓ | – | – | – | – |
| Take orders, add items, takeaway | ✓ | ✓ | ✓ | ✓ | – |
| Accept / reject customer orders (table QR and website) | ✓ | ✓ | ✓ | ✓ | – |
| Generate a bill (no discount) | ✓ | ✓ | ✓ | ✓ | – |
| Give a discount | ✓ | ✓ | ✓ | – | – |
| Take payments, stall counter sales | ✓ | ✓ | ✓ | – | – |
| Kitchen screen: start cooking / ready | ✓ | ✓ | –* | –* | ✓ |
| Mark food served | ✓ | ✓ | ✓ | ✓ | ✓ |
| Remove an item already sent / cancel an order | ✓ | ✓ | – | – | – |
| Menu, dish photos, recipes, tables, QR codes, outlet settings | ✓ | ✓ | – | – | – |
| Stock: purchase, wastage, count, ingredients | ✓ | ✓ | – | – | – |
| Sales report | ✓ | ✓ | – | – | – |
| Add / change waiters, kitchen, cashiers | ✓ | ✓ (own outlet) | – | – | – |
| Add / change managers and owners | ✓ | – | – | – | – |

\* At the stall (counter outlet) the cashier also marks tokens ready / collected.
Role lists live in `src/lib/auth.ts` (`CAN_ORDER`, `CAN_TAKE_PAYMENT`, `CAN_SEE_KITCHEN`, `CAN_MANAGE`).

## Order flow (restaurant)

```
Waiter, or an accepted customer order (table QR / website)
        │  Send to kitchen  → creates a KOT (kitchen ticket) and takes recipe amounts out of stock
        ▼
     OPEN ──── more items → another KOT ────┐
        │                                    │
        │  Generate bill                     │
        ▼                                    │
     BILLED ── items added or removed ──→ back to OPEN (bill must be generated again)
        │
        │  payments cover the total
        ▼
      PAID  (table is free again)

  OPEN / BILLED ── manager cancels (only if no payment yet, reason required) ──→ CANCELLED
```

**Kitchen ticket (KOT):** `NEW` (waiting) → `PREPARING` (cooking) → `READY` → `SERVED`.

**Rules**
- One running order per table. Two waiters opening the same table at the same moment get the same order (database lock).
- Prices, names and veg mark are **copied into the order** when sent. Later menu changes never change old orders or bills.
- Prices always come from the server's menu, never from the phone.
- Sold-out or removed dishes cannot be ordered.
- Up to 99 of one dish per line.

## Stall flow (counter)

Tap dishes → **Charge** creates the order, its KOT and the bill in one step (status `BILLED`) → payment → `PAID`.
The token stays on the **Tokens** board until marked **Collected** (KOT `SERVED`), even after payment.

## Numbers

| Number | Restarts | Per |
|---|---|---|
| Bill number | Never | Outlet |
| KOT number | Every day (India time) | Outlet |
| Token number (takeaway and stall) | Every day (India time) | Outlet |

## Money and bills

- Amounts are stored in **paise** (₹1 = 100) as whole numbers.
- Subtotal = sum of (price × quantity) of items not removed.
- Discount: percent or flat ₹, never more than the subtotal. Only cashier, manager, owner.
- GST: only if switched on for the outlet (off by default; the business is not GST registered). Rate set per outlet.
- Total is **rounded to the nearest rupee**; the difference shows as "Round off".
- The same dish ordered in several rounds shows as one line on the bill.

## Payments

- A bill can be paid in parts (split): Cash, UPI, Card in any mix.
- **Cash** may be more than the balance: only the balance is recorded, the screen shows the change to give back.
- **UPI and Card** cannot be more than the balance.
- When payments reach the total, the order becomes `PAID`.
- UPI is **not** verified automatically (no payment gateway, no fees). Staff check the UPI app / soundbox before recording it.
- A bill with total ₹0 (100% discount) is closed as paid when generated.

## Removing items and cancelling

- Only manager / owner, always with a reason. The reason and the person's name are stored and shown in **Sales**.
- Removing an item from a **billed** order sends it back to `OPEN` (bill must be generated again).
- An order with any payment cannot be cancelled.

## Customer orders (table QR and website)

Customers order from their own phone in two places, with **one flow**:

| | Table QR (`/t/<code>`) | Website takeaway (`/` → `/track/<code>`) |
|---|---|---|
| Who | People sitting at a table | Anyone; name and 10-digit mobile required |
| Becomes | The table's running order (dine-in) | A takeaway order with a token number, marked 🌐 online |
| Pay | At the end, from the bill (cash / UPI / card) | When collecting, at the counter (or Pay by UPI once billed) |

**Steps the customer sees**

```
Sent ─▶ Accepted ─▶ Cooking ─▶ Ready (for pickup) ─▶ Served / Collected ─▶ Bill ─▶ Paid
 │
 └─▶ Not accepted (staff rejected it; the reason they typed is shown)
```

- **Sent**: the order is a *request*. Nothing reaches the kitchen until staff tap **Accept / Send to kitchen**.
- **Accepted → Cooking → Ready → Served** follow the kitchen ticket (KOT): `NEW → PREPARING → READY → SERVED`.
- **Bill** when staff generate the bill; **Paid** when payments cover it.
- **Add more items:** until the order is paid, the customer can send more dishes. Each sending is a new **round** with its own
  status ("Your order", "Added items 1", …). Every accepted round is added to the **same order and the same bill**.
  The top progress bar follows the least advanced round that is not served yet.
- Staff-entered rounds for the same table also show on the customer's page.
- Accepting or rejecting: one tap per request; if two staff tap at the same time, only one counts.

**Limits** (against pranks and mistakes)
- Table: 10 requests per 10 minutes, at most 2 order requests waiting, at most 30 items per request.
- Website: name and a valid Indian mobile number required; per number at most 2 orders waiting and 10 requests per 10 minutes;
  per tracking link at most 2 rounds waiting; at most 30 items per request.
- Customers can't add to an order that is paid or cancelled, or to a website order that was never accepted.
- Pressing *Call waiter* or *Ask for bill* twice does not create two requests.
- *Ask for bill* only works when the table has an order. Generating the bill closes the bill request automatically.

**Table QR codes**
- Each table has a secret link printed as a QR code. **New QR** (Manage → Tables) changes it: old printed codes stop working.
  Hidden tables' codes don't work either.
- The table page shows the running order of the people at the table now (and rejected requests from the last hour).
  After the bill is paid, the page starts empty for the next customers.

**Website orders**
- The tracking page link (`/track/<code>`) is the customer's only key to their order. The phone remembers it for a day,
  so the website shows a "Your order · Track it" bar.
- At the restaurant they appear in **Orders → Takeaway** (🌐), at the stall on the **Tokens** board.
- A stall token stays on the board until the food is **collected and** the bill is **paid**.

## Dish photos

- Owner / manager add a photo per dish (Manage → Menu → dish → **Add photo**), from the camera or gallery.
- The phone shrinks it (longest side 900 px, JPEG) before upload; the server accepts JPG / PNG / WebP up to 600 KB.
- Photos are stored in the database and served from `/photo/<id>`; phones cache them, so they load once.
- Replacing or removing a photo deletes the old one (photos are not history).
- Photos show on the website and the table QR menu. Staff screens stay without photos (faster).
  Dishes without a photo show a food icon chosen from the dish name.

## Stock

- Quantities are stored in thousandths of the unit ("milli"): 1 kg = 1000 (so 1 = 1 g), 1 L = 1000 (1 = 1 ml), 1 piece = 1000.
- Units: **kg** (recipes in g), **litre** (recipes in ml), **pieces**. The unit can't change once stock was recorded.
- Every change is a **stock move**: `PURCHASE`, `SALE`, `CANCEL_RETURN`, `WASTAGE`, `COUNT_ADJUST`. Stock = sum of moves.
- **SALE** happens when items are sent to the kitchen: recipe amount × quantity, for dishes that have a recipe.
- Item removed while its KOT is still `NEW` → **CANCEL_RETURN** puts the ingredients back. Once cooking started they stay used.
- Orders are **never blocked** by low stock; stock can go below zero (shown red) and should be fixed with a count.
- **Purchase** updates the ingredient's cost as a weighted average of stock on hand and the new purchase.
- **Count** stores the difference between counted and system stock; the value of missing stock shows in Sales.
- **Low stock**: at or below the warning level → listed first in Stock, red badge on the Stock tab, count in Sales.
- **Food cost** (Sales) = ingredient cost of dishes on bills **paid** that day. Recipe screen shows cost ÷ price.

## Login and security

- Staff log in with name + 4–6 digit PIN. PINs are stored hashed (scrypt), never in plain text.
- 5 wrong PINs → that login is locked for 5 minutes.
- A login lasts 16 hours. Turning off a staff login takes effect on their next screen load.
- Every screen and every action checks the role on the server, and every database query is limited to the person's outlet.
- Staff pages, the login page and table pages are hidden from search engines.

## Website

- `/` is public. Menu, prices and sold-out marks are read live from the database.
- Takeaway orders from the website go through the customer order flow above (no WhatsApp ordering).
- An outlet appears on the website only if *Show on the website* is on (Manage → Outlet).

## Screen refresh

There is no live push connection; screens re-check the server: kitchen every 3 s, orders and tokens every 4 s,
table QR page and order tracking page every 5 s, stall new-order screen every 10 s (4 s while requests are waiting).
Only while the screen is visible.
