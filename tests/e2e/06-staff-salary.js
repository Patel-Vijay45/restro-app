// Admin save feedback, staff and salary: add a helper with a salary, attendance on the calendar and the daily screen,
// advance, bonus (cancelled), salary sheet and pay; managers can't see pay; helpers can't log in.
const { BASE, ctx, login, shot, check, expectEq, db, run } = require("./helpers");

function months() {
  const india = new Date(Date.now() + 5.5 * 3600 * 1000);
  const y = india.getUTCFullYear();
  const m = india.getUTCMonth(); // 0-based current month
  const prev = new Date(Date.UTC(y, m - 1, 1));
  const prevMonth = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
  const days = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 0)).getUTCDate();
  return { prevMonth, days, today: india.toISOString().slice(0, 10) };
}

run(async (browser) => {
  const { prevMonth, days, today } = months();
  const owner = await ctx(browser);
  await login(owner, "Owner", "1234");

  // 1. save feedback in admin: a green message after saving
  await owner.goto(BASE + "/manage/menu");
  await owner.getByRole("link", { name: /Dal Fry/ }).click();
  await owner.getByRole("button", { name: "Save" }).click();
  await owner.waitForSelector("text=Dal Fry saved");
  console.log("ok  'saved' message after editing a dish");
  await owner.goto(BASE + "/manage/menu/new");
  await owner.fill("input[name=name]", "Test dish");
  await owner.fill("input[name=price]", "abc"); // the server refuses it -> red message at the top
  await owner.getByRole("button", { name: "Save" }).click();
  await owner.waitForSelector("[role=alert] >> text=Enter a valid price");
  console.log("ok  error shown at the top");

  // 2. add a helper with a monthly salary, joined at the start of last month
  await owner.goto(BASE + "/manage/staff");
  await shot(owner, "01-people");
  await owner.getByRole("link", { name: "+ Add staff" }).click();
  await owner.fill("input[name=name]", "Meena");
  await owner.selectOption("select[name=role]", "HELPER");
  await owner.fill("input[name=joinedOn]", `${prevMonth}-01`);
  await owner.fill("input[name=salary]", "9000");
  await owner.getByRole("button", { name: "Add" }).click();
  await owner.waitForSelector("text=Meena added");
  const meena = await db.staff.findFirstOrThrow({ where: { name: "Meena" } });
  expectEq("helper has no PIN", meena.pinHash, "");

  // 3. attendance on the calendar for last month: 2 absent, 1 half day
  await owner.goto(`${BASE}/manage/staff/${meena.id}?month=${prevMonth}`);
  for (const [day, status] of [["05", "Absent"], ["06", "Absent"], ["07", "Half day"]]) {
    await owner.getByRole("button", { name: new RegExp(`^${prevMonth}-${day}:`) }).click();
    await owner.getByRole("button", { name: status, exact: true }).click();
    await owner.getByRole("button", { name: new RegExp(`^${prevMonth}-${day}: ${status}`) }).waitFor();
  }
  const marks = await db.attendance.count({ where: { staffId: meena.id, status: { not: "PRESENT" } } });
  expectEq("attendance marks saved", marks, 3);

  // 4. advance ₹1,000; a bonus that is then cancelled
  await owner.selectOption("select[name=kind]", "ADVANCE");
  await owner.fill("input[name=amount]", "1000");
  await owner.getByRole("button", { name: "Save" }).first().click();
  await owner.waitForSelector("text=Advance of ₹1,000 saved for Meena");
  await owner.selectOption("select[name=kind]", "BONUS");
  await owner.fill("input[name=amount]", "200");
  await owner.getByRole("button", { name: "Save" }).first().click();
  await owner.waitForSelector("text=Bonus of ₹200 saved for Meena");
  await owner.getByRole("button", { name: "Cancel" }).last().click(); // prompt answered automatically
  await owner.waitForSelector("text=/cancelled: Customer changed mind/");
  await shot(owner, "02-staff-detail", true);

  // 5. salary sheet: earned for (days − 2.5) of `days`, minus the advance; pay it
  const earned = Math.round((900000 * (days - 2.5)) / days);
  const balance = earned - 100000;
  const rupees = (p) => "₹" + Math.floor(p / 100).toLocaleString("en-IN") + (p % 100 ? "." + String(p % 100).padStart(2, "0") : "");
  await owner.goto(`${BASE}/manage/staff/salary?month=${prevMonth}`);
  const card = owner.locator(".card", { hasText: "Meena" });
  check(`Meena's balance ${rupees(balance)}`, (await card.innerText()).includes(rupees(balance)));
  await shot(owner, "03-salary-sheet", true);
  await card.getByRole("button", { name: /Pay Meena/ }).click();
  await owner.waitForSelector(`text=Salary payment of ${rupees(balance)} saved for Meena`);
  await owner.locator(".card", { hasText: "Meena" }).getByText("Paid ✓").waitFor();
  console.log("ok  salary paid, card shows Paid ✓");

  // 6. daily attendance screen: Ravi absent today
  await owner.goto(BASE + "/manage/staff/attendance");
  await owner.getByRole("radio", { name: "Ravi (Waiter): Absent" }).click();
  await owner.getByRole("radio", { name: "Ravi (Waiter): Absent", checked: true }).waitFor();
  await owner.waitForTimeout(500);
  const ravi = await db.staff.findFirstOrThrow({ where: { name: "Ravi (Waiter)" } });
  const mark = await db.attendance.findUnique({ where: { staffId_day: { staffId: ravi.id, day: today } } });
  expectEq("Ravi absent today", mark?.status, "ABSENT");
  await shot(owner, "04-attendance-today");

  // 7. a manager: can mark attendance, can't see pay
  await owner.goto(BASE + "/manage/staff/new");
  await owner.fill("input[name=name]", "Mohan");
  await owner.selectOption("select[name=role]", "MANAGER");
  await owner.fill("input[name=pin]", "5555");
  await owner.getByRole("button", { name: "Add" }).click();
  await owner.waitForSelector("text=Mohan added");
  const manager = await ctx(browser);
  await login(manager, "Mohan", "5555");
  await manager.goto(BASE + "/manage/staff");
  check("manager sees no Salary tab", (await manager.getByRole("link", { name: /Salary/ }).count()) === 0);
  check("manager sees no salaries", (await manager.locator("text=₹").count()) === 0);
  await manager.goto(`${BASE}/manage/staff/${meena.id}`);
  check("manager sees no pay on a staff page", (await manager.locator("text=Pay for").count()) === 0);
  await manager.goto(BASE + "/manage/staff/salary");
  check("manager is sent away from the salary sheet", !manager.url().includes("/salary"));

  // 8. helpers are not on the login screen
  await manager.goto(BASE + "/login");
  check("helper not on login screen", (await manager.getByRole("button", { name: /Meena|Shankar/ }).count()) === 0);
});
