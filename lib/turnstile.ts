type TurnstileResponse = {
  success?: boolean;
  "error-codes"?: string[];
  action?: string;
  hostname?: string;
};

const TURNSTILE_TIMEOUT_MS = 5_000;

function configuredHostname(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (
      process.env.NODE_ENV !== "production" &&
      token === "development-bypass"
    ) {
      return { success: true };
    }
    return {
      success: false,
      error: "Spam protection is not configured for this deployment.",
    };
  }

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);
  body.set("idempotency_key", crypto.randomUUID());

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TURNSTILE_TIMEOUT_MS,
  );
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        cache: "no-store",
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      return { success: false, error: "Spam protection is unavailable." };
    }
    const result = (await response.json()) as TurnstileResponse;
    if (!result.success || result.action !== "waitlist_signup") {
      return {
        success: false,
        error: "The spam check expired or was invalid. Please try again.",
      };
    }
    const expectedHostname = configuredHostname();
    if (
      expectedHostname &&
      result.hostname?.toLowerCase() !== expectedHostname
    ) {
      return {
        success: false,
        error: "The spam check was issued for a different site.",
      };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Spam protection is unavailable." };
  } finally {
    clearTimeout(timeout);
  }
}
