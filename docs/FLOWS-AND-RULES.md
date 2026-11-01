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
| Confirm / reject customer QR requests | ✓ | ✓ | ✓ | ✓ | – |
| Generate a bill (no discount) | ✓ | ✓ | ✓ | ✓ | – |
| Give a discount | ✓ | ✓ | ✓ | – | – |
| Take payments, stall counter sales | ✓ | ✓ | ✓ | – | – |
| Kitchen screen: start cooking / ready | ✓ | ✓ | –* | –* | ✓ |
| Mark food served | ✓ | ✓ | ✓ | ✓ | ✓ |
| Remove an item already sent / cancel an order | ✓ | ✓ | – | – | – |
| Menu, recipes, tables, QR codes, outlet settings | ✓ | ✓ | – | – | – |
| Stock: purchase, wastage, count, ingredients | ✓ | ✓ | – | – | – |
| Sales report | ✓ | ✓ | – | – | – |
| Add / change waiters, kitchen, cashiers | ✓ | ✓ (own outlet) | – | – | – |
| Add / change managers and owners | ✓ | – | – | – | – |

\* At the stall (counter outlet) the cashier also marks tokens ready / collected.
Role lists live in `src/lib/auth.ts` (`CAN_ORDER`, `CAN_TAKE_PAYMENT`, `CAN_SEE_KITCHEN`, `CAN_MANAGE`).

## Order flow (restaurant)

```
Waiter / confirmed QR request
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

## Table QR (customers)

- Each table has a secret link `/t/<code>` printed as a QR code. No login.
- Customers can see the menu, their table's running order and status, call the waiter, ask for the bill, and see a Pay by UPI button once billed.
- **Customer orders are requests.** Nothing reaches the kitchen until a staff member taps *Send to kitchen*.
- Limits per table: 10 requests per 10 minutes, at most 2 order requests waiting, at most 30 items per request.
- Pressing *Call waiter* or *Ask for bill* twice does not create two requests.
- *Ask for bill* only works when the table has an order. Generating the bill closes the bill request automatically.
- **New QR** (Manage → Tables) changes the secret: old printed codes stop working. Hidden tables' codes don't work either.

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
- WhatsApp takeaway orders are **not** stored in the system: they arrive as a WhatsApp message and staff enter them as a takeaway.
- An outlet appears on the website only if *Show on the website* is on (Manage → Outlet).

## Screen refresh

There is no live push connection; screens re-check the server: kitchen every 3 s, orders and tokens every 4 s,
table QR page every 5 s, stall new-order screen every 15 s. Only while the screen is visible.
