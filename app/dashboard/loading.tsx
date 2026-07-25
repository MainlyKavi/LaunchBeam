export default function DashboardLoading() {
  return (
    <main aria-label="Loading projects" role="status">
      <div className="db-skeleton-head" />
      <div className="db-skeleton-card" />
      <span className="sr-only">Loading your LaunchBeam projects…</span>
    </main>
  );
}
