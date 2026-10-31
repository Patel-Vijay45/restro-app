import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/baseUrl";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await baseUrl();
  return {
    // Only the public website is for search engines; staff screens and table pages are not.
    rules: { userAgent: "*", allow: "/", disallow: ["/login", "/staff", "/orders", "/kitchen", "/stock", "/reports", "/manage", "/print", "/t/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
