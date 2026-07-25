import type { ProjectView } from "@/lib/project-records";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const ASSET_BUCKET = "project-assets";
const REFRESHED_URL_LIFETIME_SECONDS = 24 * 60 * 60;
const ASSET_FILE_PATTERN =
  /^(?:logo|hero|background|screenshot)-[0-9a-f-]{36}\.(?:jpg|png|webp|avif)$/i;

function projectAssetPath(
  value: string | null,
  project: ProjectView,
): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    const markers = [
      `/storage/v1/object/sign/${ASSET_BUCKET}/`,
      `/storage/v1/object/public/${ASSET_BUCKET}/`,
    ];
    const marker = markers.find((candidate) =>
      url.pathname.includes(candidate),
    );
    if (!marker) return null;

    const path = decodeURIComponent(
      url.pathname.slice(url.pathname.indexOf(marker) + marker.length),
    );
    const prefix = `${project.ownerId}/${project.id}/`;
    const fileName = path.slice(prefix.length);
    if (
      !path.startsWith(prefix) ||
      fileName.includes("/") ||
      !ASSET_FILE_PATTERN.test(fileName)
    ) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

export async function refreshProjectAssetUrls(
  project: ProjectView,
): Promise<ProjectView> {
  const fields = ["logoUrl", "heroImageUrl"] as const;
  const admin = getSupabaseAdmin();
  const refreshed = await Promise.all(
    fields.map(async (field) => {
      const currentUrl = project.content[field];
      const path = projectAssetPath(currentUrl, project);
      if (!path) return [field, currentUrl] as const;

      const { data, error } = await admin.storage
        .from(ASSET_BUCKET)
        .createSignedUrl(path, REFRESHED_URL_LIFETIME_SECONDS);
      return [field, error || !data ? currentUrl : data.signedUrl] as const;
    }),
  );

  return {
    ...project,
    content: {
      ...project.content,
      ...Object.fromEntries(refreshed),
    },
  };
}
