import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "DFC Staff login", manifest: "/manifest.webmanifest", robots: { index: false } };

export default async function LoginPage() {
  const staff = await db.staff.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true, outlet: { select: { name: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-8 pt-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-ink font-serif text-xl font-bold text-gold ring-2 ring-gold">
          DFC
        </div>
        <h1 className="text-xl font-bold">DFC Family Restaurant</h1>
        <p className="text-sm text-muted">Staff login</p>
      </div>
      <LoginForm
        staff={staff.map((s) => ({ id: s.id, name: s.name, role: s.role, outlet: s.outlet?.name ?? "All outlets" }))}
      />
      <Link href="/" className="mt-8 text-center text-sm text-muted underline">
        ← Restaurant website
      </Link>
    </main>
  );
}
