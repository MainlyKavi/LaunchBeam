const SAFE_PATH_BASE = "https://launchbeam.local";

export function getSafeNextPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value || /[\u0000-\u001f\\]/.test(value)) return fallback;

  try {
    const url = new URL(value, SAFE_PATH_BASE);
    if (url.origin !== SAFE_PATH_BASE || !url.pathname.startsWith("/")) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
