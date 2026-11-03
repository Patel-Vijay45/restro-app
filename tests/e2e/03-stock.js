// Stock moves with orders, removal before/after cooking, purchase (average cost), wastage, count, recipe, stall stock, food cost report.
const { BASE, ctx, login, shot, row, expectEq, stock, db, run } = require("./helpers");

run(async (browser) => {
  const owner = await ctx(browser);
  await login(owner, 'Owner', '1234');
  await owner.goto(BASE + '/stock');
  await owner.waitForSelector('text=Running low (1)');
  await shot(owner, '01-stock');

  expectEq('chicken start', await stock('Chicken'), 12000);
  // Waiter orders 2 chicken biryani + 1 butter naan
  const waiter = await ctx(browser);
  await login(waiter, 'Ravi', '1111');
  await waiter.getByRole('link', { name: /^T2/ }).click();
  await row(waiter, 'Chicken Biryani').getByRole('button', { name: 'ADD' }).click();
  await row(waiter, 'Chicken Biryani').getByRole('button', { name: 'More' }).click();
  await row(waiter, 'Butter Naan').getByRole('button', { name: 'ADD' }).click();
  await waiter.getByRole('button', { name: /Review/ }).click();
  await waiter.getByRole('button', { name: 'Send to kitchen' }).click();
  await waiter.waitForURL(/orders\/c/);
  const orderUrl = waiter.url();
  expectEq('chicken after 2 biryani', await stock('Chicken'), 11600);
  expectEq('maida after naan', await stock('Maida'), 4920);

  // remove naan before cooking -> maida comes back
  await owner.goto(orderUrl);
  await owner.getByRole('button', { name: 'Remove Butter Naan' }).click();
  await owner.waitForSelector('text=Removed: Customer changed mind');
  expectEq('maida returned', await stock('Maida'), 5000);

  // kitchen starts cooking, then biryani removed -> chicken stays used
  const kitchen = await ctx(browser);
  await login(kitchen, 'Kitchen', '2222');
  await kitchen.getByRole('button', { name: 'Start cooking' }).click();
  await kitchen.waitForTimeout(600);
  await owner.goto(orderUrl);
  await owner.getByRole('button', { name: 'Remove Chicken Biryani' }).click();
  await owner.waitForSelector('text=Removed: Customer changed mind');
  expectEq('chicken not returned after cooking', await stock('Chicken'), 11600);

  // purchase ghee
  await owner.goto(BASE + '/stock/purchase');
  await owner.selectOption('select[name=ingredientId]', { label: 'Ghee (L)' });
  await owner.fill('input[name=qty]', '2');
  await owner.fill('input[name=amount]', '1300');
  await owner.fill('input[name=supplier]', 'Nandini Dairy');
  await shot(owner, '02-purchase');
  await owner.getByRole('button', { name: 'Save purchase' }).click();
  await owner.waitForSelector('text=Purchase saved: 2 L Ghee');
  // ghee: 0.4 L opening - 2 biryani x 10 ml = 0.38 L; avg cost (0.38*600 + 1300) / 2.38
  expectEq('ghee stock', await stock('Ghee'), 2380);
  expectEq('ghee avg cost', (await db.ingredient.findFirstOrThrow({ where: { name: 'Ghee', outlet: { type: 'RESTAURANT' } } })).costPerUnit, Math.round((380 * 60000 / 1000 + 130000) / 2.38));

  // wastage
  await owner.goto(BASE + '/stock/wastage');
  await owner.selectOption('select[name=ingredientId]', { label: 'Tomato (kg)' });
  await owner.fill('input[name=qty]', '0.5');
  await owner.fill('input[name=reason]', 'Spoiled');
  await owner.getByRole('button', { name: 'Save wastage' }).click();
  await owner.waitForSelector('text=Wastage recorded: 500 g Tomato');
  expectEq('tomato after wastage', await stock('Tomato'), 7500);

  // count onion: system 15 - 2x60g = 14.88, counted 14
  await owner.goto(BASE + '/stock/count');
  await owner.getByLabel('Onion counted').fill('14');
  await shot(owner, '03-count');
  await owner.getByRole('button', { name: 'Save count' }).click();
  await owner.waitForSelector('text=1 different from the system');
  expectEq('onion after count', await stock('Onion'), 14000);

  // ingredient history
  await owner.goto(BASE + '/stock');
  await owner.getByRole('link', { name: /Onion/ }).click();
  await owner.waitForSelector('text=Count correction');
  await shot(owner, '04-ingredient');

  // recipe editor
  await owner.goto(BASE + '/manage/menu');
  await owner.getByRole('link', { name: /Butter Naan/ }).click();
  await owner.getByRole('link', { name: /Recipe and cost/ }).click();
  await owner.getByRole('button', { name: '+ Add ingredient' }).click();
  await owner.locator('select[name=ingredientId]').last().selectOption({ label: 'Ghee' });
  await owner.locator('input[name=qty]').last().fill('5');
  await shot(owner, '05-recipe');
  await owner.getByRole('button', { name: 'Save recipe' }).click();
  await owner.waitForSelector('text=Recipe saved');
  expectEq('naan recipe lines', await db.recipeLine.count({ where: { menuItem: { name: 'Butter Naan' } } }), 4);

  // new ingredient
  await owner.goto(BASE + '/stock/new');
  await owner.fill('input[name=name]', 'Coriander');
  await owner.fill('input[name=lowStock]', '0.2');
  await owner.fill('input[name=opening]', '1');
  await owner.fill('input[name=cost]', '80');
  await owner.getByRole('button', { name: 'Save' }).click();
  await owner.waitForSelector('text=Added Coriander');
  expectEq('coriander stock', await stock('Coriander'), 1000);

  // stall: counter sale deducts stall stock only
  await owner.selectOption('select[aria-label=Outlet]', { label: 'DFC Mall Stall' });
  await owner.waitForSelector('text=New order');
  await row(owner, 'Chicken Shawarma').getByRole('button', { name: 'ADD' }).click();
  await owner.getByRole('button', { name: /Review/ }).click();
  await owner.getByRole('button', { name: /Charge/ }).click();
  await owner.waitForURL(/bill/);
  expectEq('stall chicken', await stock('Chicken', 'COUNTER'), 3880);
  expectEq('restaurant chicken unchanged', await stock('Chicken'), 11600);
  await owner.getByRole('button', { name: /Received cash/ }).click();
  await owner.waitForSelector('text=Next customer');

  await owner.goto(BASE + '/reports?all=1');
  // shawarma: 120 g chicken (₹28.80) + 1 rumali (₹8) + 30 g mayo (₹6.60) = ₹43.40 of ₹120
  await owner.waitForSelector('text=Food cost of paid bills (36% of sales)');
  await owner.waitForSelector('text=₹43.40');
  console.log('ok  food cost in report = ₹43.40 (36%)');
  await shot(owner, '06-report', true);
});
