const REFERRAL_COOKIE_SECONDS = 30 * 24 * 60 * 60;

export function referralCookieName(projectId: string): string {
  return `launchbeam_ref_${projectId}`;
}

export function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function referralCookieHeader(
  projectId: string,
  token: string,
): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${referralCookieName(projectId)}=${encodeURIComponent(token)}; Max-Age=${REFERRAL_COOKIE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function clearReferralCookieHeader(projectId: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${referralCookieName(projectId)}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function clientIp(request: Request): string | undefined {
  const direct =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0];
  const normalized = direct?.trim();
  return normalized && normalized.length <= 64 ? normalized : undefined;
}

export function requestCountry(request: Request): string | null {
  const value =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function requestDeviceType(request: Request): string | null {
  const mobileHint = request.headers.get("sec-ch-ua-mobile");
  if (mobileHint === "?1") return "mobile";

  const userAgent = request.headers.get("user-agent")?.slice(0, 500);
  if (!userAgent) return null;
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/mobile|android|iphone|ipod/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function retryAfterHeaders(resetAt: number): HeadersInit {
  const seconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1_000));
  return { "retry-after": String(seconds) };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function confirmationPage(
  title: string,
  message: string,
  status: number,
  extraHeaders?: HeadersInit,
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-robots-tag", "noindex, nofollow");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} - LaunchBeam</title></head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="/">Return to LaunchBeam</a></p></main></body>
</html>`;
  return new Response(html, { status, headers });
}
