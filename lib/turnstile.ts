type TurnstileResponse = {
  success?: boolean;
  "error-codes"?: string[];
  action?: string;
};

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

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        cache: "no-store",
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
    return { success: true };
  } catch {
    return { success: false, error: "Spam protection is unavailable." };
  }
}
