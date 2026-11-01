// Runs every browser test against its OWN test database, freshly filled with sample data before each suite.
// Your normal database (DATABASE_URL in .env) is never touched. See tests/e2e/README.md.
//
//   npm run build                 once, after code changes
//   npm run test:e2e              all suites
//   npm run test:e2e -- 03        only suites whose file name starts with "03"
const { execSync, spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const PORT = process.env.E2E_PORT || "3100";

// Load .env (same file the app uses) without overriding variables already set.
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Test database: E2E_DATABASE_URL, or the .env database name + "_e2e" (restro -> restro_e2e).
function testDbUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const u = new URL(process.env.DATABASE_URL || "postgresql://restro:restro@localhost:5432/restro");
  u.pathname = u.pathname.replace(/\/?([^/]*)$/, (_, name) => `/${name}_e2e`);
  u.search = "";
  return u.toString();
}
const DB = testDbUrl();
const dbName = new URL(DB).pathname.slice(1);
const host = new URL(DB).hostname;
// The suites erase this database. Only ever a local database whose name ends in _e2e.
if (!["localhost", "127.0.0.1"].includes(host) || !dbName.endsWith("_e2e")) {
  console.error(`Refusing to run: the test database must be local and its name must end in _e2e (got ${host}/${dbName}).`);
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: DB, DIRECT_URL: DB, SESSION_SECRET: process.env.SESSION_SECRET || "e2e-test-secret-0123456789", E2E_BASE_URL: `http://localhost:${PORT}` };
const sh = (cmd) => execSync(cmd, { cwd: ROOT, env, stdio: "pipe" });

function freshDatabase() {
  try {
    // Empty the test database (first run: the next step creates it), then rebuild tables and sample data.
    try {
      execSync(`npx prisma db execute --stdin --url "${DB}"`, {
        cwd: ROOT,
        env,
        stdio: "pipe",
        input: "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;",
      });
    } catch {
      /* database does not exist yet */
    }
    sh("npx prisma migrate deploy");
    sh("npx tsx prisma/seed.ts");
  } catch (e) {
    console.error(`Could not prepare the test database ${dbName}. Is Postgres running, and may the user create databases?\n` + String(e.stderr || e.message));
    process.exit(1);
  }
}

async function startServer() {
  if (!fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    console.error("No build found. Run `npm run build` first.");
    process.exit(1);
  }
  const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-p", PORT], { cwd: ROOT, env, stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/login`);
      if (r.ok) return server;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  server.kill();
  console.error(`The app did not start on port ${PORT}.`);
  process.exit(1);
}

(async () => {
  const only = process.argv[2];
  const suites = fs
    .readdirSync(__dirname)
    .filter((f) => /^\d\d-.*\.js$/.test(f))
    .filter((f) => !only || f.startsWith(only))
    .sort();

  if (!only) fs.rmSync(path.join(__dirname, "screenshots"), { recursive: true, force: true });
  freshDatabase();
  const server = await startServer();
  const results = [];
  for (const [n, suite] of suites.entries()) {
    if (n > 0) freshDatabase();
    console.log(`\n=== ${suite}`);
    const r = spawnSync(process.execPath, [path.join(__dirname, suite)], { stdio: "inherit", env });
    results.push({ suite, ok: r.status === 0 });
  }
  server.kill();

  console.log("\n=== Summary");
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.suite}`);
  console.log(`Screenshots: tests/e2e/screenshots/`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})();
