// Public website: buttons, live menu, takeaway checkout → tracking page, "Your order" banner, stall tab, veg filter, sold out, /staff entry, desktop layout.
const { BASE, ctx, login, shot, check, run } = require("./helpers");

run(async (browser) => {
  // block the Google map so the test does not depend on the internet
  const site = await ctx(browser);
  await site.route(/google\.com/, r => r.abort());
  await site.goto(BASE + '/');
  await site.waitForSelector('h1:has-text("DFC Family Restaurant")');
  await shot(site, '01-hero');
  check('call button', await site.locator('a[href="tel:+918160123021"]').count() > 0);
  check('directions link', await site.locator('a[href="https://maps.google.com/?cid=8078862460556497123"]').count() > 0);

  await site.locator('#menu').scrollIntoViewIfNeeded();
  await site.getByRole('button', { name: 'Add Chicken Biryani' }).click();
  await site.getByRole('button', { name: 'More Chicken Biryani' }).click();
  await site.getByRole('button', { name: 'Add Butter Naan' }).click();
  await shot(site, '02-menu');
  await site.getByRole('button', { name: /Order takeaway/ }).click();
  await site.getByLabel('Your name').fill('Vijay');
  await site.getByLabel('Mobile number').fill('98765 43210');
  await shot(site, '03-checkout');
  check('checkout total', await site.locator('text=Place order · ₹445').count() === 1);
  await site.getByRole('button', { name: /Place order/ }).click();
  await site.waitForURL(/\/track\//);
  await site.waitForSelector('text=Waiting for the restaurant');
  check('no WhatsApp ordering left', await site.locator('text=/Order on WhatsApp/').count() === 0);
  await site.goto(BASE + '/');
  await site.waitForSelector('text=/Your order from .* Track it/');
  console.log('ok  "Your order" banner on the website');

  // stall tab + veg filter
  await site.getByRole('button', { name: 'Mall Stall' }).click();
  await site.waitForSelector('text=Chicken Shawarma');
  await site.getByRole('button', { name: 'Veg', exact: true }).click();
  check('veg filter hides non-veg', await site.locator('text=Chicken Shawarma').count() === 0);

  await site.locator('#visit').scrollIntoViewIfNeeded();
  await shot(site, '04-visit');

  // sold out shows on website
  const owner = await ctx(browser);
  await owner.goto(BASE + '/login');
  await owner.getByRole('button', { name: /^Owner/ }).click();
  for (const d of '1234') await owner.getByRole('button', { name: d, exact: true }).click();
  await owner.getByRole('button', { name: 'Login' }).click();
  await owner.waitForURL(/orders/);
  await owner.goto(BASE + '/manage/menu');
  await owner.locator('div.flex.items-center.gap-3.p-3', { hasText: 'Mutton Biryani' }).getByRole('switch').click();
  await owner.waitForTimeout(600);
  await site.goto(BASE + '/');
  const mutton = site.locator('div.flex.items-center.gap-3.p-3', { hasText: 'Mutton Biryani' });
  check('sold out on website', /sold out/i.test(await mutton.innerText()));
  await owner.goto(BASE + '/staff');
  check('staff entry -> orders', owner.url().endsWith('/orders'));

  const desk = await ctx(browser, { viewport: { width: 1280, height: 860 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
  await desk.route(/google\.com/, r => r.abort());
  await desk.goto(BASE + '/');
  await shot(desk, '05-desktop');
  await desk.locator('#menu').scrollIntoViewIfNeeded();
  await shot(desk, '06-desktop-menu');
});
