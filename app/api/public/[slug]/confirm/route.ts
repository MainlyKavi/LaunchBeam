import { isUuid } from "@/app/api/_shared";
import { confirmationPage } from "@/app/api/public/_shared";
import { logServerError } from "@/lib/logger";
import { normalizeSlug } from "@/lib/normalize-slug";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashToken, verifySignedToken } from "@/lib/tokens";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  let projectId: string | undefined;

  try {
    const { slug: rawSlug } = await context.params;
    const slug = normalizeSlug(rawSlug);
    const url = new URL(request.url);
    const subscriberId = url.searchParams.get("subscriberId") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const guard = url.searchParams.get("guard") ?? "";
    const guardPayload =
      guard.length <= 4_096 ? verifySignedToken(guard, "confirm") : null;

    if (
      !slug ||
      slug !== rawSlug.toLowerCase() ||
      isReservedSlug(slug) ||
      !isUuid(subscriberId) ||
      !/^[a-zA-Z0-9_-]{32,128}$/.test(token) ||
      guardPayload?.subscriberId !== subscriberId
    ) {
      return confirmationPage(
        "Confirmation link invalid",
        "This confirmation link is invalid or has expired.",
        400,
      );
    }

    const admin = getSupabaseAdmin();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id,name")
      .eq("slug", slug)
      .maybeSingle();

    if (projectError || !project) {
      return confirmationPage(
        "Waitlist not found",
        "This waitlist is no longer available.",
        404,
      );
    }
    projectId = project.id;
    if (guardPayload.projectId !== project.id) {
      return confirmationPage(
        "Confirmation link invalid",
        "This confirmation link does not belong to this waitlist.",
        400,
      );
    }

    const { data, error } = await admin.rpc(
      "confirm_waitlist_subscription",
      {
        p_subscriber_id: subscriberId,
        p_confirmation_token_hash: hashToken(token),
      },
    );
    const confirmation = data?.[0];

    if (
      error ||
      !confirmation ||
      confirmation.project_id !== project.id ||
      confirmation.status !== "subscribed"
    ) {
      if (error) {
        logServerError("subscriber_confirmation_failed", error, {
          projectId: project.id,
        });
      }
      return confirmationPage(
        "Confirmation link invalid",
        "This confirmation link is invalid, expired, or has already been used.",
        400,
      );
    }

    return confirmationPage(
      "You're confirmed",
      `Your place on the ${project.name} waitlist is confirmed.`,
      200,
    );
  } catch (error) {
    logServerError("subscriber_confirmation_failed", error, {
      ...(projectId ? { projectId } : {}),
    });
    return confirmationPage(
      "Unable to confirm",
      "Confirmation is temporarily unavailable. Please try again later.",
      503,
    );
  }
}
