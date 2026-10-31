import Link from "next/link";

export default function BackHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <Link href={href} className="text-2xl" aria-label="Back">
        ←
      </Link>
      <h1 className="text-xl font-bold">{title}</h1>
    </div>
  );
}
