import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/baseUrl";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [{ url: `${await baseUrl()}/`, changeFrequency: "daily", priority: 1 }];
}
