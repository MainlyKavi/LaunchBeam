import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/logger";

const statusSchema = z.object({
  status: z.literal("unsubscribed"),
}).strict();

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store" },
  });
}

async function getAuthorizedClient(projectId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  return project ? supabase : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; subscriberId: string }> },
) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1024) {
    return json({ error: "The request is too large." }, 413);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Send JSON content." }, 415);
  }

  const { projectId, subscriberId } = await params;
  try {
    const supabase = await getAuthorizedClient(projectId);
    if (!supabase) return json({ error: "Not found." }, 404);

    const parsed = statusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return json({ error: "Choose a valid subscriber status." }, 400);
    }

    const { data, error } = await supabase
      .from("subscribers")
      .update({ status: parsed.data.status })
      .eq("id", subscriberId)
      .eq("project_id", projectId)
      .select("id,status")
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Subscriber not found." }, 404);

    return json({ subscriber: data }, 200);
  } catch (error) {
    logServerError("subscriber_status_update_failed", error, { projectId });
    return json(
      { error: "The subscriber could not be updated. Try again." },
      500,
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; subscriberId: string }> },
) {
  const { projectId, subscriberId } = await params;
  try {
    const supabase = await getAuthorizedClient(projectId);
    if (!supabase) return json({ error: "Not found." }, 404);

    const { data, error } = await supabase
      .from("subscribers")
      .delete()
      .eq("id", subscriberId)
      .eq("project_id", projectId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Subscriber not found." }, 404);

    return json({ removed: true }, 200);
  } catch (error) {
    logServerError("subscriber_remove_failed", error, { projectId });
    return json(
      { error: "The subscriber could not be removed. Try again." },
      500,
    );
  }
}
