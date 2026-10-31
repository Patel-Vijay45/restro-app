import type { Prisma } from "@prisma/client";
import { indiaDay } from "./time";

type Tx = Prisma.TransactionClient;

/** Atomically take the next number for an outlet. Bill numbers never reset; KOT and token numbers reset daily. */
export async function nextNumber(tx: Tx, outletId: string, key: "bill" | "kot" | "token"): Promise<number> {
  const day = key === "bill" ? "all" : indiaDay();
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("outletId", "key", "day", "value") VALUES (${outletId}, ${key}, ${day}, 1)
    ON CONFLICT ("outletId", "key", "day") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`;
  return rows[0].value;
}
