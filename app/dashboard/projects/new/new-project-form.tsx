"use client";

import { Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { normalizeSlug } from "@/lib/normalize-slug";
import {
  TEMPLATE_IDS,
  TEMPLATE_LABELS,
  type TemplateId,
} from "@/lib/types";

type NewProjectFormProps = {
  siteUrl: string;
};

type AvailabilityState =
  | { kind: "idle"; message: string }
  | { kind: "checking"; message: string }
  | { kind: "available"; message: string }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

const TEMPLATE_DESCRIPTIONS: Record<TemplateId, string> = {
  "minimal-beam": "Refined, quiet, premium product presentation.",
  kimchi: "Liquid-glass depth with soft light and clarity.",
  kevinora: "Warm editorial composition with artistic detail.",
  spotbeam: "Product-first split layout for screenshots and apps.",
  darkrai: "Deep, cinematic contrast for technical launches.",
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readApiError(value: unknown): string | null {
  const record = readRecord(value);
  if (!record) return null;

  if (typeof record.message === "string") {
    return record.message;
  }

  if (typeof record.error === "string") {
    return record.error;
  }

  const error = readRecord(record.error);
  return error && typeof error.message === "string" ? error.message : null;
}

function readCreatedProjectId(value: unknown): string | null {
  const record = readRecord(value);
  const project = record ? readRecord(record.project) : null;
  return project && typeof project.id === "string" ? project.id : null;
}

function readAvailability(
  value: unknown,
): { available: boolean; reason?: string } | null {
  const record = readRecord(value);
  if (!record || typeof record.available !== "boolean") {
    return null;
  }

  return {
    available: record.available,
    reason: typeof record.reason === "string" ? record.reason : undefined,
  };
}

function getPendingAvailability(slug: string): AvailabilityState {
  if (!slug) {
    return {
      kind: "idle",
      message: "Choose a name or enter a unique slug.",
    };
  }

  if (slug.length < 3) {
    return {
      kind: "unavailable",
      message: "Use at least 3 characters.",
    };
  }

  return {
    kind: "checking",
    message: "Checking this URL…",
  };
}

export function NewProjectForm({ siteUrl }: NewProjectFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [templateId, setTemplateId] = useState<TemplateId>("kimchi");
  const [availability, setAvailability] = useState<AvailabilityState>({
    kind: "idle",
    message: "Choose a name or enter a unique slug.",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const normalizedSiteUrl = siteUrl.replace(/\/$/, "");
  const publicUrl = `${normalizedSiteUrl}/${slug || "your-project"}`;

  useEffect(() => {
    if (slug.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailability({
        kind: "checking",
        message: "Checking this URL…",
      });

      try {
        const response = await fetch(
          `/api/projects/check-slug?slug=${encodeURIComponent(slug)}`,
          {
            method: "GET",
            signal: controller.signal,
          },
        );
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          setAvailability({
            kind: "error",
            message:
              readApiError(payload) ??
              "This URL could not be checked. Try another slug.",
          });
          return;
        }

        const result = readAvailability(payload);
        if (!result) {
          setAvailability({
            kind: "error",
            message: "This URL could not be checked. Try again.",
          });
          return;
        }

        setAvailability(
          result.available
            ? {
                kind: "available",
                message: "This URL is available.",
              }
            : {
                kind: "unavailable",
                message:
                  result.reason ??
                  "That URL is already in use or reserved by LaunchBeam.",
              },
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAvailability({
          kind: "error",
          message: "This URL could not be checked. Check your connection.",
        });
      }
    }, 360);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  function handleNameChange(value: string) {
    setName(value);
    setFormError(null);

    if (!slugTouched) {
      const nextSlug = normalizeSlug(value).slice(0, 40);
      setSlug(nextSlug);
      setAvailability(getPendingAvailability(nextSlug));
    }
  }

  function handleSlugChange(value: string) {
    const nextSlug = normalizeSlug(value).slice(0, 40);
    setSlugTouched(true);
    setSlug(nextSlug);
    setAvailability(getPendingAvailability(nextSlug));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Enter a project name.");
      return;
    }

    if (availability.kind !== "available") {
      setFormError("Choose an available public URL before continuing.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          templateId,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setFormError(
          readApiError(payload) ??
            "LaunchBeam could not create this project. Please try again.",
        );
        return;
      }

      const projectId = readCreatedProjectId(payload);
      router.push(
        projectId
          ? `/dashboard/projects/${projectId}/edit`
          : "/dashboard",
      );
      router.refresh();
    } catch {
      setFormError(
        "LaunchBeam could not reach the project service. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="db-form-card" onSubmit={handleSubmit}>
      <section className="db-form-section" aria-labelledby="project-details-title">
        <div className="db-form-section-head">
          <span className="db-step-number" aria-hidden="true">
            1
          </span>
          <div>
            <h2 id="project-details-title">Name and public URL</h2>
            <p>
              You can refine the content and design after the project is
              created.
            </p>
          </div>
        </div>

        <div className="db-field-grid">
          <div className="db-field">
            <label htmlFor="project-name">Project name</label>
            <input
              className="db-input"
              id="project-name"
              name="name"
              type="text"
              autoComplete="off"
              maxLength={80}
              placeholder="e.g. Kimchi"
              aria-describedby="project-name-hint"
              required
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
            />
            <span className="db-field-hint" id="project-name-hint">
              This is shown in your dashboard and waitlist metadata.
            </span>
          </div>

          <div className="db-field">
            <label htmlFor="project-slug">Project slug</label>
            <input
              className="db-input"
              id="project-slug"
              name="slug"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              minLength={3}
              maxLength={40}
              placeholder="e.g. kimchi"
              aria-describedby="slug-availability"
              aria-invalid={
                availability.kind === "unavailable" ||
                availability.kind === "error"
              }
              required
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
            />
            <span
              className="db-field-hint"
              id="slug-availability"
              data-kind={
                availability.kind === "available"
                  ? "success"
                  : availability.kind === "unavailable" ||
                      availability.kind === "error"
                    ? "error"
                    : undefined
              }
              aria-live="polite"
            >
              {availability.kind === "checking" ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="db-inline-icon"
                  data-spin="true"
                  size={11}
                />
              ) : availability.kind === "available" ? (
                <Check
                  aria-hidden="true"
                  className="db-inline-icon"
                  size={11}
                />
              ) : null}
              {availability.message}
            </span>
          </div>
        </div>

        <div className="db-public-url-card" aria-live="polite">
          <span>Your public URL</span>
          <strong>{publicUrl.replace(/^https?:\/\//, "")}</strong>
        </div>
      </section>

      <section className="db-form-section" aria-labelledby="template-title">
        <div className="db-form-section-head">
          <span className="db-step-number" aria-hidden="true">
            2
          </span>
          <div>
            <h2 id="template-title">Choose a starting template</h2>
            <p>
              Every template remains fully editable and uses the same waitlist
              features.
            </p>
          </div>
        </div>

        <div className="db-template-grid">
          {TEMPLATE_IDS.map((template) => (
            <label className="db-template-option" key={template}>
              <input
                type="radio"
                name="templateId"
                value={template}
                checked={templateId === template}
                onChange={() => setTemplateId(template)}
              />
              <span
                className="db-template-preview"
                data-template={template}
                aria-hidden="true"
              />
              <span className="db-template-copy">
                <strong>{TEMPLATE_LABELS[template]}</strong>
                <span>{TEMPLATE_DESCRIPTIONS[template]}</span>
                {template === "kimchi" ? (
                  <span className="db-template-default">
                    LaunchBeam default
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </section>

      {formError ? (
        <div className="db-form-error" role="alert">
          {formError}
        </div>
      ) : null}

      <div className="db-form-actions">
        <Link className="db-secondary-button" href="/dashboard">
          Cancel
        </Link>
        <button
          className="db-primary-button"
          type="submit"
          disabled={
            submitting ||
            !name.trim() ||
            availability.kind !== "available"
          }
        >
          {submitting ? "Creating project…" : "Create project"}
        </button>
      </div>
    </form>
  );
}
