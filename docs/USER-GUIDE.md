# DFC staff app: how to use it

For the owner, managers, cashiers, waiters, kitchen staff and the stall.
Everything works on a phone. A PC or tablet is optional.

- [Getting started](#getting-started)
- [Waiter](#waiter)
- [Kitchen](#kitchen)
- [Cashier: bills and payments](#cashier-bills-and-payments)
- [Mall stall](#mall-stall)
- [Owner and manager](#owner-and-manager)
- [Customers](#customers)
- [Daily routine](#daily-routine)
- [Problems and fixes](#problems-and-fixes)

---

## Getting started

1. On the phone, open Chrome and go to **`<your address>/staff`**.
2. Tap Chrome's **⋮** menu → **Add to Home screen**. From now on open it from the DFC icon like an app.
3. Tap your name, enter your **PIN**, tap **Login**.
   - 5 wrong PINs lock that login for 5 minutes.
   - A login lasts one long shift (16 hours), then asks for the PIN again.
4. The **bottom bar** shows only what your job needs:

| Job | Tabs |
|---|---|
| Waiter | Orders |
| Kitchen | Kitchen |
| Cashier | Orders (tables, bills, payments) |
| Manager | Orders, Kitchen, Stock, Sales, Manage (own outlet) |
| Owner | Same as manager, for **both outlets**. Switch outlet with the name at the top left. |

Screens update by themselves every few seconds. No need to reload.

---

## Waiter

**Take an order**
1. **Orders** shows the 12 tables: green = free, yellow = eating, red = bill given.
2. Tap a table → tap **ADD** on dishes (use the search box or the Veg / Non-veg filter).
3. **Review →** check quantities, write notes like "less spicy", optionally the number of guests.
4. **Send to kitchen**. The kitchen screen beeps.

**Add more later:** tap the table → **+ Add items**. Each round is a new kitchen ticket (KOT).

**Food ready:** the table tile shows **READY**. Serve it, then open the table → **Mark served ✓**.

**Customer requests from the table QR** (the phone beeps and vibrates, the table tile glows):
- 🛒 **wants to order** → check the dishes with the customer → **Send to kitchen ✓** or **Reject**.
- 🔔 **is calling you** → go to the table → **Done ✓**.
- 🧾 **asked for the bill** → **Open bill** → **Generate bill**.

**Bill:** open the table → **Bill →** → **Generate bill**. The cashier takes the payment.

**Takeaway:** Orders → **+ New takeaway** → dishes → customer name → Send to kitchen. It gets a token number.

Waiters cannot remove an item once it went to the kitchen. Ask the manager.

---

## Kitchen

1. New tickets appear with a **beep**: table (or token), KOT number, minutes waiting, dishes, notes in red.
2. Tap **Start cooking** when you start, **Food ready ✓** when it's done.
3. Tickets waiting **20 minutes or more** get a red border.
4. **Ready, not picked up** tab: food the waiters haven't collected yet.

Crossed-out dishes were removed by the manager: don't make them.

---

## Cashier: bills and payments

1. Open the table (or the 🧾 request) → **Bill →**.
2. **Discount** (if needed): None / % / ₹ → **Generate bill**. Only cashier, manager and owner can give discounts.
3. **Take payment**:
   - **Cash**: type the amount received → the screen shows **Give back ₹…**.
   - **UPI**: a QR code for the exact amount appears (once the UPI ID is set in Manage → Outlet). The customer scans and pays.
     **Check the payment on your UPI app or soundbox before tapping Received UPI.**
   - **Card**: after the card machine approves.
   - **Split**: enter part as UPI, then the rest as Cash. The balance is shown.
4. When everything is paid the table turns free again.
5. **🖨️ Print** for a paper bill, or type the customer's mobile number → **WhatsApp bill**.

If more food is ordered after the bill was generated, the bill reopens: generate it again.

---

## Mall stall

Counter service: customers pay first, then get a token number.

1. **New order** tab: tap dishes → **Review →** → **Charge ₹…**.
2. Take the payment (Cash / UPI / Card) → **Received**. The bill shows the **token number**. Print or tell it to the customer.
3. **Tokens** tab: when the food is ready tap **Food ready: call #12**, call out the number, then **Collected ✓** when they take it.

Token and KOT numbers start from 1 every day.

---

## Owner and manager

### Menu (Manage → Menu)
- **Sold out today:** turn the switch off next to the dish. It shows as *Sold out* and can't be ordered on staff phones, the table QR or the website. It stays off until you turn it back on.
- **Change a price or name:** tap the dish → edit → Save. Old bills keep the old price.
- **New dish:** **+ Dish**. **New category:** box at the bottom.
- **Remove a dish:** open it → *Remove from menu* (old bills still show it).
- **Recipe and cost** (inside a dish): how much of each ingredient **one portion** uses. Shows cost to make and food cost %
  (aim for 25–35%). Dishes without a recipe show "no recipe" and are not counted in stock.

### Tables and QR codes (Manage → Tables)
- Rename, change seats, add, hide tables.
- **Print QR codes**: A4 sheet, 6 per page. Cut, laminate or put in table stands.
- **Customer view**: see what customers see for that table.
- **New QR**: if a photo of a table's QR is being misused, this makes the old printed one stop working. Print it again.

### Staff (Manage → Staff)
- **Add staff**: name, job, PIN (4–6 digits). They are added to the outlet you are viewing.
- **Forgot PIN**: open the person → type a new PIN → Save.
- **Someone left**: open → *Turn off login*. Their old orders stay in the reports.
- Managers can add waiters, kitchen staff and cashiers. Only the owner can add managers and owners.

### Outlet settings (Manage → Outlet)
Name and address on bills, phone, **UPI ID** (for payment QR codes), bill footer, printer paper (58 or 80 mm),
GST (leave **off** unless registered), and website details (short line, opening hours, Google Maps link, show on website).

### Stock (Stock tab)
- **Running low** list at the top, and a red number on the Stock tab.
- **🛒 Purchase**: ingredient, quantity, total paid, supplier. Do this for every delivery. It keeps costs correct.
- **🗑️ Wastage**: what was thrown away, and why.
- **📋 Count**: weigh or count what is really there and enter it. Differences are saved as "Count correction".
- **+ Ingredient**: new raw material with unit (kg / litre / pieces), warning level, stock now and price.
- Tap an ingredient to see its **history**: every purchase, use, wastage and count, with who and when.

Stock goes down automatically when orders go to the kitchen (from the dish recipes).
If an item is removed **before** cooking starts, its ingredients come back. After cooking started they stay used.

### Removing items and cancelling orders
On an order, managers and the owner see **×** next to each item: tap → give a reason.
**Cancel this order** (bottom of the order, only before any payment). Every removal and cancellation, with the reason and
who did it, appears in **Sales**, so the owner can check them.

### Sales (Sales tab)
Per day (← → to change day; owner can show both outlets): sales, number of bills, average bill, discounts, cash / UPI / card,
open orders, food cost of paid bills, purchases, wastage, value missing in stock counts, top dishes, removed items, cancelled orders.

---

## Customers

**At the table (QR code)**: scan with the phone camera, no app needed.
- **Menu**: tap ADD → **Send order to waiter**. The waiter confirms it before it goes to the kitchen.
- **My order**: what was ordered and its status (received → cooking → coming to you → served), and the total.
- **🔔 Call waiter**, **🧾 Ask for bill**, and after the bill: **Pay by UPI** (then show the success screen to the cashier).

**Website** (`<your address>`): menu with prices, Call / WhatsApp / Map buttons, opening hours.
**Takeaway on WhatsApp**: pick dishes → *Order on WhatsApp* → the message opens in WhatsApp, ready to send to the restaurant.
Staff then enter it as a takeaway order and reply with the time.

---

## Daily routine

**Opening**
- Manager: switch on all dishes that were sold out yesterday (Manage → Menu).
- Record morning deliveries (Stock → Purchase).
- Kitchen tablet/phone: open the Kitchen screen and keep the volume up.

**During the day**
- Turn dishes off when they run out.
- Record wastage when it happens.

**Closing**
- Check **Orders**: no table should still be yellow or red. Settle or cancel (with a reason) anything left.
- **Stock → Count** for the main items (chicken, mutton, paneer, oil, rice).
- **Sales**: check the day's totals against the cash in the drawer and the UPI app.

---

## Problems and fixes

| Problem | Fix |
|---|---|
| Forgot PIN | Owner or manager sets a new one in Manage → Staff. |
| "Too many wrong PINs" | Wait 5 minutes. |
| Screen not updating | Check the internet. Pull down to reload. |
| Kitchen not beeping | Tap the kitchen screen once after opening it (phones block sound until you touch the page). Keep volume up. |
| Wrong dish sent to kitchen | Manager removes it with a reason (before cooking: stock comes back). |
| Customer says they paid by UPI | Check your UPI app / soundbox first, then tap Received UPI. |
| Print button doesn't print from the phone | Install your printer's app or **RawBT** from the Play Store, or use WhatsApp bill. |
| Table QR says "not active" | The table was hidden or got a new QR. Print the current one from Manage → Tables. |
| Stock number looks wrong | Open the ingredient's history. Fix with a Count; check the dish recipes. |
