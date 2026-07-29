import {
  apiError,
  apiJson,
  firstValidationMessage,
  isUuid,
  readJsonBody,
  requestErrorResponse,
} from "@/app/api/_shared";
import { logServerError } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MAXIMUM_ARCHIVE_BODY_BYTES = 1_024;

const archiveActionSchema = z
  .object({
    archive: z.boolean(),
  })
  .strict();

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
        "Sign in to archive or restore this project.",
        401,
      );
    }

    const payload = await readJsonBody(request, MAXIMUM_ARCHIVE_BODY_BYTES);
    const action = archiveActionSchema.safeParse(payload);
    if (!action.success) {
      return apiError(
        "invalid_archive_action",
        firstValidationMessage(
          action.error.issues,
          "Choose whether to archive or restore the project.",
        ),
        400,
      );
    }

    const { data: currentProject, error: loadError } = await supabase
      .from("projects")
      .select("id,slug,status")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (loadError) {
      logServerError("project_archive_load_failed", loadError, { projectId });
      return apiError(
        "archive_failed",
        "The project archive state could not be changed.",
        500,
      );
    }
    if (!currentProject) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const canArchive =
      currentProject.status === "draft" ||
      currentProject.status === "published";
    const canRestore = currentProject.status === "archived";
    if (
      (action.data.archive && !canArchive) ||
      (!action.data.archive && !canRestore)
    ) {
      return apiError(
        "invalid_archive_transition",
        action.data.archive
          ? "Only draft or published projects can be archived."
          : "Only archived projects can be restored.",
        409,
      );
    }

    const nextStatus = action.data.archive ? "archived" : "draft";
    const admin = getSupabaseAdmin();
    const { data: updatedProject, error: updateError } = await admin
      .from("projects")
      .update({ status: nextStatus })
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .eq("status", currentProject.status)
      .select("id,slug,status")
      .maybeSingle();

    if (updateError) {
      logServerError("project_archive_update_failed", updateError, {
        projectId,
      });
      return apiError(
        "archive_failed",
        "The project archive state could not be changed. Please try again.",
        500,
      );
    }
    if (!updatedProject) {
      return apiError(
        "archive_state_changed",
        "The project changed while this action was running. Refresh and try again.",
        409,
      );
    }

    revalidatePath(`/${updatedProject.slug}`);
    revalidatePath("/dashboard");
    return apiJson({
      projectId: updatedProject.id,
      status: updatedProject.status,
    });
  } catch (error) {
    logServerError("project_archive_unavailable", error);
    return (
      requestErrorResponse(error) ??
      apiError(
        "service_unavailable",
        "Project archiving is temporarily unavailable.",
        503,
      )
    );
  }
}
