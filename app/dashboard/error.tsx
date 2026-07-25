"use client";

import { TriangleAlert } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="db-state-card" aria-labelledby="dashboard-error-title">
      <span className="db-state-icon" aria-hidden="true">
        <TriangleAlert />
      </span>
      <h2 id="dashboard-error-title">This workspace hit a snag</h2>
      <p>
        No changes were lost. Try this page again, or return after checking your
        connection.
      </p>
      <button className="db-primary-button" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
