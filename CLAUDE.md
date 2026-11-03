# Project rules for AI assistants

DFC Family Restaurant system: website, staff app (orders, kitchen, billing, stall counter, stock, reports) and table QR pages.
One Next.js 15 + Prisma/Postgres app. The people using it are restaurant staff on phones: keep screens and messages simple.

Read before changing anything:
- `docs/FLOWS-AND-RULES.md`: business rules, roles, order/stock flows. The code must match it.
- `docs/DEVELOPER.md`: folder map, coding rules, how to add features and fix bugs.
- `docs/USER-GUIDE.md`: what staff see and do.

## Commands
- `npm run dev`: local app on :3000 (needs Postgres and `.env`, see README)
- `npm run lint`: type check · `npm test`: unit tests · `npm run build`: production build
- `npm run test:e2e`: browser tests; uses its own local `<db>_e2e` database and port 3100, never the `.env` database
- `npx prisma migrate dev --name <name>`: after editing `prisma/schema.prisma`
- `npm run set-pin -- "<staff name>" <PIN>`: reset a PIN when nobody can log in

## Must follow
- All writes in `src/app/actions/*`, each starting with `requireStaff(<role list from src/lib/auth.ts>)`; scope every query to `me.outletId`.
- Never trust prices or totals from the browser. Money = integer paise; stock = integer milli-units; show times in India time.
- Don't delete history: deactivate (`active: false`) menu items, staff, tables, ingredients; never delete orders or stock moves.
- New or changed behaviour → update `docs/FLOWS-AND-RULES.md`, `docs/USER-GUIDE.md` (if staff see it) and `CHANGELOG.md` in the same commit.
- Bug fix → add a failing test first (unit or `tests/e2e/`), then fix.
- Before committing: `npm run lint && npm test && npm run build && npm run test:e2e` all pass.
- Never run `prisma migrate reset` or wipe a database that isn't the `_e2e` test database. Never edit a committed migration.
- Phone first: check new screens at 390 px wide.
- Every staff form: `<SubmitButton>` and a redirect with `?ok=` / `?error=` message (shown by `<Toast>`). Salaries and staff payments are owner-only.
- Customer-facing text (website, `/t/`, `/track/`) goes through `t(lang, key)` in `src/lib/i18n.ts`, in English, Kannada and Hindi. Staff screens stay English.
