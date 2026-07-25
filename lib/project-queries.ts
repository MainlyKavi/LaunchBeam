import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { refreshProjectAssetUrls } from "@/lib/project-assets";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  mapProjectRow,
  type ProjectView,
  type RawProjectRow,
} from "@/lib/project-records";
import { normalizeSlug } from "@/lib/normalize-slug";

const projectSelection =
  "id,owner_id,name,slug,status,template_id,content,theme,settings,published_at,created_at,updated_at";

export async function getPublishedProject(
  rawSlug: string,
): Promise<ProjectView | null> {
  const slug = normalizeSlug(rawSlug);
  if (!slug || slug !== rawSlug.toLowerCase()) return null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("projects")
      .select(projectSelection)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) return null;
    return refreshProjectAssetUrls(mapProjectRow(data as RawProjectRow));
  } catch {
    return null;
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
    if (error || !data) return null;
    return refreshProjectAssetUrls(mapProjectRow(data as RawProjectRow));
  } catch {
    return null;
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
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
