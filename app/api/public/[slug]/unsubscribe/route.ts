import {
  clearReferralCookieHeader,
  confirmationPage,
} from "@/app/api/public/_shared";
import { logServerError } from "@/lib/logger";
import { normalizeSlug } from "@/lib/normalize-slug";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifySignedToken } from "@/lib/tokens";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const MAXIMUM_UNSUBSCRIBE_BODY_BYTES = 8 * 1024;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function unsubscribeConfirmationPage(
  projectName: string,
  slug: string,
  token: string,
): Response {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "content-type": "text/html; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-robots-tag": "noindex, nofollow",
  });
  const action = `/api/public/${encodeURIComponent(slug)}/unsubscribe`;
  const title = `Unsubscribe from ${projectName}`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} - LaunchBeam</title></head>
<body><main><h1>${escapeHtml(title)}</h1><p id="unsubscribe-description">Confirm that you no longer want to receive waitlist emails for ${escapeHtml(projectName)}.</p><form method="post" action="${escapeHtml(action)}" aria-describedby="unsubscribe-description"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">Unsubscribe</button></form><p><a href="/">Cancel and return to LaunchBeam</a></p></main></body>
</html>`;

  return new Response(html, { status: 200, headers });
}

function validateLinkInput(rawSlug: string, token: string) {
  const slug = normalizeSlug(rawSlug);
  const payload =
    token.length <= 4_096
      ? verifySignedToken(token, "unsubscribe")
      : null;
  const subscriberId = payload?.subscriberId;

  if (
    !slug ||
    slug !== rawSlug.toLowerCase() ||
    isReservedSlug(slug) ||
    !subscriberId
  ) {
    return null;
  }

  return { payload, slug, subscriberId };
}

async function readBoundedBody(
  request: Request,
  maximumBytes: number,
): Promise<string | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const advertisedBytes = Number(contentLength);
    if (
      !Number.isFinite(advertisedBytes) ||
      advertisedBytes < 0 ||
      advertisedBytes > maximumBytes
    ) {
      return null;
    }
  }

  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > maximumBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  let projectId: string | undefined;

  try {
    const { slug: rawSlug } = await context.params;
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const link = validateLinkInput(rawSlug, token);

    if (!link) {
      return confirmationPage(
        "Unsubscribe link invalid",
        "This unsubscribe link is invalid or has expired.",
        400,
      );
    }
    const { payload, slug, subscriberId } = link;

    const admin = getSupabaseAdmin();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id,name")
      .eq("id", payload.projectId)
      .maybeSingle();

    if (projectError) {
      logServerError("subscriber_unsubscribe_project_lookup_failed", projectError);
      return confirmationPage(
        "Unable to verify unsubscribe link",
        "Your request could not be completed. Please try again later.",
        503,
      );
    }
    if (!project) {
      return confirmationPage(
        "Waitlist not found",
        "This unsubscribe link does not belong to an active waitlist.",
        404,
      );
    }
    projectId = project.id;

    const { data: subscriber, error: subscriberError } = await admin
      .from("subscribers")
      .select("id,status")
      .eq("id", subscriberId)
      .eq("project_id", project.id)
      .maybeSingle();

    if (subscriberError) {
      logServerError("subscriber_unsubscribe_failed", subscriberError, {
        projectId: project.id,
      });
      return confirmationPage(
        "Unable to verify unsubscribe link",
        "Your request could not be completed. Please try again later.",
        500,
      );
    }
    if (!subscriber) {
      return confirmationPage(
        "Unsubscribe link invalid",
        "This unsubscribe link is invalid or has expired.",
        400,
      );
    }

    if (subscriber.status === "unsubscribed") {
      return confirmationPage(
        "Already unsubscribed",
        `You are already unsubscribed from waitlist emails for ${project.name}.`,
        200,
      );
    }

    return unsubscribeConfirmationPage(project.name, slug, token);
  } catch (error) {
    logServerError("subscriber_unsubscribe_failed", error, {
      ...(projectId ? { projectId } : {}),
    });
    return confirmationPage(
      "Unable to verify unsubscribe link",
      "Your request could not be completed. Please try again later.",
      503,
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  let projectId: string | undefined;

  try {
    const { slug: rawSlug } = await context.params;
    const contentType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();

    if (contentType !== "application/x-www-form-urlencoded") {
      return confirmationPage(
        "Unsubscribe link invalid",
        "This unsubscribe link is invalid or has expired.",
        400,
      );
    }

    const body = await readBoundedBody(
      request,
      MAXIMUM_UNSUBSCRIBE_BODY_BYTES,
    );
    if (body === null) {
      return confirmationPage(
        "Unsubscribe link invalid",
        "This unsubscribe link is invalid or has expired.",
        400,
      );
    }
    const token = new URLSearchParams(body).get("token") ?? "";
    const link = validateLinkInput(rawSlug, token);

    if (!link) {
      return confirmationPage(
        "Unsubscribe link invalid",
        "This unsubscribe link is invalid or has expired.",
        400,
      );
    }
    const { payload, subscriberId } = link;

    const admin = getSupabaseAdmin();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id,name")
      .eq("id", payload.projectId)
      .maybeSingle();

    if (projectError) {
      logServerError("subscriber_unsubscribe_project_lookup_failed", projectError);
      return confirmationPage(
        "Unable to unsubscribe",
        "Your request could not be completed. Please try again later.",
        503,
      );
    }
    if (!project) {
      return confirmationPage(
        "Waitlist not found",
        "This unsubscribe link does not belong to an active waitlist.",
        404,
      );
    }
    projectId = project.id;

    const { data: subscriber, error } = await admin
      .from("subscribers")
      .update({ status: "unsubscribed" })
      .eq("id", subscriberId)
      .eq("project_id", project.id)
      .select("id")
      .maybeSingle();

    if (error) {
      logServerError("subscriber_unsubscribe_failed", error, {
        projectId: project.id,
      });
      return confirmationPage(
        "Unable to unsubscribe",
        "Your request could not be completed. Please try again later.",
        500,
      );
    }
    if (!subscriber) {
      return confirmationPage(
        "Unsubscribe link invalid",
        "This unsubscribe link is invalid or has expired.",
        400,
      );
    }

    return confirmationPage(
      "You've been unsubscribed",
      `You will no longer receive waitlist emails for ${project.name}.`,
      200,
      { "set-cookie": clearReferralCookieHeader(project.id) },
    );
  } catch (error) {
    logServerError("subscriber_unsubscribe_failed", error, {
      ...(projectId ? { projectId } : {}),
    });
    return confirmationPage(
      "Unable to unsubscribe",
      "Your request could not be completed. Please try again later.",
      503,
    );
  }
}
