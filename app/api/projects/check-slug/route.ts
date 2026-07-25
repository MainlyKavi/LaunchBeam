import { apiError, apiJson } from "@/app/api/_shared";
import { normalizeSlug } from "@/lib/normalize-slug";
import { isReservedSlug } from "@/lib/reserved-slugs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function hasValidSlugShape(slug: string): boolean {
  return (
    slug.length >= 3 &&
    slug.length <= 40 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  );
}

export async function GET(request: Request): Promise<Response> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError(
        "authentication_required",
        "Sign in to check a project URL.",
        401,
      );
    }

    const requestedSlug = new URL(request.url).searchParams.get("slug");
    if (requestedSlug === null) {
      return apiError("missing_slug", "Enter a public URL.", 400);
    }

    const slug = normalizeSlug(requestedSlug);
    if (!hasValidSlugShape(slug)) {
      return apiJson({
        slug,
        available: false,
        reason: "Use 3-40 lowercase letters, numbers, and single hyphens.",
      });
    }
    if (isReservedSlug(slug)) {
      return apiJson({
        slug,
        available: false,
        reason: "That URL is reserved by LaunchBeam.",
      });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return apiError(
        "service_unavailable",
        "URL availability cannot be checked right now.",
        503,
      );
    }

    return apiJson({
      slug,
      available: data === null,
      ...(data ? { reason: "That public URL is already in use." } : {}),
    });
  } catch {
    return apiError(
      "service_unavailable",
      "URL availability cannot be checked right now.",
      503,
    );
  }
}
