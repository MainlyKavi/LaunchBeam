import { betaSignups } from "@/db/schema";
import { getDb } from "@/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: Record<string, string>, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) {
    return json({ error: "The request is too large." }, 413);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Send a valid beta access request." }, 400);
  }

  if (!payload || typeof payload !== "object") {
    return json({ error: "Send a valid beta access request." }, 400);
  }

  const { email, plan, consent } = payload as Record<string, unknown>;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
    return json({ error: "Enter a valid email address." }, 400);
  }
  if (plan !== "free" && plan !== "pro") {
    return json({ error: "Choose a valid beta plan." }, 400);
  }
  if (consent !== true) {
    return json({ error: "Consent is required for beta access emails." }, 400);
  }

  try {
    const hasSupabaseAdmin = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    );

    if (hasSupabaseAdmin) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("beta_signups").upsert(
        { email: normalizedEmail, plan, consent: true },
        { onConflict: "email" },
      );
      if (error) throw error;
    } else {
      const db = await getDb();
      await db
        .insert(betaSignups)
        .values({ email: normalizedEmail, plan, consent: true })
        .onConflictDoUpdate({
          target: betaSignups.email,
          set: { plan, consent: true },
        });
    }

    return json(
      { message: "We saved your request and will email you when beta access opens." },
      201,
    );
  } catch {
    return json(
      { error: "Beta signup is temporarily unavailable. Please try again shortly." },
      503,
    );
  }
}
