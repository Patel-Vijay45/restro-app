// Waiter → kitchen → bill and split payment → receipt → remove item → sold out → stall counter → sales report.
const { BASE, ctx, login, shot, row, run } = require("./helpers");

run(async (browser) => {
  const waiter = await ctx(browser);
  await waiter.goto(BASE + '/login'); await shot(waiter, '01-login');
  await login(waiter, 'Ravi', '1111');
  await shot(waiter, '02-tables');
  await waiter.getByRole('link', { name: /^T3/ }).click();
  await waiter.waitForURL(/orders\/new/);
  await row(waiter, 'Chicken Biryani').getByRole('button', { name: 'ADD' }).click();
  await row(waiter, 'Chicken Biryani').getByRole('button', { name: 'More' }).click();
  await row(waiter, 'Butter Naan').getByRole('button', { name: 'ADD' }).click();
  await row(waiter, 'Paneer Butter Masala').getByRole('button', { name: 'ADD' }).click();
  await shot(waiter, '03-menu');
  await waiter.getByRole('button', { name: /Review/ }).click();
  await waiter.getByPlaceholder('Note (e.g. less spicy)').first().fill('less spicy');
  await shot(waiter, '04-review');
  await waiter.getByRole('button', { name: 'Send to kitchen' }).click();
  await waiter.waitForURL(/orders\/c/);
  await shot(waiter, '05-order');
  const orderUrl = waiter.url();

  const kitchen = await ctx(browser);
  await login(kitchen, 'Kitchen', '2222');
  await kitchen.waitForSelector('text=Table T3');
  await shot(kitchen, '06-kitchen');
  await kitchen.getByRole('button', { name: 'Start cooking' }).click();
  await kitchen.getByRole('button', { name: /Food ready/ }).click();
  await kitchen.waitForSelector('text=No orders to cook');

  await waiter.goto(BASE + '/orders');
  await waiter.waitForSelector('text=READY');
  await shot(waiter, '07-tables-ready');
  await waiter.goto(orderUrl);
  await waiter.getByRole('button', { name: /Mark served/ }).click();
  await waiter.waitForSelector('text=Served');
  await waiter.getByRole('link', { name: /Bill/ }).click();
  await waiter.getByRole('button', { name: 'Generate bill' }).click();
  await waiter.waitForSelector('text=Bill #1');
  await shot(waiter, '08-waiter-billed');

  // Owner: sets UPI, discounts, takes split payment
  const owner = await ctx(browser);
  await login(owner, 'Owner', '1234');
  await owner.goto(BASE + '/manage/outlet');
  await owner.fill('input[name=upiId]', 'dfcrestaurant@okaxis');
  await owner.fill('input[name=phone]', '98450 00000');
  await owner.getByRole('button', { name: 'Save' }).click();
  await owner.waitForSelector('text=Outlet settings saved');
  await owner.goto(orderUrl + '/bill');
  await owner.getByRole('button', { name: 'Change discount' }).click();
  await owner.getByRole('button', { name: '%' }).click();
  await owner.getByPlaceholder('e.g. 10').fill('10');
  await owner.getByRole('button', { name: 'Update bill' }).click();
  await owner.waitForSelector('text=Discount (10%)');
  await owner.getByRole('button', { name: /UPI/ }).click();
  await owner.getByLabel('Amount (₹)').fill('200');
  await shot(owner, '09-upi');
  await owner.getByRole('button', { name: /Received UPI/ }).click();
  await owner.waitForSelector('text=Balance due');
  await owner.getByRole('button', { name: /Cash/ }).click();
  await owner.getByLabel('Cash received (₹)').fill('500');
  await owner.getByRole('button', { name: /Received cash/ }).click();
  await owner.waitForSelector('text=Give back');
  await shot(owner, '10-paid');
  await owner.goto(BASE + '/print/' + orderUrl.split('/').pop());
  await owner.waitForTimeout(800);
  await shot(owner, '11-print');

  // Manager cancels an item on a new order
  await owner.goto(BASE + '/orders');
  await owner.getByRole('link', { name: /^T5/ }).click();
  await owner.locator('div.flex.items-center.gap-3.p-3', { hasText: 'Chicken 65' }).getByRole('button', { name: 'ADD' }).click();
  await owner.locator('div.flex.items-center.gap-3.p-3', { hasText: 'Sweet Lassi' }).getByRole('button', { name: 'ADD' }).click();
  await owner.getByRole('button', { name: /Review/ }).click();
  await owner.getByRole('button', { name: 'Send to kitchen' }).click();
  await owner.waitForURL(/orders\/c/);
  await owner.getByRole('button', { name: 'Remove Sweet Lassi' }).click();
  await owner.waitForSelector('text=Removed: Customer changed mind');

  // Sold out switch
  await owner.goto(BASE + '/manage/menu');
  await owner.locator('div.flex.items-center.gap-3.p-3', { hasText: 'Fish Fry' }).getByRole('switch').click();
  await owner.waitForTimeout(500);
  await shot(owner, '12-manage-menu');

  // Stall
  await owner.goto(BASE + '/orders');
  await owner.selectOption('select[aria-label=Outlet]', { label: 'DFC Mall Stall' });
  await owner.waitForSelector('text=New order');
  await owner.locator('div.flex.items-center.gap-3.p-3', { hasText: 'Chicken Shawarma' }).getByRole('button', { name: 'ADD' }).click();
  await owner.locator('div.flex.items-center.gap-3.p-3', { hasText: 'Cold Coffee' }).getByRole('button', { name: 'ADD' }).click();
  await shot(owner, '13-stall');
  await owner.getByRole('button', { name: /Review/ }).click();
  await owner.getByRole('button', { name: /Charge/ }).click();
  await owner.waitForURL(/bill/);
  await owner.getByRole('button', { name: /Received cash/ }).click();
  await owner.waitForSelector('text=Next customer');
  await owner.goto(BASE + '/orders?view=tokens');
  await owner.waitForSelector('text=#1');
  await shot(owner, '14-tokens');
  await owner.getByRole('button', { name: /Food ready/ }).click();
  await owner.getByRole('button', { name: /Collected/ }).click();
  await owner.waitForSelector('text=No tokens waiting');

  await owner.goto(BASE + '/reports?all=1');
  await shot(owner, '15-reports');
  await shot(owner, '15b-reports-full', true);
});
