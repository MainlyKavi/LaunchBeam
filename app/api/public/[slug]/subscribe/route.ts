import {
  apiError,
  apiJson,
  firstValidationMessage,
  readJsonBody,
  requestErrorResponse,
} from "@/app/api/_shared";
import {
  clientIp,
  readCookie,
  referralCookieName,
  retryAfterHeaders,
} from "@/app/api/public/_shared";
import { sendWelcomeEmail } from "@/lib/email";
import { logServerError } from "@/lib/logger";
import { normalizeSlug } from "@/lib/normalize-slug";
import {
  checkRateLimit,
  hashRateLimitIdentifier,
} from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  generateOpaqueToken,
  hashToken,
  signToken,
  verifySignedToken,
} from "@/lib/tokens";
import { verifyTurnstileToken } from "@/lib/turnstile";
import type { ProjectSettings } from "@/lib/types";
import { projectSettingsSchema } from "@/lib/validation/project";
import { subscribeSchema } from "@/lib/validation/subscriber";

const MAXIMUM_SIGNUP_BODY_BYTES = 8 * 1024;
const CONFIRMATION_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const UNSUBSCRIBE_LIFETIME_MS = 5 * 365 * 24 * 60 * 60 * 1_000;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type PublishedProject = {
  id: string;
  name: string;
  slug: string;
  settings: ProjectSettings;
};

type Referrer = {
  id: string;
  email: string;
  referral_code: string;
};

async function findValidReferrer(
  projectId: string,
  referralCode: string | null,
): Promise<Referrer | null> {
  if (!referralCode) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("subscribers")
    .select("id,email,referral_code")
    .eq("project_id", projectId)
    .eq("referral_code", referralCode)
    .eq("status", "subscribed")
    .maybeSingle();

  return error || !data ? null : data;
}

async function resolveReferral(
  request: Request,
  projectId: string,
  bodyReferralCode: string | null,
): Promise<Referrer | null> {
  const bodyReferrer = await findValidReferrer(projectId, bodyReferralCode);
  if (bodyReferrer) return bodyReferrer;

  const cookie = readCookie(request, referralCookieName(projectId));
  if (!cookie) return null;

  const payload = verifySignedToken(cookie, "referral");
  if (
    !payload ||
    payload.projectId !== projectId ||
    !payload.referralCode
  ) {
    return null;
  }
  return findValidReferrer(projectId, payload.referralCode);
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  let projectId: string | undefined;

  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return apiError(
        "unsupported_media_type",
        "Send the signup as JSON.",
        415,
      );
    }

    const { slug: rawSlug } = await context.params;
    const slug = normalizeSlug(rawSlug);
    if (!slug || slug !== rawSlug.toLowerCase()) {
      return apiError("project_not_found", "Waitlist not found.", 404);
    }

    const admin = getSupabaseAdmin();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id,name,slug,settings")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (projectError) {
      return apiError(
        "service_unavailable",
        "This waitlist is temporarily unavailable.",
        503,
      );
    }
    if (!project) {
      return apiError("project_not_found", "Waitlist not found.", 404);
    }
    projectId = project.id;
    const publishedProject = project as PublishedProject;
    const settingsResult = projectSettingsSchema.safeParse(
      publishedProject.settings,
    );
    if (!settingsResult.success) {
      return apiError(
        "project_configuration_invalid",
        "This waitlist is temporarily unavailable.",
        503,
      );
    }

    const payload = await readJsonBody(request, MAXIMUM_SIGNUP_BODY_BYTES);
    const result = subscribeSchema.safeParse(payload);
    if (!result.success) {
      return apiError(
        "invalid_signup",
        firstValidationMessage(
          result.error.issues,
          "Check your signup details and try again.",
        ),
        400,
      );
    }

    const settings = settingsResult.data;
    const name = settings.collectName ? (result.data.name ?? null) : null;
    const customAnswer = settings.customQuestion
      ? (result.data.customAnswer ?? null)
      : null;
    if (settings.customQuestion?.required && !customAnswer) {
      return apiError(
        "custom_answer_required",
        "Answer the project question before joining.",
        400,
      );
    }

    const remoteIp = clientIp(request);
    const emailHash = hashRateLimitIdentifier(result.data.email);
    const requestHash = hashRateLimitIdentifier(remoteIp ?? "unknown");
    const rateLimit = await checkRateLimit(
      "signup",
      `${publishedProject.id}:${emailHash}:${requestHash}`,
    );
    if (!rateLimit.configured && !rateLimit.success) {
      return apiError(
        "rate_limit_unavailable",
        "Signups are temporarily unavailable.",
        503,
      );
    }
    if (!rateLimit.success) {
      return apiError(
        "rate_limited",
        "Too many signup attempts. Please wait and try again.",
        429,
        retryAfterHeaders(rateLimit.reset),
      );
    }

    const turnstile = await verifyTurnstileToken(
      result.data.turnstileToken,
      remoteIp,
    );
    if (!turnstile.success) {
      return apiError(
        "turnstile_failed",
        turnstile.error ??
          "The spam check expired or was invalid. Please try again.",
        400,
      );
    }

    let referrer: Referrer | null = null;
    if (settings.referralsEnabled) {
      referrer = await resolveReferral(
        request,
        publishedProject.id,
        result.data.referralCode,
      );
      if (referrer?.email === result.data.email) referrer = null;
    }

    const confirmationToken = settings.requireEmailVerification
      ? generateOpaqueToken()
      : null;
    const confirmationTokenHash = confirmationToken
      ? hashToken(confirmationToken)
      : null;

    // Fail before committing if secure subscriber links cannot be issued.
    signToken({
      purpose: "unsubscribe",
      projectId: publishedProject.id,
      subscriberId: crypto.randomUUID(),
      expiresAt: Date.now() + UNSUBSCRIBE_LIFETIME_MS,
    });
    const siteUrl = await getSiteUrl();

    const { data, error } = await admin.rpc("subscribe_to_waitlist", {
      p_project_slug: publishedProject.slug,
      p_email: result.data.email,
      p_name: name,
      p_custom_answer: customAnswer,
      p_referral_code: referrer?.referral_code ?? null,
      p_session_id: result.data.sessionId ?? null,
      p_utm_source: result.data.utmSource ?? null,
      p_utm_medium: result.data.utmMedium ?? null,
      p_utm_campaign: result.data.utmCampaign ?? null,
      p_confirmation_token_hash: confirmationTokenHash,
    });

    const subscriber = data?.[0];
    if (error || !subscriber) {
      logServerError("public_signup_rpc_failed", error, {
        projectId: publishedProject.id,
      });
      return apiError(
        "signup_failed",
        "We could not add you right now. Please try again.",
        500,
      );
    }
    if (subscriber.status === "unsubscribed") {
      return apiError(
        "previously_unsubscribed",
        "This address previously left the waitlist. Contact the project owner to rejoin.",
        409,
      );
    }

    const referralUrl = `${siteUrl}/${publishedProject.slug}?ref=${encodeURIComponent(subscriber.referral_code)}`;
    const unsubscribeToken = signToken({
      purpose: "unsubscribe",
      projectId: publishedProject.id,
      subscriberId: subscriber.subscriber_id,
      expiresAt: Date.now() + UNSUBSCRIBE_LIFETIME_MS,
    });
    const unsubscribeUrl = `${siteUrl}/api/public/${encodeURIComponent(publishedProject.slug)}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
    const confirmationGuard =
      confirmationToken && subscriber.status === "pending"
        ? signToken({
            purpose: "confirm",
            projectId: publishedProject.id,
            subscriberId: subscriber.subscriber_id,
            expiresAt: Date.now() + CONFIRMATION_LIFETIME_MS,
          })
        : null;
    const confirmationUrl =
      confirmationToken && confirmationGuard
        ? `${siteUrl}/api/public/${encodeURIComponent(publishedProject.slug)}/confirm?subscriberId=${encodeURIComponent(subscriber.subscriber_id)}&token=${encodeURIComponent(confirmationToken)}&guard=${encodeURIComponent(confirmationGuard)}`
        : null;

    let emailSent = false;
    if (!subscriber.already_subscribed || subscriber.status === "pending") {
      try {
        const delivery = await sendWelcomeEmail({
          to: subscriber.email,
          projectName: publishedProject.name,
          position: subscriber.position,
          referralUrl,
          unsubscribeUrl,
          confirmationUrl,
          referralsEnabled: settings.referralsEnabled,
        });
        emailSent = delivery.sent;
      } catch (error) {
        logServerError("welcome_email_failed_after_signup", error, {
          projectId: publishedProject.id,
        });
      }
    }

    return apiJson(
      {
        success: true,
        alreadySubscribed: subscriber.already_subscribed,
        position: subscriber.position,
        referralCount: subscriber.referral_count,
        referralCode: subscriber.referral_code,
        referralUrl,
        status: subscriber.status,
        emailSent,
      },
      subscriber.already_subscribed ? 200 : 201,
    );
  } catch (error) {
    const requestError = requestErrorResponse(error);
    if (requestError) return requestError;
    logServerError("public_signup_failed", error, {
      ...(projectId ? { projectId } : {}),
    });
    return apiError(
      "service_unavailable",
      "This waitlist is temporarily unavailable.",
      503,
    );
  }
}
