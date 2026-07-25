"use client";

import { EyeOff, Globe2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProjectStatusButtonProps = {
  projectId: string;
  published: boolean;
};

function getResponseMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.error === "string") {
    return record.error;
  }

  if (typeof record.message === "string") {
    return record.message;
  }

  if (record.error && typeof record.error === "object") {
    const error = record.error as Record<string, unknown>;
    return typeof error.message === "string" ? error.message : null;
  }

  return null;
}

export function ProjectStatusButton({
  projectId,
  published,
}: ProjectStatusButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionLabel = published ? "Unpublish" : "Publish";

  async function updateStatus() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ publish: !published }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          getResponseMessage(payload) ??
            `LaunchBeam could not ${actionLabel.toLowerCase()} this project.`,
        );
        return;
      }

      router.refresh();
    } catch {
      setError(`LaunchBeam could not ${actionLabel.toLowerCase()} this project.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="db-secondary-button"
        type="button"
        disabled={submitting}
        aria-describedby={error ? `project-status-error-${projectId}` : undefined}
        onClick={updateStatus}
      >
        {published ? (
          <EyeOff aria-hidden="true" />
        ) : (
          <Globe2 aria-hidden="true" />
        )}
        {submitting ? "Saving…" : actionLabel}
      </button>
      {error ? (
        <span
          className="sr-only"
          id={`project-status-error-${projectId}`}
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </>
  );
}
