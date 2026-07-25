import {
  apiError,
  apiJson,
  firstValidationMessage,
  isUuid,
  readJsonBody,
  requestErrorResponse,
} from "@/app/api/_shared";
import { normalizeSlug } from "@/lib/normalize-slug";
import { logServerError } from "@/lib/logger";
import { mapProjectRow, type RawProjectRow } from "@/lib/project-records";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ProjectContent,
  ProjectSettings,
  ProjectTheme,
  TemplateId,
} from "@/lib/types";
import { projectUpdateSchema } from "@/lib/validation/project";
import { revalidatePath } from "next/cache";

const MAXIMUM_PROJECT_BODY_BYTES = 128 * 1024;
const PROJECT_SELECTION =
  "id,owner_id,name,slug,status,template_id,content,theme,settings,published_at,created_at,updated_at";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

type ProjectUpdates = {
  name?: string;
  slug?: string;
  template_id?: TemplateId;
  content?: ProjectContent;
  theme?: ProjectTheme;
  settings?: ProjectSettings;
};

function validSlug(slug: string): boolean {
  return (
    slug.length >= 3 &&
    slug.length <= 40 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !isReservedSlug(slug)
  );
}

async function authenticate() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { projectId } = await context.params;
    if (!isUuid(projectId)) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const { supabase, user } = await authenticate();
    if (!user) {
      return apiError(
        "authentication_required",
        "Sign in to view this project.",
        401,
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .select(PROJECT_SELECTION)
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error) {
      return apiError(
        "project_load_failed",
        "The project could not be loaded.",
        500,
      );
    }
    if (!data) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    return apiJson({ project: mapProjectRow(data as RawProjectRow) });
  } catch {
    return apiError(
      "service_unavailable",
      "The project could not be loaded.",
      503,
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { projectId } = await context.params;
    if (!isUuid(projectId)) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const { supabase, user } = await authenticate();
    if (!user) {
      return apiError(
        "authentication_required",
        "Sign in to update this project.",
        401,
      );
    }

    const { data: currentProject, error: loadError } = await supabase
      .from("projects")
      .select("id,slug,status")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (loadError) {
      return apiError(
        "project_update_failed",
        "The project could not be updated.",
        500,
      );
    }
    if (!currentProject) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const payload = await readJsonBody(request, MAXIMUM_PROJECT_BODY_BYTES);
    const result = projectUpdateSchema.safeParse(payload);
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

    const updates: ProjectUpdates = {};
    if (result.data.name !== undefined) updates.name = result.data.name;
    if (result.data.templateId !== undefined) {
      updates.template_id = result.data.templateId;
    }
    if (result.data.content !== undefined) updates.content = result.data.content;
    if (result.data.theme !== undefined) updates.theme = result.data.theme;
    if (result.data.settings !== undefined) {
      updates.settings = result.data.settings;
    }

    if (result.data.slug !== undefined) {
      const slug = normalizeSlug(result.data.slug);
      if (!validSlug(slug)) {
        return apiError(
          "invalid_slug",
          "Use 3-40 lowercase letters, numbers, and single hyphens for the URL.",
          400,
        );
      }

      if (slug !== currentProject.slug) {
        const admin = getSupabaseAdmin();
        const { data: slugOwner, error: slugError } = await admin
          .from("projects")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (slugError) {
          return apiError(
            "service_unavailable",
            "URL availability cannot be checked right now.",
            503,
          );
        }
        if (slugOwner) {
          return apiError(
            "slug_unavailable",
            "That public URL is already in use.",
            409,
          );
        }
      }
      updates.slug = slug;
    }

    if (Object.keys(updates).length === 0) {
      return apiError(
        "no_changes",
        "Provide at least one project change.",
        400,
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .select(PROJECT_SELECTION)
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        return apiError(
          "slug_unavailable",
          "That public URL is already in use.",
          409,
        );
      }
      return apiError(
        "project_update_failed",
        "The project could not be updated. Please try again.",
        500,
      );
    }

    const project = mapProjectRow(data as RawProjectRow);
    if (currentProject.status === "published" || project.status === "published") {
      revalidatePath(`/${currentProject.slug}`);
      if (project.slug !== currentProject.slug) {
        revalidatePath(`/${project.slug}`);
      }
    }
    return apiJson({ project });
  } catch (error) {
    return (
      requestErrorResponse(error) ??
      apiError(
        "service_unavailable",
        "The project could not be updated.",
        503,
      )
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { projectId } = await context.params;
    if (!isUuid(projectId)) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const { supabase, user } = await authenticate();
    if (!user) {
      return apiError(
        "authentication_required",
        "Sign in to delete this project.",
        401,
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return apiError(
        "project_delete_failed",
        "The project could not be deleted.",
        500,
      );
    }
    if (!data) {
      return apiError("project_not_found", "Project not found.", 404);
    }

    const assetFolder = `${user.id}/${projectId}`;
    const { data: assets, error: assetListError } = await supabase.storage
      .from("project-assets")
      .list(assetFolder, { limit: 1_000 });
    if (assetListError) {
      logServerError("project_asset_cleanup_list_failed", assetListError, {
        projectId,
      });
    } else if (assets?.length) {
      const paths = assets
        .filter((asset) => asset.id)
        .map((asset) => `${assetFolder}/${asset.name}`);
      if (paths.length) {
        const { error: assetDeleteError } = await supabase.storage
          .from("project-assets")
          .remove(paths);
        if (assetDeleteError) {
          logServerError(
            "project_asset_cleanup_delete_failed",
            assetDeleteError,
            { projectId },
          );
        }
      }
    }

    return new Response(null, {
      status: 204,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return apiError(
      "service_unavailable",
      "The project could not be deleted.",
      503,
    );
  }
}
