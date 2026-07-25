import type { Metadata } from "next";
import { ArrowLeft, LockKeyhole, Sparkles, TriangleAlert, Wrench } from "lucide-react";
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

function ProjectLimitState({ projectName }: { projectName: string }) {
  return (
    <section className="db-state-card" aria-labelledby="project-limit-title">
      <span className="db-state-icon" aria-hidden="true">
        <LockKeyhole />
      </span>
      <h2 id="project-limit-title">Your active project is ready</h2>
      <p>
        The initial LaunchBeam workspace supports one active project. Continue
        building {projectName}, or archive it before starting another.
      </p>
      <Link className="db-primary-button" href="/dashboard">
        Open your project
      </Link>
    </section>
  );
}

function SetupState() {
  return (
    <section className="db-state-card" aria-labelledby="new-setup-title">
      <span className="db-state-icon" aria-hidden="true">
        <Wrench />
      </span>
      <h2 id="new-setup-title">Connect Supabase first</h2>
      <p>
        Project creation needs the public Supabase URL and anonymous key for
        secure account access.
      </p>
      <Link className="db-secondary-button" href="/dashboard">
        View setup details
      </Link>
    </section>
  );
}

function LoadErrorState() {
  return (
    <section className="db-state-card" aria-labelledby="new-error-title">
      <span className="db-state-icon" aria-hidden="true">
        <TriangleAlert />
      </span>
      <h2 id="new-error-title">Workspace status unavailable</h2>
      <p>
        LaunchBeam could not confirm whether your workspace can create another
        project. Try again before continuing.
      </p>
      <Link className="db-primary-button" href="/dashboard/projects/new">
        Try again
      </Link>
    </section>
  );
}

export default async function NewProjectPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main>
        <div className="db-page-head">
          <div className="db-page-head-copy">
            <span className="db-eyebrow">New project</span>
            <h1>Create your waitlist</h1>
          </div>
        </div>
        <SetupState />
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/projects/new");
  }

  const { data: activeProjects, error } = await supabase
    .from("projects")
    .select("id,name")
    .eq("owner_id", user.id)
    .neq("status", "archived")
    .limit(1);

  if (error) {
    return (
      <main>
        <div className="db-page-head">
          <div className="db-page-head-copy">
            <span className="db-eyebrow">New project</span>
            <h1>Create your waitlist</h1>
          </div>
        </div>
        <LoadErrorState />
      </main>
    );
  }

  const existingProject = activeProjects?.[0];
  if (existingProject) {
    return (
      <main>
        <div className="db-page-head">
          <div className="db-page-head-copy">
            <span className="db-eyebrow">Workspace limit</span>
            <h1>One project at a time</h1>
          </div>
        </div>
        <ProjectLimitState projectName={existingProject.name} />
      </main>
    );
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
