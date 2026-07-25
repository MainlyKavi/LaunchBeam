import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import {
  getProjectAnalytics,
  type AnalyticsRange,
} from "@/lib/analytics-dashboard";
import { getOwnedProject } from "@/lib/project-queries";
import "./analytics.css";

export const dynamic = "force-dynamic";

const allowedRanges = new Set<AnalyticsRange>(["7d", "30d", "90d", "all"]);

export default async function ProjectAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const project = await getOwnedProject(projectId);
  if (!project) notFound();
  const range = allowedRanges.has(query.range as AnalyticsRange)
    ? (query.range as AnalyticsRange)
    : "30d";
  const analytics = await getProjectAnalytics(projectId, range);

  return (
    <main className="project-analytics-page">
      <header className="project-page-header analytics-header">
        <div>
          <Link href="/dashboard">Dashboard</Link>
          <span>/</span>
          <Link href={`/dashboard/projects/${projectId}/edit`}>
            {project.name}
          </Link>
        </div>
        <p className="dashboard-eyebrow">Real project data</p>
        <h1>Analytics</h1>
        <p>
          Understand reach, conversion, referrals, and the signals behind your
          Demand Score.
        </p>
        <nav className="analytics-ranges" aria-label="Analytics date range">
          {(
            [
              ["7d", "7 days"],
              ["30d", "30 days"],
              ["90d", "90 days"],
              ["all", "All time"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={`?range=${value}`}
              aria-current={range === value ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <AnalyticsView analytics={analytics} range={range} />
    </main>
  );
}
