import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export async function getDb() {
  if (process.env.VERCEL) {
    throw new Error(
      "Cloudflare D1 is not available in the Vercel runtime. Configure a Vercel-compatible database before enabling beta signup storage there.",
    );
  }

  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database.",
    );
  }

  return drizzle(env.DB, { schema });
}
