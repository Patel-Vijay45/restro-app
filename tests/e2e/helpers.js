// Shared helpers for the browser tests. See tests/e2e/README.md.
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");

const BASE = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SUITE = path.basename(process.argv[1], ".js");
const SHOT_DIR = path.join(__dirname, "screenshots");
fs.mkdirSync(SHOT_DIR, { recursive: true });

const db = new PrismaClient();
const errors = [];

// Errors from outside the app (Google map, UPI app links) are not our bugs.
const IGNORED_CONSOLE = /google|maps|ERR_|upi:\/\//;

/** A new phone-sized browser tab. Prompts (e.g. "why remove?") are answered automatically. */
async function ctx(browser, opts = {}) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...opts });
  const page = await c.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORED_CONSOLE.test(m.text())) errors.push("console: " + m.text());
  });
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Customer changed mind" : undefined));
  return page;
}

async function login(page, name, pin) {
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: new RegExp("^" + name.replace(/[()]/g, "\\$&")) }).click();
  for (const d of pin) await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

const shot = (page, name, fullPage = false) => page.screenshot({ path: path.join(SHOT_DIR, `${SUITE}-${name}.png`), fullPage });

/** A dish row in the staff menu picker or admin menu list. */
const row = (page, dish) => page.locator("div.flex.items-center.gap-3.p-3", { hasText: dish });

function check(label, ok) {
  if (ok) console.log("ok  " + label);
  else errors.push("FAILED: " + label);
}

function expectEq(label, got, want) {
  check(`${label} = ${got}${got === want ? "" : ` (expected ${want})`}`, got === want);
}

/** Stock of an ingredient in milli-units (1 kg = 1000). outlet: "RESTAURANT" or "COUNTER". */
async function stock(name, outlet = "RESTAURANT") {
  const i = await db.ingredient.findFirstOrThrow({ where: { name, outlet: { type: outlet } } });
  return i.stock;
}

async function tableToken(name) {
  const t = await db.diningTable.findFirstOrThrow({ where: { name, outlet: { type: "RESTAURANT" } } });
  return t.qrToken;
}

/** Run a test: prints the result and sets the exit code. */
async function run(fn) {
  const browser = await chromium.launch();
  try {
    await fn(browser);
  } catch (e) {
    errors.push("CRASHED: " + e.message.split("\n")[0]);
  }
  await browser.close();
  await db.$disconnect();
  console.log(errors.length ? `\n${SUITE}: ${errors.length} problem(s)\n` + errors.join("\n") : `\n${SUITE}: all good`);
  process.exit(errors.length ? 1 : 0);
}

module.exports = { BASE, db, errors, ctx, login, shot, row, check, expectEq, stock, tableToken, run };
