import {
  apiError,
  apiJson,
  firstValidationMessage,
  readJsonBody,
  requestErrorResponse,
} from "@/app/api/_shared";
import {
  clientIp,
  referralCookieHeader,
  requestCountry,
  requestDeviceType,
  retryAfterHeaders,
} from "@/app/api/public/_shared";
import { logServerError } from "@/lib/logger";
import { normalizeSlug } from "@/lib/normalize-slug";
import {
  checkRateLimit,
  hashRateLimitIdentifier,
} from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { signToken } from "@/lib/tokens";
import { publicEventSchema } from "@/lib/validation/analytics";

const MAXIMUM_EVENT_BODY_BYTES = 4 * 1024;
const REFERRAL_COOKIE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type ValidReferral = {
  id: string;
  referral_code: string;
};

function safeReferrer(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

async function findReferral(
  projectId: string,
  referralCode: string | null | undefined,
): Promise<ValidReferral | null> {
  if (!referralCode) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("subscribers")
    .select("id,referral_code")
    .eq("project_id", projectId)
    .eq("referral_code", referralCode)
    .eq("status", "subscribed")
    .maybeSingle();
  return error || !data ? null : data;
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
        "Send the event as JSON.",
        415,
      );
    }

    const { slug: rawSlug } = await context.params;
    const slug = normalizeSlug(rawSlug);
    if (!slug || slug !== rawSlug.toLowerCase()) {
      return apiError("project_not_found", "Waitlist not found.", 404);
    }

    const payload = await readJsonBody(request, MAXIMUM_EVENT_BODY_BYTES);
    const result = publicEventSchema.safeParse(payload);
    if (!result.success) {
      return apiError(
        "invalid_event",
        firstValidationMessage(
          result.error.issues,
          "The analytics event is invalid.",
        ),
        400,
      );
    }

    const admin = getSupabaseAdmin();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id,slug")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (projectError) {
      return apiError(
        "service_unavailable",
        "Analytics are temporarily unavailable.",
        503,
      );
    }
    if (!project) {
      return apiError("project_not_found", "Waitlist not found.", 404);
    }
    projectId = project.id;

    const remoteIp = clientIp(request);
    const requestIdentifier = hashRateLimitIdentifier(
      remoteIp ?? result.data.sessionId,
    );
    const rateLimit = await checkRateLimit(
      "events",
      `${project.id}:${requestIdentifier}`,
    );
    if (!rateLimit.configured && !rateLimit.success) {
      return apiError(
        "rate_limit_unavailable",
        "Analytics are temporarily unavailable.",
        503,
      );
    }
    if (!rateLimit.success) {
      return apiError(
        "rate_limited",
        "Too many analytics events. Please wait and try again.",
        429,
        retryAfterHeaders(rateLimit.reset),
      );
    }

    const referral = await findReferral(
      project.id,
      result.data.referralCode,
    );
    if (result.data.eventType === "referral_visit" && !referral) {
      return apiError(
        "invalid_referral",
        "That referral link is invalid or no longer active.",
        400,
      );
    }

    const metadata = {
      ...(result.data.metadata.channel
        ? { channel: result.data.metadata.channel }
        : {}),
      ...(result.data.metadata.utmSource
        ? { utmSource: result.data.metadata.utmSource }
        : {}),
      ...(result.data.metadata.utmMedium
        ? { utmMedium: result.data.metadata.utmMedium }
        : {}),
      ...(result.data.metadata.utmCampaign
        ? { utmCampaign: result.data.metadata.utmCampaign }
        : {}),
    };

    let cookieHeader: string | undefined;
    if (result.data.eventType === "referral_visit" && referral) {
      const token = signToken({
        purpose: "referral",
        projectId: project.id,
        subscriberId: referral.id,
        referralCode: referral.referral_code,
        expiresAt: Date.now() + REFERRAL_COOKIE_LIFETIME_MS,
      });
      cookieHeader = referralCookieHeader(project.id, token);
    }

    const { error } = await admin.from("events").insert({
      project_id: project.id,
      event_type: result.data.eventType,
      session_id: result.data.sessionId,
      subscriber_id: referral?.id ?? null,
      referrer: safeReferrer(result.data.metadata.referrer),
      country: requestCountry(request),
      device_type: requestDeviceType(request),
      metadata,
    });

    if (error) {
      logServerError("public_event_insert_failed", error, {
        projectId: project.id,
        eventType: result.data.eventType,
      });
      return apiError(
        "event_failed",
        "The analytics event could not be recorded.",
        500,
      );
    }

    return apiJson(
      { accepted: true },
      202,
      cookieHeader ? { "set-cookie": cookieHeader } : undefined,
    );
  } catch (error) {
    const requestError = requestErrorResponse(error);
    if (requestError) return requestError;
    logServerError("public_event_failed", error, {
      ...(projectId ? { projectId } : {}),
    });
    return apiError(
      "service_unavailable",
      "Analytics are temporarily unavailable.",
      503,
    );
  }
}
