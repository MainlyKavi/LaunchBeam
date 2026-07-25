import { apiError, isUuid } from "@/app/api/_shared";
import { rowsToCsv } from "@/lib/csv";
import { getSiteUrl } from "@/lib/site-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const EXPORT_PAGE_SIZE = 1_000;
const MAXIMUM_EXPORT_ROWS = 100_000;

const CSV_HEADERS = [
  "email",
  "name",
  "status",
  "position",
  "referral_count",
  "referral_url",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "created_at",
] as const;

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

type SubscriberExportRow = {
  email: string;
  name: string | null;
  status: string;
  position: number;
  referral_count: number;
  referral_code: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
};

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { projectId } = await context.params;
    if (!isUuid(projectId)) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(
        "authentication_required",
        "Sign in to export subscribers.",
        401,
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,slug")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (projectError) {
      return apiError(
        "export_failed",
        "The subscriber export could not be created.",
        500,
      );
    }
    if (!project) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const rows: SubscriberExportRow[] = [];
    for (let offset = 0; offset < MAXIMUM_EXPORT_ROWS; offset += EXPORT_PAGE_SIZE) {
      const { data, error } = await supabase
        .from("subscribers")
        .select(
          "email,name,status,position,referral_count,referral_code,utm_source,utm_medium,utm_campaign,created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
        .range(offset, offset + EXPORT_PAGE_SIZE - 1);

      if (error) {
        return apiError(
          "export_failed",
          "The subscriber export could not be created.",
          500,
        );
      }

      const page = (data ?? []) as SubscriberExportRow[];
      rows.push(...page);
      if (page.length < EXPORT_PAGE_SIZE) break;
      if (offset + EXPORT_PAGE_SIZE >= MAXIMUM_EXPORT_ROWS) {
        return apiError(
          "export_too_large",
          "This project is too large for an immediate export.",
          413,
        );
      }
    }

    const siteUrl = await getSiteUrl();
    const body = rowsToCsv(
      CSV_HEADERS,
      rows.map((subscriber) => [
          subscriber.email,
          subscriber.name,
          subscriber.status,
          subscriber.position,
          subscriber.referral_count,
          `${siteUrl}/${project.slug}?ref=${encodeURIComponent(subscriber.referral_code)}`,
          subscriber.utm_source,
          subscriber.utm_medium,
          subscriber.utm_campaign,
          subscriber.created_at,
        ]),
    );

    return new Response(body, {
      status: 200,
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `attachment; filename="launchbeam-${project.slug}-subscribers.csv"`,
        "content-type": "text/csv; charset=utf-8",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return apiError(
      "service_unavailable",
      "Subscriber exports are temporarily unavailable.",
      503,
    );
  }
}
