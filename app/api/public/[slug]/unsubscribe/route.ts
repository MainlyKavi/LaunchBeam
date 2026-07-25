import {
  clearReferralCookieHeader,
  confirmationPage,
} from "@/app/api/public/_shared";
import { logServerError } from "@/lib/logger";
import { normalizeSlug } from "@/lib/normalize-slug";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifySignedToken } from "@/lib/tokens";

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
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const payload =
      token.length <= 4_096
        ? verifySignedToken(token, "unsubscribe")
        : null;

    if (
      !slug ||
      slug !== rawSlug.toLowerCase() ||
      !payload?.subscriberId
    ) {
      return confirmationPage(
        "Unsubscribe link invalid",
        "This unsubscribe link is invalid or has expired.",
        400,
      );
    }

    const admin = getSupabaseAdmin();
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id,name")
      .eq("slug", slug)
      .maybeSingle();

    if (
      projectError ||
      !project ||
      payload.projectId !== project.id
    ) {
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
      .eq("id", payload.subscriberId)
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
