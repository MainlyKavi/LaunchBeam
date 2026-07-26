import { headers } from "next/headers";

function normalizeHttpOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("The application origin must use http or https.");
  }
  return url.origin;
}

export async function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return normalizeHttpOrigin(configured);
  }

  if (process.env.NODE_ENV === "production") {
    const vercelHost =
      process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
      process.env.VERCEL_URL?.trim();
    if (vercelHost) {
      return normalizeHttpOrigin(`https://${vercelHost}`);
    }
    return "https://launchbeam.vercel.app";
  }

  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https");
  return `${protocol}://${host}`;
}
