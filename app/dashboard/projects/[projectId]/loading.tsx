export default function ProjectAreaLoading() {
  return (
    <main className="dashboard-loading" aria-busy="true" aria-live="polite">
      <div className="dashboard-skeleton-heading" />
      <div className="dashboard-skeleton-grid">
        <div />
        <div />
        <div />
      </div>
      <span className="sr-only">Loading project</span>
    </main>
  );
}
