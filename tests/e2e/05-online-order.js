// Website takeaway order, full flow: place → staff accept (token) → customer adds more → accept → kitchen → ready →
// collected → bill → paid. Also: reject with reason, spam limit, stall online order, dish photos (dish page and all-dishes screen, tap to enlarge).
const { BASE, ctx, login, shot, check, db, run } = require("./helpers");

const stepNow = async (page) => (await page.locator("[aria-current=step]").innerText()).trim();

async function placeOrder(page, { outlet, dishes, name, phone }) {
  await page.goto(BASE + "/");
  if (outlet) await page.getByRole("button", { name: outlet }).click();
  for (const d of dishes) {
    const more = page.getByRole("button", { name: `More ${d}` });
    if (await more.count()) await more.click();
    else await page.getByRole("button", { name: `Add ${d}` }).click();
  }
  await page.getByRole("button", { name: /Order takeaway/ }).click();
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByRole("button", { name: /Place order/ }).click();
  await page.waitForURL(/\/track\//);
}

/** Press every kitchen button until nothing is left to cook. */
async function cookEverything(kitchen) {
  for (let n = 0; n < 10; n++) {
    await kitchen.reload();
    const btn = kitchen.getByRole("button", { name: /Start cooking|Food ready/ }).first();
    if ((await btn.count()) === 0) return;
    await btn.click();
    await kitchen.waitForTimeout(400);
  }
}

run(async (browser) => {
  // 1. customer orders on the website
  const cust = await ctx(browser);
  await cust.route(/google\.com/, (r) => r.abort());
  await placeOrder(cust, { dishes: ["Chicken Biryani", "Chicken Biryani", "Butter Naan"], name: "Vijay", phone: "9876543210" });
  await cust.waitForSelector("text=Waiting for the restaurant");
  check("stage is Sent", (await stepNow(cust)).includes("Sent"));
  await shot(cust, "01-sent");
  const trackUrl = cust.url();

  // 2. staff accept -> token #1
  const staff = await ctx(browser);
  await login(staff, "Counter", "3333");
  await staff.waitForSelector("text=Online order");
  check("staff sees name and phone", (await staff.locator("text=9876543210").count()) > 0);
  await shot(staff, "02-staff-request");
  await staff.getByRole("button", { name: "Accept ✓" }).click();
  await staff.waitForSelector("text=Customer requests", { state: "detached" });
  await cust.reload();
  await cust.waitForSelector("text=#1");
  check("stage is Accepted", (await stepNow(cust)).includes("Accepted"));

  // 3. customer adds more items -> waiting -> staff accept, same order and token
  await cust.getByRole("button", { name: "+ Add more items" }).click();
  await cust.locator("div.flex.items-center.gap-3.p-3", { hasText: "Sweet Lassi" }).getByRole("button", { name: "ADD" }).click();
  await cust.getByRole("button", { name: /Review/ }).click();
  await cust.getByRole("button", { name: /Add to my order/ }).click();
  await cust.waitForSelector("text=Waiting for confirmation");
  await staff.reload();
  await staff.waitForSelector("text=adds to token #1");
  await staff.getByRole("button", { name: "Accept ✓" }).click();
  await staff.waitForSelector("text=Customer requests", { state: "detached" });
  const orders = await db.order.count({ where: { channel: "ONLINE" } });
  check("one order for both rounds", orders === 1);

  // 4. kitchen cooks both rounds -> ready for pickup
  const kitchen = await ctx(browser);
  await login(kitchen, "Kitchen", "2222");
  await kitchen.waitForSelector("text=Takeaway #1");
  await cookEverything(kitchen);
  await cust.goto(trackUrl);
  check("stage is Ready for pickup", (await stepNow(cust)).includes("Ready for pickup"));
  await shot(cust, "03-ready");

  // 5. handed over -> collected; bill; paid
  await staff.goto(BASE + "/orders");
  await staff.getByRole("link", { name: /Token 1/ }).click();
  await staff.waitForURL(/\/orders\/c/);
  await staff.getByRole("button", { name: /Mark served/ }).first().waitFor();
  check("order page shows phone", (await staff.locator("text=9876543210").count()) > 0);
  while ((await staff.getByRole("button", { name: /Mark served/ }).count()) > 0) {
    await staff.getByRole("button", { name: /Mark served/ }).first().click();
    await staff.waitForTimeout(800);
  }
  await cust.reload();
  check("stage is Collected", (await stepNow(cust)).includes("Collected"));
  await staff.getByRole("link", { name: /Bill/ }).click();
  await staff.getByRole("button", { name: "Generate bill" }).click();
  await staff.waitForSelector("text=/Bill #\\d+/");
  await cust.reload();
  check("stage is Bill", (await stepNow(cust)).includes("Bill"));
  check("bill total 2×200 + 45 + 60 = ₹505", (await cust.locator("text=₹505").count()) > 0);
  await staff.getByRole("button", { name: /Received cash/ }).click();
  await staff.waitForSelector("text=Done →");
  await cust.reload();
  await cust.waitForSelector("text=Paid. Thank you");
  check("closed order: no add more", (await cust.getByRole("button", { name: "+ Add more items" }).count()) === 0);
  await shot(cust, "04-paid");

  // 6. rejected order: the customer sees the reason
  const cust2 = await ctx(browser);
  await cust2.route(/google\.com/, (r) => r.abort());
  await placeOrder(cust2, { dishes: ["Mutton Biryani"], name: "Ravi", phone: "9123456780" });
  await staff.goto(BASE + "/orders");
  await staff.waitForSelector("text=Online order");
  await staff.getByRole("button", { name: "Reject" }).click(); // prompt answered "Customer changed mind"
  await staff.waitForSelector("text=Customer requests", { state: "detached" });
  await cust2.reload();
  await cust2.waitForSelector("text=Sorry, your order was not accepted");
  check("reason shown", (await cust2.locator("text=Customer changed mind").count()) === 1);

  // 7. spam limit: at most 2 orders waiting per phone number
  const cust3 = await ctx(browser);
  await cust3.route(/google\.com/, (r) => r.abort());
  await placeOrder(cust3, { dishes: ["Dal Fry"], name: "Test", phone: "9000000001" });
  await placeOrder(cust3, { dishes: ["Dal Fry"], name: "Test", phone: "9000000001" });
  await cust3.goto(BASE + "/");
  await cust3.getByRole("button", { name: "Add Dal Fry" }).click();
  await cust3.getByRole("button", { name: /Order takeaway/ }).click();
  await cust3.getByLabel("Your name").fill("Test");
  await cust3.getByLabel("Mobile number").fill("9000000001");
  await cust3.getByRole("button", { name: /Place order/ }).click();
  await cust3.waitForSelector("text=still waiting for the restaurant");
  console.log("ok  third waiting order from one number is refused");

  // 8. stall online order: accept, token board, collected, pay
  const cust4 = await ctx(browser);
  await cust4.route(/google\.com/, (r) => r.abort());
  await placeOrder(cust4, { outlet: "Mall Stall", dishes: ["Cold Coffee"], name: "Asha", phone: "9988776655" });
  const stall = await ctx(browser);
  await login(stall, "Stall", "4444");
  await stall.waitForSelector("text=Online order");
  await stall.getByRole("button", { name: "Accept ✓" }).click();
  await stall.waitForSelector("text=Customer requests", { state: "detached" });
  await stall.goto(BASE + "/orders?view=tokens");
  await stall.waitForSelector("text=Asha");
  await stall.getByRole("button", { name: /Food ready/ }).click();
  await stall.getByRole("button", { name: /Collected ✓/ }).click();
  await stall.getByRole("link", { name: /take payment/ }).click();
  await stall.getByRole("button", { name: "Generate bill" }).click();
  await stall.getByRole("button", { name: /Received cash/ }).click();
  await stall.waitForSelector("text=Done →");
  await stall.goto(BASE + "/orders?view=tokens");
  await stall.waitForSelector("text=No tokens waiting");
  console.log("ok  stall online order collected and paid");

  // 9. dish photo: owner uploads, website shows it
  const owner = await ctx(browser);
  await login(owner, "Owner", "1234");
  await owner.goto(BASE + "/manage/menu");
  await owner.getByRole("link", { name: /Chicken Biryani/ }).click();
  // a small red PNG made in the browser
  const png = await owner.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 300;
    const g = c.getContext("2d");
    g.fillStyle = "#c0392b";
    g.fillRect(0, 0, 400, 300);
    return c.toDataURL("image/png").split(",")[1];
  });
  await owner.getByLabel("Dish photo").setInputFiles({ name: "biryani.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await owner.waitForSelector('img[alt="Chicken Biryani"]');
  const item = await db.menuItem.findFirst({ where: { name: "Chicken Biryani" } });
  check("photo saved", !!item.photoId);
  const res = await owner.request.get(`${BASE}/photo/${item.photoId}`);
  check("photo served as JPEG", res.status() === 200 && res.headers()["content-type"] === "image/jpeg");
  await cust.goto(BASE + "/");
  check("photo on website", (await cust.locator(`img[src="/photo/${item.photoId}"]`).count()) === 1);
  // tap the photo to see it large
  await cust.getByRole("button", { name: "Chicken Biryani", exact: true }).click();
  await cust.getByRole("dialog", { name: "Chicken Biryani" }).waitFor();
  console.log("ok  photo opens large");

  // all-dishes photo screen
  await owner.goto(BASE + "/manage/menu/photos");
  await owner.waitForSelector("text=1 of");
  await owner.getByLabel("Photo for Paneer 65").setInputFiles({ name: "paneer.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  await owner.waitForSelector("text=2 of");
  await shot(owner, "05-photos-screen");
  console.log("ok  photo added from the all-dishes photo screen");
});
