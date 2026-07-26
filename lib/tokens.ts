import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type SignedTokenPurpose =
  | "confirm"
  | "unsubscribe"
  | "referral";

export type SignedTokenPayload = {
  purpose: SignedTokenPurpose;
  projectId: string;
  subscriberId?: string;
  referralCode?: string;
  expiresAt: number;
};

export function isTokenSigningConfigured(): boolean {
  const secret = process.env.EMAIL_TOKEN_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

function tokenSecret() {
  const secret = process.env.EMAIL_TOKEN_SECRET?.trim();
  if (!isTokenSigningConfigured() || !secret) {
    throw new Error(
      "EMAIL_TOKEN_SECRET must be configured with at least 32 characters.",
    );
  }
  return secret;
}

function signature(value: string) {
  return createHmac("sha256", tokenSecret()).update(value).digest("base64url");
}

export function generateOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function signToken(payload: SignedTokenPayload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${encoded}.${signature(encoded)}`;
}

export function verifySignedToken(
  token: string,
  purpose: SignedTokenPurpose,
): SignedTokenPayload | null {
  const [encoded, providedSignature, extra] = token.split(".");
  if (!encoded || !providedSignature || extra) return null;

  let expectedSignature: string;
  try {
    expectedSignature = signature(encoded);
  } catch {
    return null;
  }

  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as unknown;
    if (!payload || typeof payload !== "object") return null;
    const candidate = payload as Record<string, unknown>;
    if (
      candidate.purpose !== purpose ||
      typeof candidate.projectId !== "string" ||
      typeof candidate.expiresAt !== "number" ||
      candidate.expiresAt < Date.now()
    ) {
      return null;
    }
    if (
      candidate.subscriberId !== undefined &&
      typeof candidate.subscriberId !== "string"
    ) {
      return null;
    }
    if (
      candidate.referralCode !== undefined &&
      typeof candidate.referralCode !== "string"
    ) {
      return null;
    }
    return candidate as SignedTokenPayload;
  } catch {
    return null;
  }
}
