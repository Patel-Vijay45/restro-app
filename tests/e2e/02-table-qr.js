// Customer scans the T7 QR → order request → waiter confirms → kitchen → reject (reason shown) → add more → bill → QR sheet.
const { BASE, ctx, login, shot, row, check, tableToken, run } = require("./helpers");

run(async (browser) => {
  // Customer scans T7
  const cust = await ctx(browser);
  await cust.goto(BASE + '/t/' + (await tableToken('T7')));
  await cust.waitForSelector('text=Table T7');
  await shot(cust, '01-customer-menu');
  await row(cust, 'Chicken Biryani').getByRole('button', { name: 'ADD' }).click();
  await row(cust, 'Sweet Lassi').getByRole('button', { name: 'ADD' }).click();
  await row(cust, 'Sweet Lassi').getByRole('button', { name: 'More' }).click();
  await cust.getByRole('button', { name: /Review/ }).click();
  await shot(cust, '02-customer-review');
  await cust.getByRole('button', { name: /Send order to waiter/ }).click();
  await cust.waitForSelector('text=Waiting for confirmation');
  await cust.getByRole('button', { name: /Call waiter/ }).click();
  await cust.waitForSelector('text=Waiter called');
  await shot(cust, '03-customer-waiting');

  // Waiter
  const waiter = await ctx(browser);
  await login(waiter, 'Ravi', '1111');
  await waiter.waitForSelector('text=Customer requests (2)');
  await shot(waiter, '04-waiter-requests');
  await waiter.getByRole('button', { name: 'Send to kitchen ✓' }).click();
  await waiter.waitForSelector('text=Customer requests (1)');
  await waiter.getByRole('button', { name: 'Done ✓' }).click();
  await waiter.waitForSelector('text=Customer requests', { state: 'detached' });

  // Kitchen starts cooking
  const kitchen = await ctx(browser);
  await login(kitchen, 'Kitchen', '2222');
  await kitchen.waitForSelector('text=Table T7');
  await kitchen.locator('.card', { hasText: 'Table T7' }).getByRole('button', { name: 'Start cooking' }).click();
  await kitchen.waitForTimeout(500);

  await cust.reload();
  await cust.locator('span.rounded-full', { hasText: 'Cooking' }).first().waitFor();
  check('progress shows Cooking', (await cust.locator('[aria-current=step]').innerText()).includes('Cooking'));
  await shot(cust, '05-customer-cooking');

  // Customer orders again, waiter rejects
  await cust.getByRole('button', { name: 'Menu' }).click();
  await row(cust, 'Butter Naan').getByRole('button', { name: 'ADD' }).click();
  await cust.getByRole('button', { name: /Review/ }).click();
  await cust.getByRole('button', { name: /Send order to waiter/ }).click();
  await cust.waitForSelector('text=Waiting for confirmation');
  await waiter.waitForSelector('text=T7 wants to order', { timeout: 10000 });
  await waiter.getByRole('button', { name: 'Reject' }).click();
  await waiter.waitForSelector('text=Customer requests', { state: 'detached' });
  await cust.reload();
  await cust.waitForSelector('text=Not accepted');
  check('reject reason shown to customer', await cust.locator('text=Customer changed mind').count() === 1);

  // customer adds more items to the running order; waiter accepts -> second round on the same order
  await cust.getByRole('button', { name: '+ Add more items' }).click();
  await row(cust, 'Chapati').getByRole('button', { name: 'ADD' }).click();
  await cust.getByRole('button', { name: /Review/ }).click();
  await cust.getByRole('button', { name: /Send order to waiter/ }).click();
  await waiter.waitForSelector('text=T7 wants to order', { timeout: 10000 });
  await waiter.getByRole('button', { name: 'Send to kitchen ✓' }).click();
  await waiter.waitForSelector('text=Customer requests', { state: 'detached' });
  await cust.reload();
  await cust.waitForSelector('text=Added items');
  check('second round accepted', await cust.locator('span.rounded-full', { hasText: 'Accepted' }).count() >= 1);

  // Customer asks for bill; waiter generates it
  await cust.reload();
  await cust.getByRole('button', { name: /Ask for bill/ }).click();
  await cust.waitForSelector('text=Bill asked');
  await waiter.waitForSelector('text=T7 asked for the bill', { timeout: 10000 });
  await waiter.getByRole('link', { name: 'Open bill' }).click();
  await waiter.getByRole('button', { name: 'Generate bill' }).click();
  await waiter.waitForSelector('text=/Bill #\\d+/');
  await cust.reload();
  await cust.waitForSelector('text=Bill total');
  check('progress shows Bill', (await cust.locator('[aria-current=step]').innerText()).includes('Bill'));
  await shot(cust, '06-customer-bill');

  // Owner: tables admin + QR sheet
  const owner = await ctx(browser);
  await login(owner, 'Owner', '1234');
  await owner.goto(BASE + '/manage/tables');
  await shot(owner, '07-manage-tables');
  const a4 = await ctx(browser, { viewport: { width: 820, height: 1160 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
  await login(a4, 'Owner', '1234');
  await a4.goto(BASE + '/print/qr');
  await a4.waitForTimeout(800);
  await shot(a4, '08-qr-sheet');

  // Bad token
  await cust.goto(BASE + '/t/not-a-real-token');
  await cust.waitForSelector('text=This QR code is not active');
});
