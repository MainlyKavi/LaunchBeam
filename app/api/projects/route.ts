import { apiError, apiJson, firstValidationMessage, readJsonBody, requestErrorResponse } from "@/app/api/_shared";
import { normalizeSlug } from "@/lib/normalize-slug";
import { mapProjectRow, type RawProjectRow } from "@/lib/project-records";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_PROJECT_CONTENT,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_PROJECT_THEME,
} from "@/lib/types";
import { projectCreateSchema } from "@/lib/validation/project";

const MAXIMUM_PROJECT_BODY_BYTES = 64 * 1024;

function isValidNormalizedSlug(slug: string): boolean {
  return (
    slug.length >= 3 &&
    slug.length <= 40 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !isReservedSlug(slug)
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError(
        "authentication_required",
        "Sign in to create a project.",
        401,
      );
    }

    const payload = await readJsonBody(request, MAXIMUM_PROJECT_BODY_BYTES);
    const result = projectCreateSchema.safeParse(payload);
    if (!result.success) {
      return apiError(
        "invalid_project",
        firstValidationMessage(
          result.error.issues,
          "Check the project details and try again.",
        ),
        400,
      );
    }

    const slug = normalizeSlug(result.data.slug);
    if (!isValidNormalizedSlug(slug)) {
      return apiError(
        "invalid_slug",
        "Use 3-40 lowercase letters, numbers, and single hyphens for the URL.",
        400,
      );
    }

    const { data: activeProject, error: activeProjectError } = await supabase
      .from("projects")
      .select("id")
      .eq("owner_id", user.id)
      .neq("status", "archived")
      .limit(1)
      .maybeSingle();
    if (activeProjectError) {
      return apiError(
        "service_unavailable",
        "Project creation is temporarily unavailable.",
        503,
      );
    }
    if (activeProject) {
      return apiError(
        "project_limit_reached",
        "This workspace already has an active project.",
        409,
      );
    }

    const admin = getSupabaseAdmin();
    const { data: existingProject, error: availabilityError } = await admin
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (availabilityError) {
      return apiError(
        "service_unavailable",
        "Project creation is temporarily unavailable.",
        503,
      );
    }
    if (existingProject) {
      return apiError(
        "slug_unavailable",
        "That public URL is already in use.",
        409,
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        name: result.data.name,
        slug,
        template_id: result.data.templateId,
        content: result.data.content ?? DEFAULT_PROJECT_CONTENT,
        theme: result.data.theme ?? DEFAULT_PROJECT_THEME,
        settings: result.data.settings ?? DEFAULT_PROJECT_SETTINGS,
      })
      .select(
        "id,owner_id,name,slug,status,template_id,content,theme,settings,published_at,created_at,updated_at",
      )
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        if (error.message.includes("projects_one_active_per_owner_idx")) {
          return apiError(
            "project_limit_reached",
            "This workspace already has an active project.",
            409,
          );
        }
        return apiError(
          "slug_unavailable",
          "That public URL is already in use.",
          409,
        );
      }
      return apiError(
        "project_create_failed",
        "We could not create the project. Please try again.",
        500,
      );
    }

    return apiJson({ project: mapProjectRow(data as RawProjectRow) }, 201);
  } catch (error) {
    return (
      requestErrorResponse(error) ??
      apiError(
        "service_unavailable",
        "Project creation is temporarily unavailable.",
        503,
      )
    );
  }
}
