// Set a new PIN for a staff login from the command line, for when nobody can log in
// (e.g. the owner forgot the PIN). Also unlocks the login and turns it back on.
//
//   npm run set-pin -- "Owner" 4321
//
// Uses the database in DATABASE_URL (.env). On the server: sudo docker compose exec app tsx scripts/set-pin.ts "Owner" 4321
import { PrismaClient } from "@prisma/client";
import { hashPin, isValidPin } from "../src/lib/pin";

const db = new PrismaClient();

async function main() {
  const [name, pin] = process.argv.slice(2);
  if (!name || !pin) {
    console.log('Usage: npm run set-pin -- "<staff name>" <new PIN>');
    process.exit(1);
  }
  if (!isValidPin(pin)) {
    console.log("The PIN must be 4 to 6 digits.");
    process.exit(1);
  }
  const matches = await db.staff.findMany({ where: { name: { equals: name, mode: "insensitive" } } });
  if (matches.length !== 1) {
    const all = await db.staff.findMany({ select: { name: true, role: true, active: true }, orderBy: { name: "asc" } });
    console.log(matches.length === 0 ? `No staff called "${name}".` : `More than one staff called "${name}".`);
    console.log("Staff logins:\n" + all.map((s) => `  ${s.name} (${s.role.toLowerCase()}${s.active ? "" : ", turned off"})`).join("\n"));
    process.exit(1);
  }
  const staff = matches[0];
  await db.staff.update({ where: { id: staff.id }, data: { pinHash: hashPin(pin), failedPins: 0, lockedUntil: null, active: true } });
  console.log(`New PIN set for ${staff.name} (${staff.role.toLowerCase()}). The login is unlocked and turned on.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
