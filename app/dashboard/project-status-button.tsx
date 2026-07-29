"use client";

import {
  Archive,
  ArchiveRestore,
  EyeOff,
  Globe2,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProjectStatusButtonProps = {
  disabledReason?: string;
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
  disabledReason,
  projectId,
  published,
}: ProjectStatusButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionLabel = published ? "Unpublish" : "Publish";
  const descriptionIds = [
    disabledReason ? `project-status-disabled-${projectId}` : null,
    error ? `project-status-error-${projectId}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

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
        disabled={submitting || Boolean(disabledReason)}
        aria-describedby={descriptionIds || undefined}
        onClick={updateStatus}
      >
        {published ? (
          <EyeOff aria-hidden="true" />
        ) : (
          <Globe2 aria-hidden="true" />
        )}
        {submitting ? "Saving…" : actionLabel}
      </button>
      {disabledReason ? (
        <span
          className="db-action-hint"
          id={`project-status-disabled-${projectId}`}
          role="status"
        >
          {disabledReason}
        </span>
      ) : null}
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

export function ProjectDeleteButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeProject() {
    const confirmed = window.confirm(
      `Delete ${projectName}? This permanently removes its subscribers and analytics.`,
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(
          getResponseMessage(payload) ??
            "LaunchBeam could not delete this project.",
        );
        return;
      }
      router.refresh();
    } catch {
      setError("LaunchBeam could not delete this project.");
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
        aria-describedby={error ? `project-delete-error-${projectId}` : undefined}
        onClick={removeProject}
      >
        <Trash2 aria-hidden="true" />
        {submitting ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <span
          className="sr-only"
          id={`project-delete-error-${projectId}`}
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </>
  );
}

export function ProjectArchiveButton({
  archived,
  projectId,
  projectName,
}: {
  archived: boolean;
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionLabel = archived ? "Restore" : "Archive";
  const errorId = `project-archive-error-${projectId}`;

  async function updateArchiveState() {
    if (
      !archived &&
      !window.confirm(
        `Archive ${projectName}? Its public waitlist will be unavailable until you restore it.`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/archive`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ archive: !archived }),
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
      setError(
        `LaunchBeam could not ${actionLabel.toLowerCase()} this project.`,
      );
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
        aria-busy={submitting}
        aria-describedby={error ? errorId : undefined}
        onClick={updateArchiveState}
      >
        {archived ? (
          <ArchiveRestore aria-hidden="true" />
        ) : (
          <Archive aria-hidden="true" />
        )}
        {submitting
          ? archived
            ? "Restoring..."
            : "Archiving..."
          : actionLabel}
      </button>
      {error ? (
        <span className="sr-only" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}
