import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { refreshProjectAssetUrls } from "@/lib/project-assets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  mapProjectRow,
  type ProjectView,
  type RawProjectRow,
} from "@/lib/project-records";
import { logServerError } from "@/lib/logger";
import { normalizeSlug } from "@/lib/normalize-slug";
import { isReservedSlug } from "@/lib/reserved-slugs";

const projectSelection =
  "id,owner_id,name,slug,status,template_id,content,theme,settings,published_at,created_at,updated_at";

export async function getPublishedProject(
  rawSlug: string,
): Promise<ProjectView | null> {
  const slug = normalizeSlug(rawSlug);
  if (!slug || slug !== rawSlug.toLowerCase() || isReservedSlug(slug)) {
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("projects")
      .select(projectSelection)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) {
      logServerError("published_project_query_failed", error);
      throw new Error("Published project lookup failed.");
    }
    if (!data) return null;
    return refreshProjectAssetUrls(mapProjectRow(data as RawProjectRow));
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "Published project lookup failed."
    ) {
      logServerError("published_project_unavailable", error);
    }
    throw new Error("Published project data is temporarily unavailable.");
  }
}

export async function getOwnedProject(
  projectId: string,
): Promise<ProjectView | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("projects")
      .select(projectSelection)
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) {
      logServerError("owned_project_query_failed", error);
      throw new Error("Owned project lookup failed.");
    }
    if (!data) return null;
    return refreshProjectAssetUrls(mapProjectRow(data as RawProjectRow));
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "Owned project lookup failed."
    ) {
      logServerError("owned_project_unavailable", error);
    }
    throw new Error("Project data is temporarily unavailable.");
  }
}

export async function getPublicSubscriberCount(projectId: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "subscribed");
    if (error) {
      logServerError("subscriber_count_query_failed", error);
      return undefined;
    }
    return count ?? 0;
  } catch (error) {
    logServerError("subscriber_count_unavailable", error);
    return undefined;
  }
}
