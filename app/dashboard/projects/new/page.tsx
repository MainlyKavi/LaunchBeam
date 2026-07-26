import type { Metadata } from "next";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NewProjectForm } from "./new-project-form";

export const metadata: Metadata = {
  title: "New project | LaunchBeam",
  description: "Create a new LaunchBeam waitlist project.",
  robots: { index: false, follow: false },
};

export default async function NewProjectPage() {
  if (!isSupabaseConfigured()) {
    redirect(
      "/login?next=/dashboard/projects/new&error=Account%20access%20is%20temporarily%20unavailable.",
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/projects/new");
  }

  const siteUrl = await getSiteUrl();

  return (
    <main>
      <div className="db-page-head">
        <div className="db-page-head-copy">
          <Link className="db-public-link" href="/dashboard">
            <ArrowLeft aria-hidden="true" />
            <span>Back to projects</span>
          </Link>
          <span className="db-eyebrow">New project</span>
          <h1>Create your waitlist</h1>
          <p>
            Start with the essentials. Your name, URL, and design can all be
            refined in the editor.
          </p>
        </div>
      </div>

      <div className="db-form-shell">
        <NewProjectForm siteUrl={siteUrl} />
        <aside className="db-aside-card" aria-labelledby="next-steps-title">
          <h2 id="next-steps-title">What happens next</h2>
          <p>
            LaunchBeam creates a private draft. Nothing is public until you
            choose to publish it.
          </p>
          <ol className="db-checklist">
            <li>
              <span aria-hidden="true">1</span>
              <div>Shape your message and signup experience in the editor.</div>
            </li>
            <li>
              <span aria-hidden="true">2</span>
              <div>Preview the exact desktop and mobile waitlist.</div>
            </li>
            <li>
              <span aria-hidden="true">3</span>
              <div>Publish when the content and public URL feel ready.</div>
            </li>
          </ol>
          <p className="db-aside-note">
            <Sparkles
              aria-hidden="true"
              className="db-inline-icon"
              size={11}
            />
            Kimchi is selected by default as LaunchBeam’s signature
            liquid-glass template.
          </p>
        </aside>
      </div>
    </main>
  );
}
