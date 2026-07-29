import {
  apiError,
  apiJson,
  firstValidationMessage,
  isUuid,
  readJsonBody,
  requestErrorResponse,
} from "@/app/api/_shared";
import { isEmailDeliveryConfigured } from "@/lib/email";
import { mapProjectRow, type RawProjectRow } from "@/lib/project-records";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  projectContentSchema,
  projectSettingsSchema,
  projectThemeSchema,
  publishSchema,
  templateIdSchema,
} from "@/lib/validation/project";
import { getSiteUrl } from "@/lib/site-url";
import { isTokenSigningConfigured } from "@/lib/tokens";
import { revalidatePath } from "next/cache";

const MAXIMUM_PUBLISH_BODY_BYTES = 1024;
const PROJECT_SELECTION =
  "id,owner_id,name,slug,status,template_id,content,theme,settings,published_at,created_at,updated_at";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export async function POST(
  request: Request,
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
        "Sign in to publish this project.",
        401,
      );
    }

    const payload = await readJsonBody(request, MAXIMUM_PUBLISH_BODY_BYTES);
    const compatiblePayload =
      payload &&
      typeof payload === "object" &&
      "action" in payload &&
      (payload.action === "publish" || payload.action === "unpublish")
        ? { publish: payload.action === "publish" }
        : payload;
    const action = publishSchema.safeParse(compatiblePayload);
    if (!action.success) {
      return apiError(
        "invalid_publish_action",
        firstValidationMessage(
          action.error.issues,
          "Choose whether to publish or unpublish the project.",
        ),
        400,
      );
    }

    const { data: currentRow, error: loadError } = await supabase
      .from("projects")
      .select(PROJECT_SELECTION)
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (loadError) {
      return apiError(
        "publish_failed",
        "The project publication state could not be changed.",
        500,
      );
    }
    if (!currentRow) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const currentProject = mapProjectRow(currentRow as RawProjectRow);
    if (currentProject.status === "archived") {
      return apiError(
        "project_archived",
        "Restore this project before changing its publication state.",
        409,
      );
    }

    if (action.data.publish) {
      if (isReservedSlug(currentProject.slug)) {
        return apiError(
          "invalid_slug",
          "Choose a non-reserved public URL before publishing.",
          400,
        );
      }
      const configurationIsValid =
        templateIdSchema.safeParse(currentRow.template_id).success &&
        projectContentSchema.safeParse(currentRow.content).success &&
        projectThemeSchema.safeParse(currentRow.theme).success &&
        projectSettingsSchema.safeParse(currentRow.settings).success;
      if (!configurationIsValid) {
        return apiError(
          "project_configuration_invalid",
          "Fix the invalid project content, design, or settings before publishing.",
          400,
        );
      }

      const missingFields = [
        !currentProject.name.trim() ? "project name" : null,
        !currentProject.content.headline.trim() ? "headline" : null,
        !currentProject.content.description.trim() ? "description" : null,
        !currentProject.content.buttonText.trim() ? "button text" : null,
      ].filter((field): field is string => field !== null);

      if (missingFields.length > 0) {
        return apiError(
          "project_incomplete",
          `Add the required ${missingFields.join(", ")} before publishing.`,
          400,
        );
      }
      if (!isTokenSigningConfigured()) {
        return apiError(
          "secure_links_unavailable",
          "Configure EMAIL_TOKEN_SECRET before publishing.",
          400,
        );
      }
      if (
        currentProject.settings.requireEmailVerification &&
        !isEmailDeliveryConfigured()
      ) {
        return apiError(
          "email_verification_unavailable",
          "Configure transactional email before publishing with email verification.",
          400,
        );
      }
    }

    const updates = action.data.publish
      ? {
          status: "published" as const,
          published_at: currentProject.publishedAt ?? new Date().toISOString(),
        }
      : { status: "draft" as const };

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .select(PROJECT_SELECTION)
      .single();

    if (error || !data) {
      return apiError(
        "publish_failed",
        "The project publication state could not be changed. Please try again.",
        500,
      );
    }

    const project = mapProjectRow(data as RawProjectRow);
    revalidatePath(`/${project.slug}`);
    const siteUrl = await getSiteUrl();
    return apiJson({
      project,
      status: project.status,
      publicUrl:
        project.status === "published"
          ? `${siteUrl}/${project.slug}`
          : null,
    });
  } catch (error) {
    return (
      requestErrorResponse(error) ??
      apiError(
        "service_unavailable",
        "Publishing is temporarily unavailable.",
        503,
      )
    );
  }
}
