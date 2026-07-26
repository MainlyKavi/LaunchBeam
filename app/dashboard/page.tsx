import type { Metadata } from "next";
import {
  ArrowRight,
  Eye,
  ExternalLink,
  Plus,
  Settings,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyLinkButton } from "@/app/dashboard/copy-link-button";
import {
  ProjectDeleteButton,
  ProjectStatusButton,
} from "@/app/dashboard/project-status-button";
import {
  mapProjectRow,
  type ProjectView,
  type RawProjectRow,
} from "@/lib/project-records";
import { calculateDemandScore } from "@/lib/demand-score";
import { getSiteUrl } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TEMPLATE_LABELS } from "@/lib/types";

export const metadata: Metadata = {
  title: "Projects | LaunchBeam",
  description: "Manage waitlists and review real demand signals.",
  robots: { index: false, follow: false },
};

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

type ProjectStats = {
  conversionRate: number;
  demandScore: number | null;
  hasError: boolean;
  referralSignups: number;
  subscribers: number;
  uniqueVisitors: number;
};

async function getProjectStats(
  supabase: ServerSupabaseClient,
  projectId: string,
): Promise<ProjectStats> {
  try {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString();
    const fourteenDaysAgo = new Date(now - 14 * 86_400_000).toISOString();
    const [
      subscriberResult,
      uniqueVisitorResult,
      referralResult,
      recentResult,
      previousResult,
    ] = await Promise.all([
      supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "subscribed"),
      supabase.rpc("get_project_unique_visitors", {
        p_project_id: projectId,
      }),
      supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "subscribed")
        .not("referred_by", "is", null),
      supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "subscribed")
        .gte("created_at", sevenDaysAgo),
      supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "subscribed")
        .gte("created_at", fourteenDaysAgo)
        .lt("created_at", sevenDaysAgo),
    ]);

    const uniqueVisitors = Math.max(
      0,
      Number(uniqueVisitorResult.data ?? 0),
    );
    const subscribers = subscriberResult.count ?? 0;
    const demandScore = calculateDemandScore({
      uniqueVisitors,
      signups: subscribers,
      referralSignups: referralResult.count ?? 0,
      recentSignups: recentResult.count ?? 0,
      previousSignups: previousResult.count ?? 0,
    });

    return {
      subscribers,
      uniqueVisitors,
      referralSignups: referralResult.count ?? 0,
      demandScore: demandScore.score,
      conversionRate:
        uniqueVisitors > 0 ? (subscribers / uniqueVisitors) * 100 : 0,
      hasError: Boolean(
        subscriberResult.error ||
          uniqueVisitorResult.error ||
          referralResult.error ||
          recentResult.error ||
          previousResult.error,
      ),
    };
  } catch {
    return {
      subscribers: 0,
      uniqueVisitors: 0,
      referralSignups: 0,
      conversionRate: 0,
      demandScore: null,
      hasError: true,
    };
  }
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

function getProjectInitial(project: ProjectView): string {
  return project.name.trim().charAt(0) || "L";
}

function ProjectLoadError() {
  return (
    <>
      <div className="db-page-head">
        <div className="db-page-head-copy">
          <span className="db-eyebrow">Projects</span>
          <h1>Your launch workspace</h1>
          <p>Manage your waitlist and review the signals behind demand.</p>
        </div>
      </div>

      <section className="db-state-card" aria-labelledby="load-error-title">
        <span className="db-state-icon" aria-hidden="true">
          <TriangleAlert />
        </span>
        <h2 id="load-error-title">Projects could not be loaded</h2>
        <p>
          Your data is still safe. Check the connection and try loading this
          workspace again.
        </p>
        <Link className="db-primary-button" href="/dashboard">
          Try again
        </Link>
      </section>
    </>
  );
}

function EmptyDashboard() {
  return (
    <section className="db-empty" aria-labelledby="empty-projects-title">
      <div className="db-empty-visual" aria-hidden="true">
        <span className="db-empty-orbit" />
        <span className="db-empty-dot" />
        <span className="db-empty-icon">
          <Sparkles />
        </span>
      </div>
      <h2 id="empty-projects-title">Turn your idea into a signal</h2>
      <p>
        Create a waitlist, choose a polished starting point, and begin learning
        where real demand comes from.
      </p>
      <Link className="db-primary-button" href="/dashboard/projects/new">
        <Plus aria-hidden="true" />
        Create your first project
      </Link>
    </section>
  );
}

function ProjectCard({
  project,
  siteUrl,
  stats,
  emailDeliveryAvailable,
}: {
  project: ProjectView;
  siteUrl: string;
  stats: ProjectStats;
  emailDeliveryAvailable: boolean;
}) {
  const publicUrl = `${siteUrl}/${project.slug}`;
  const publicDisplay = publicUrl.replace(/^https?:\/\//, "");
  const isPublished = project.status === "published";
  const demandMessage =
    stats.demandScore !== null
      ? `${stats.demandScore}/100`
      : `${stats.uniqueVisitors}/100 visitors`;

  return (
    <article className="db-project-card">
      <div className="db-project-head">
        <div className="db-project-identity">
          <span className="db-project-logo" aria-hidden="true">
            {getProjectInitial(project)}
          </span>
          <div className="db-project-name">
            <div className="db-project-name-row">
              <h2>{project.name}</h2>
              <span className="db-status" data-status={project.status}>
                {project.status}
              </span>
            </div>
            {isPublished ? (
              <a
                className="db-public-link"
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span>{publicDisplay}</span>
                <ExternalLink aria-hidden="true" />
              </a>
            ) : (
              <span className="db-public-link">
                <span>{publicDisplay}</span>
              </span>
            )}
          </div>
        </div>

        <div className="db-project-head-actions">
          <CopyLinkButton url={publicUrl} />
          {project.status !== "archived" ? (
            <ProjectStatusButton
              disabledReason={
                !isPublished &&
                project.settings.requireEmailVerification &&
                !emailDeliveryAvailable
                  ? "Configure email delivery or turn off email confirmation before publishing."
                  : undefined
              }
              projectId={project.id}
              published={isPublished}
            />
          ) : null}
          <ProjectDeleteButton
            projectId={project.id}
            projectName={project.name}
          />
        </div>
      </div>

      <div className="db-project-metrics" aria-label={`${project.name} metrics`}>
        <div className="db-metric">
          <span>Subscribers</span>
          <strong>{formatNumber(stats.subscribers)}</strong>
          <small>confirmed signups</small>
        </div>
        <div className="db-metric">
          <span>Visitors</span>
          <strong>{formatNumber(stats.uniqueVisitors)}</strong>
          <small>unique sessions</small>
        </div>
        <div className="db-metric">
          <span>Conversion</span>
          <strong>{stats.conversionRate.toFixed(1)}%</strong>
          <small>visitor to signup</small>
        </div>
        <div className="db-metric">
          <span>Referrals</span>
          <strong>{formatNumber(stats.referralSignups)}</strong>
          <small>referred signups</small>
        </div>
        <div className="db-metric db-demand-metric">
          <span>Demand Score</span>
          <strong>{demandMessage}</strong>
          <small>
            {stats.demandScore !== null
              ? "view the transparent breakdown"
              : "score unlocks at 100 unique visitors"}
          </small>
        </div>
      </div>

      <div className="db-project-foot">
        <span className="db-project-meta">
          {TEMPLATE_LABELS[project.templateId]} template · Updated{" "}
          {formatDate(project.updatedAt)}
        </span>
        <div className="db-project-links">
          <Link
            className="db-quiet-button"
            href={`/preview/${project.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <Eye aria-hidden="true" />
            Preview
          </Link>
          <Link
            className="db-quiet-button"
            href={`/dashboard/projects/${project.id}/edit`}
          >
            Open editor
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            className="db-quiet-button"
            href={`/dashboard/projects/${project.id}/analytics`}
          >
            Analytics
          </Link>
          <Link
            className="db-quiet-button"
            href={`/dashboard/projects/${project.id}/subscribers`}
          >
            Subscribers
          </Link>
          <Link
            className="db-quiet-button"
            href={`/dashboard/projects/${project.id}/settings`}
          >
            <Settings aria-hidden="true" />
            Settings
          </Link>
        </div>
      </div>

      {stats.hasError ? (
        <p className="db-project-warning" role="status">
          Some metrics are temporarily unavailable. Project details are still
          current.
        </p>
      ) : null}
    </article>
  );
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    redirect(
      "/login?next=/dashboard&error=Account%20access%20is%20temporarily%20unavailable.",
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  let projectRows: RawProjectRow[] = [];
  let projectLoadFailed = false;

  try {
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id,owner_id,name,slug,status,template_id,content,theme,settings,published_at,created_at,updated_at",
      )
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      projectLoadFailed = true;
    } else {
      projectRows = (data ?? []) as RawProjectRow[];
    }
  } catch {
    projectLoadFailed = true;
  }

  if (projectLoadFailed) {
    return (
      <main>
        <ProjectLoadError />
      </main>
    );
  }

  const projects = projectRows.map(mapProjectRow);
  const siteUrl = await getSiteUrl();
  const emailDeliveryAvailable = Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      process.env.RESEND_FROM_EMAIL?.trim(),
  );
  const projectsWithStats = await Promise.all(
    projects.map(async (project) => ({
      project,
      stats: await getProjectStats(supabase, project.id),
    })),
  );
  return (
    <main>
      <div className="db-page-head">
        <div className="db-page-head-copy">
          <span className="db-eyebrow">Projects</span>
          <h1>Your launch workspace</h1>
          <p>
            Manage your waitlist and use real subscriber and traffic data to
            understand demand.
          </p>
        </div>
        <Link className="db-primary-button" href="/dashboard/projects/new">
          <Plus aria-hidden="true" />
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <section className="db-overview-grid" aria-label="Your projects">
          {projectsWithStats.map(({ project, stats }) => (
            <ProjectCard
              key={project.id}
              project={project}
              siteUrl={siteUrl}
              stats={stats}
              emailDeliveryAvailable={emailDeliveryAvailable}
            />
          ))}
        </section>
      )}
    </main>
  );
}
