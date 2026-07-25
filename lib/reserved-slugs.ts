export const RESERVED_SLUGS = new Set([
  "api",
  "dashboard",
  "login",
  "signup",
  "logout",
  "auth",
  "preview",
  "pricing",
  "about",
  "privacy",
  "terms",
  "support",
  "admin",
  "settings",
  "features",
  "analytics",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",
  "_next",
]);

export function isReservedSlug(value: string): boolean {
  return RESERVED_SLUGS.has(value.toLowerCase());
}
