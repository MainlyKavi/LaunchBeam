"use client";

import type {
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  ImagePlus,
  Monitor,
  Redo2,
  Smartphone,
  Undo2,
  Upload,
} from "lucide-react";
import type {
  ProjectContent,
  ProjectSettings,
  ProjectTheme,
  TemplateId,
} from "@/lib/types";
import {
  TEMPLATE_IDS,
  TEMPLATE_LABELS,
  TEMPLATE_THEME_PRESETS,
} from "@/lib/types";
import {
  TemplateRenderer,
  type WaitlistProject,
} from "@/components/waitlist/template-renderer";
import { normalizeSlug } from "@/lib/normalize-slug";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./editor.css";

type ProjectStatus = "draft" | "published" | "archived";
type EditorTab = "content" | "design" | "settings";
type PreviewMode = "desktop" | "mobile";
type SaveState = "idle" | "saving" | "saved" | "error";
type AssetFieldName =
  | "logoUrl"
  | "heroImageUrl"
  | "screenshotUrl"
  | "backgroundImageUrl";

const assetKindByField: Record<
  AssetFieldName,
  "logo" | "hero" | "screenshot" | "background"
> = {
  logoUrl: "logo",
  heroImageUrl: "hero",
  screenshotUrl: "screenshot",
  backgroundImageUrl: "background",
};

export type EditableProject = WaitlistProject & {
  status: ProjectStatus;
  updatedAt: string;
};

type EditorSnapshot = {
  name: string;
  slug: string;
  templateId: TemplateId;
  content: ProjectContent;
  theme: ProjectTheme;
  settings: ProjectSettings;
};

const approvedFonts = [
  { value: "argentum", label: "Argentum Sans" },
  { value: "editorial", label: "Editorial Serif" },
  { value: "mono", label: "Modern Mono" },
] as const;

function snapshot(project: EditableProject): EditorSnapshot {
  return {
    name: project.name,
    slug: project.slug,
    templateId: project.templateId,
    content: project.content,
    theme: project.theme,
    settings: project.settings,
  };
}

function snapshotKey(value: EditorSnapshot) {
  return JSON.stringify(value);
}

function uploadProjectAsset(
  projectId: string,
  formData: FormData,
  onProgress: (value: number | null) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `/api/projects/${projectId}/assets`);
    request.responseType = "json";
    request.upload.addEventListener("progress", (event) => {
      onProgress(
        event.lengthComputable
          ? Math.min(100, Math.round((event.loaded / event.total) * 100))
          : null,
      );
    });
    request.addEventListener("error", () => {
      reject(new Error("Unable to upload that image."));
    });
    request.addEventListener("load", () => {
      const body = request.response as { error?: string; url?: string } | null;
      if (request.status < 200 || request.status >= 300 || !body?.url) {
        reject(new Error(body?.error || "Unable to upload that image."));
        return;
      }
      onProgress(100);
      resolve(body.url);
    });
    request.send(formData);
  });
}

export function ProjectEditor({
  initialProject,
  initialTab = "content",
  siteUrl,
  emailDeliveryAvailable,
}: {
  initialProject: EditableProject;
  initialTab?: EditorTab;
  siteUrl: string;
  emailDeliveryAvailable: boolean;
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [tab, setTab] = useState<EditorTab>(initialTab);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [publishState, setPublishState] = useState<
    "idle" | "working" | "error"
  >("idle");
  const [deleteState, setDeleteState] = useState<"idle" | "working" | "error">(
    "idle",
  );
  const [uploadingField, setUploadingField] =
    useState<AssetFieldName | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [history, setHistory] = useState<EditorSnapshot[]>([
    snapshot(initialProject),
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [lastSavedKey, setLastSavedKey] = useState(
    snapshotKey(snapshot(initialProject)),
  );
  const requestVersionRef = useRef(0);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const editorClosedRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const latestSnapshotKeyRef = useRef(
    snapshotKey(snapshot(initialProject)),
  );
  const replacedAssetUrlsRef = useRef<string[]>([]);
  const [saveAttempt, setSaveAttempt] = useState(0);

  const currentSnapshot = useMemo(() => snapshot(project), [project]);
  const currentKey = useMemo(
    () => snapshotKey(currentSnapshot),
    [currentSnapshot],
  );
  const isDirty = currentKey !== lastSavedKey;

  const cleanupReplacedAssets = useCallback(
    async (savedProject: EditableProject) => {
      const retainedUrls = new Set([
        savedProject.content.logoUrl,
        savedProject.content.heroImageUrl,
        savedProject.content.screenshotUrl,
        savedProject.content.backgroundImageUrl,
      ]);
      const candidates = [
        ...new Set(
          replacedAssetUrlsRef.current.filter(
            (url) => !retainedUrls.has(url),
          ),
        ),
      ];
      if (!candidates.length) return;

      const removed = new Set<string>();
      await Promise.all(
        candidates.map(async (url) => {
          try {
            const response = await fetch(
              `/api/projects/${savedProject.id}/assets`,
              {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ url }),
              },
            );
            if (response.ok) removed.add(url);
          } catch {
            // Cleanup is retried after the next successful save.
          }
        }),
      );
      replacedAssetUrlsRef.current = replacedAssetUrlsRef.current.filter(
        (url) => !removed.has(url),
      );
    },
    [],
  );

  const applySnapshot = useCallback(
    (next: EditorSnapshot, recordHistory = true) => {
      latestSnapshotKeyRef.current = snapshotKey(next);
      setProject((current) => ({ ...current, ...next }));
      if (!recordHistory) return;
      setHistory((current) => {
        const nextHistory = current.slice(0, historyIndex + 1);
        const previous = nextHistory.at(-1);
        if (previous && snapshotKey(previous) === snapshotKey(next)) {
          return current;
        }
        nextHistory.push(next);
        return nextHistory.slice(-50);
      });
      setHistoryIndex((current) => Math.min(current + 1, 49));
    },
    [historyIndex],
  );

  const updateProject = useCallback(
    (updater: (current: EditorSnapshot) => EditorSnapshot) => {
      applySnapshot(updater(currentSnapshot));
    },
    [applySnapshot, currentSnapshot],
  );

  const persistSnapshot = useCallback(
    (payload: EditorSnapshot): Promise<EditableProject | null> => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      const version = ++requestVersionRef.current;
      const execute = async (): Promise<EditableProject | null> => {
        if (
          editorClosedRef.current ||
          version !== requestVersionRef.current
        ) {
          return null;
        }
        setSaveState("saving");
        setSaveMessage("");

        try {
          const response = await fetch(`/api/projects/${project.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const body = (await response.json()) as {
            error?: string;
            project?: EditableProject;
          };
          if (!response.ok || !body.project) {
            throw new Error(body.error || "Unable to save these changes.");
          }
          if (version !== requestVersionRef.current) return null;

          const payloadKey = snapshotKey(payload);
          const savedKey = snapshotKey(snapshot(body.project));
          const hasNewerEdits = latestSnapshotKeyRef.current !== payloadKey;
          if (!hasNewerEdits) {
            latestSnapshotKeyRef.current = savedKey;
          }
          setLastSavedKey(savedKey);
          setProject((current) =>
            snapshotKey(snapshot(current)) === payloadKey
              ? body.project!
              : {
                  ...current,
                  status: body.project!.status,
                  updatedAt: body.project!.updatedAt,
                  subscriberCount: body.project!.subscriberCount,
                },
          );
          setSaveState("saved");
          if (!hasNewerEdits) {
            void cleanupReplacedAssets(body.project);
          }
          return hasNewerEdits ? null : body.project;
        } catch (error) {
          if (version !== requestVersionRef.current) return null;
          setSaveState("error");
          setSaveMessage(
            error instanceof Error
              ? error.message
              : "Unable to save these changes.",
          );
          return null;
        }
      };

      const queued = saveQueueRef.current
        .catch(() => undefined)
        .then(execute);
      saveQueueRef.current = queued.then(
        () => undefined,
        () => undefined,
      );
      return queued;
    },
    [cleanupReplacedAssets, project.id],
  );

  useEffect(() => {
    if (currentKey === lastSavedKey) return;
    const payload = JSON.parse(currentKey) as EditorSnapshot;
    const timeout = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void persistSnapshot(payload);
    }, 700);
    autosaveTimerRef.current = timeout;

    return () => {
      window.clearTimeout(timeout);
      if (autosaveTimerRef.current === timeout) {
        autosaveTimerRef.current = null;
      }
    };
  }, [
    currentKey,
    lastSavedKey,
    persistSnapshot,
    saveAttempt,
  ]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty && saveState !== "saving") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty, saveState]);

  function undo() {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    const next = history[nextIndex];
    if (!next) return;
    setHistoryIndex(nextIndex);
    applySnapshot(next, false);
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const next = history[nextIndex];
    if (!next) return;
    setHistoryIndex(nextIndex);
    applySnapshot(next, false);
  }

  async function navigateToDashboard(
    event: MouseEvent<HTMLAnchorElement>,
  ) {
    event.preventDefault();
    if (isDirty) {
      const savedProject = await persistSnapshot(currentSnapshot);
      if (!savedProject) return;
    }
    router.push("/dashboard");
  }

  function selectAdjacentTab(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    const tabs: readonly EditorTab[] = ["content", "design", "settings"];
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    setTab(nextTab);
    document.getElementById(`editor-tab-${nextTab}`)?.focus();
  }

  async function togglePublish() {
    setPublishState("working");
    setSaveMessage("");
    try {
      if (isDirty) {
        const savedProject = await persistSnapshot(currentSnapshot);
        if (!savedProject) {
          throw new Error("Save the project before publishing.");
        }
      }

      const response = await fetch(`/api/projects/${project.id}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: project.status === "published" ? "unpublish" : "publish",
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        status?: ProjectStatus;
      };
      if (!response.ok || !body.status) {
        throw new Error(body.error || "Unable to change publication status.");
      }
      setProject((current) => ({ ...current, status: body.status! }));
      setPublishState("idle");
    } catch (error) {
      setPublishState("error");
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "Unable to change publication status.",
      );
    }
  }

  async function deleteProject() {
    const confirmed = window.confirm(
      `Delete ${project.name}? This permanently removes the project, its subscribers, and analytics.`,
    );
    if (!confirmed) return;

    setDeleteState("working");
    setSaveMessage("");
    editorClosedRef.current = true;
    requestVersionRef.current += 1;
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    try {
      await saveQueueRef.current;
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "Unable to delete this project.");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      editorClosedRef.current = false;
      setDeleteState("error");
      setSaveAttempt((current) => current + 1);
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete this project.",
      );
    }
  }

  async function uploadAsset(
    event: ChangeEvent<HTMLInputElement>,
    field: AssetFieldName,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const replacedUrl = project.content[field];
    setUploadingField(field);
    setUploadProgress(0);
    setSaveMessage("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("field", assetKindByField[field]);
      const uploadedUrl = await uploadProjectAsset(
        project.id,
        formData,
        setUploadProgress,
      );
      if (
        replacedUrl &&
        replacedUrl !== uploadedUrl &&
        replacedUrl.includes("/storage/v1/object/")
      ) {
        replacedAssetUrlsRef.current.push(replacedUrl);
      }
      updateProject((current) => ({
        ...current,
        content: { ...current.content, [field]: uploadedUrl },
      }));
    } catch (error) {
      setSaveState("error");
      setSaveMessage(
        error instanceof Error ? error.message : "Unable to upload that image.",
      );
    } finally {
      setUploadingField(null);
      setUploadProgress(null);
    }
  }

  function removeAsset(field: AssetFieldName) {
    const currentUrl = project.content[field];
    if (!currentUrl) return;
    if (currentUrl.includes("/storage/v1/object/")) {
      replacedAssetUrlsRef.current.push(currentUrl);
    }
    updateProject((current) => ({
      ...current,
      content: { ...current.content, [field]: null },
    }));
  }

  const publicUrl = `${siteUrl.replace(/\/$/, "")}/${project.slug}`;
  const publishBlockedByEmail =
    project.status !== "published" &&
    project.settings.requireEmailVerification &&
    !emailDeliveryAvailable;

  return (
    <main className="project-editor">
      <header className="editor-topbar">
        <div className="editor-project-heading">
          <Link
            className="editor-back"
            href="/dashboard"
            aria-label="Back to dashboard"
            onClick={navigateToDashboard}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <div>
            <span>
              {project.status === "published" ? "Published" : "Draft"} project
            </span>
            <strong>{project.name}</strong>
          </div>
        </div>

        <div className="editor-status" aria-live="polite">
          {saveState === "saving" ? "Saving..." : null}
          {saveState === "saved" ? (
            <>
              <Check size={14} aria-hidden="true" /> Saved
            </>
          ) : null}
          {saveState === "error" ? (
            <>
              Unable to save
              <button
                type="button"
                onClick={() => {
                  setSaveState("saving");
                  setSaveAttempt((current) => current + 1);
                }}
              >
                Retry
              </button>
            </>
          ) : null}
        </div>

        <div className="editor-actions">
          <button
            type="button"
            className="editor-icon-button"
            onClick={undo}
            disabled={historyIndex <= 0}
            aria-label="Undo"
          >
            <Undo2 size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="editor-icon-button"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            aria-label="Redo"
          >
            <Redo2 size={17} aria-hidden="true" />
          </button>
          <a
            className="editor-button secondary"
            href={`/preview/${project.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Preview
            <ExternalLink size={15} aria-hidden="true" />
          </a>
          {project.status === "published" ? (
            <a
              className="editor-button secondary editor-public-link"
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open live page
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ) : null}
          <button
            type="button"
            className="editor-button primary"
            onClick={togglePublish}
            disabled={publishState === "working" || publishBlockedByEmail}
            aria-describedby={
              publishBlockedByEmail ? "editor-publish-email-hint" : undefined
            }
          >
            {publishState === "working"
              ? "Working..."
              : project.status === "published"
                ? "Unpublish"
                : "Publish"}
          </button>
        </div>
      </header>

      {publishBlockedByEmail ? (
        <p
          className="editor-publish-hint"
          id="editor-publish-email-hint"
          role="status"
        >
          Publishing is paused. Turn off email confirmation or configure email
          delivery first.
        </p>
      ) : null}

      {saveMessage ? (
        <div className="editor-error-banner" role="alert">
          {saveMessage}
        </div>
      ) : null}

      <div className="editor-workspace">
        <aside className="editor-controls">
          <div className="editor-tabs" role="tablist" aria-label="Editor sections">
            {(["content", "design", "settings"] as const).map((value, index) => (
              <button
                key={value}
                id={`editor-tab-${value}`}
                type="button"
                role="tab"
                aria-selected={tab === value}
                aria-controls={`editor-panel-${value}`}
                tabIndex={tab === value ? 0 : -1}
                onClick={() => setTab(value)}
                onKeyDown={(event) => selectAdjacentTab(event, index)}
              >
                {value}
              </button>
            ))}
          </div>

          <div
            className="editor-panel"
            id={`editor-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`editor-tab-${tab}`}
            tabIndex={0}
          >
            {tab === "content" ? (
              <ContentControls
                project={project}
                updateProject={updateProject}
                uploadingField={uploadingField}
                uploadProgress={uploadProgress}
                onUpload={uploadAsset}
                onRemove={removeAsset}
              />
            ) : null}
            {tab === "design" ? (
              <DesignControls
                project={project}
                updateProject={updateProject}
              />
            ) : null}
            {tab === "settings" ? (
              <SettingsControls
                project={project}
                publicUrl={publicUrl}
                updateProject={updateProject}
                deleteState={deleteState}
                onDelete={deleteProject}
                emailDeliveryAvailable={emailDeliveryAvailable}
              />
            ) : null}
          </div>
        </aside>

        <section className="editor-preview-area" aria-label="Live preview">
          <div className="preview-toolbar">
            <span>Live preview</span>
            <div role="group" aria-label="Preview size">
              <button
                type="button"
                aria-pressed={previewMode === "desktop"}
                onClick={() => setPreviewMode("desktop")}
              >
                <Monitor size={16} aria-hidden="true" />
                Desktop
              </button>
              <button
                type="button"
                aria-pressed={previewMode === "mobile"}
                onClick={() => setPreviewMode("mobile")}
              >
                <Smartphone size={16} aria-hidden="true" />
                Mobile
              </button>
            </div>
          </div>
          <div className={`editor-preview-frame is-${previewMode}`}>
            <div className="editor-preview-document">
              <TemplateRenderer project={project} mode="editor" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionTitle({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <header className="editor-section-title">
      <h2>{title}</h2>
      <p>{copy}</p>
    </header>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="editor-field">
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

function ContentControls({
  project,
  updateProject,
  uploadingField,
  uploadProgress,
  onUpload,
  onRemove,
}: {
  project: EditableProject;
  updateProject: (updater: (current: EditorSnapshot) => EditorSnapshot) => void;
  uploadingField: AssetFieldName | null;
  uploadProgress: number | null;
  onUpload: (
    event: ChangeEvent<HTMLInputElement>,
    field: AssetFieldName,
  ) => void;
  onRemove: (field: AssetFieldName) => void;
}) {
  const updateContent = <Key extends keyof ProjectContent>(
    key: Key,
    value: ProjectContent[Key],
  ) =>
    updateProject((current) => ({
      ...current,
      content: { ...current.content, [key]: value },
    }));

  return (
    <div className="editor-control-stack">
      <SectionTitle
        title="Content"
        copy="Tell visitors what makes this launch worth following."
      />
      <Field label="Project name" hint={`${project.name.length}/80`}>
        <input
          value={project.name}
          maxLength={80}
          onChange={(event) =>
            updateProject((current) => ({
              ...current,
              name: event.target.value,
            }))
          }
        />
      </Field>
      <Field
        label="Product name"
        hint={`${(project.content.productName ?? "").length}/80`}
      >
        <input
          value={project.content.productName ?? ""}
          maxLength={80}
          placeholder={project.name}
          onChange={(event) => updateContent("productName", event.target.value)}
        />
      </Field>
      <Field label="Kicker" hint={`${project.content.kicker.length}/60`}>
        <input
          value={project.content.kicker}
          maxLength={60}
          onChange={(event) => updateContent("kicker", event.target.value)}
        />
      </Field>
      <Field label="Headline" hint={`${project.content.headline.length}/140`}>
        <textarea
          value={project.content.headline}
          maxLength={140}
          rows={4}
          onChange={(event) => updateContent("headline", event.target.value)}
        />
      </Field>
      <Field
        label="Description"
        hint={`${project.content.description.length}/400`}
      >
        <textarea
          value={project.content.description}
          maxLength={400}
          rows={5}
          onChange={(event) => updateContent("description", event.target.value)}
        />
      </Field>
      <Field
        label="CTA button"
        hint={`${project.content.buttonText.length}/60`}
      >
        <input
          value={project.content.buttonText}
          maxLength={60}
          onChange={(event) => updateContent("buttonText", event.target.value)}
        />
      </Field>
      <div className="editor-field-grid">
        <Field
          label="Success title"
          hint={`${project.content.successTitle.length}/100`}
        >
          <input
            value={project.content.successTitle}
            maxLength={100}
            onChange={(event) =>
              updateContent("successTitle", event.target.value)
            }
          />
        </Field>
        <Field
          label="Success message"
          hint={`${project.content.successMessage.length}/240`}
        >
          <textarea
            value={project.content.successMessage}
            maxLength={240}
            rows={3}
            onChange={(event) =>
              updateContent("successMessage", event.target.value)
            }
          />
        </Field>
      </div>
      <AssetField
        label="Logo"
        field="logoUrl"
        currentUrl={project.content.logoUrl}
        uploading={uploadingField === "logoUrl"}
        uploadProgress={
          uploadingField === "logoUrl" ? uploadProgress : null
        }
        onUpload={onUpload}
        onRemove={onRemove}
      />
      <AssetField
        label="Hero image"
        field="heroImageUrl"
        currentUrl={project.content.heroImageUrl}
        uploading={uploadingField === "heroImageUrl"}
        uploadProgress={
          uploadingField === "heroImageUrl" ? uploadProgress : null
        }
        onUpload={onUpload}
        onRemove={onRemove}
      />
      <AssetField
        label="Product screenshot"
        field="screenshotUrl"
        currentUrl={project.content.screenshotUrl}
        uploading={uploadingField === "screenshotUrl"}
        uploadProgress={
          uploadingField === "screenshotUrl" ? uploadProgress : null
        }
        onUpload={onUpload}
        onRemove={onRemove}
      />
      <AssetField
        label="Background image"
        field="backgroundImageUrl"
        currentUrl={project.content.backgroundImageUrl}
        uploading={uploadingField === "backgroundImageUrl"}
        uploadProgress={
          uploadingField === "backgroundImageUrl" ? uploadProgress : null
        }
        onUpload={onUpload}
        onRemove={onRemove}
      />
      <div className="social-links-editor">
        <div className="editor-field-heading">
          <span>Social links</span>
          <button
            type="button"
            disabled={project.content.socialLinks.length >= 5}
            onClick={() =>
              updateContent("socialLinks", [
                ...project.content.socialLinks,
                { platform: "Website", url: "https://" },
              ])
            }
          >
            Add link
          </button>
        </div>
        {project.content.socialLinks.map((link, index) => (
          <div className="social-link-row" key={index}>
            <input
              aria-label={`Social link ${index + 1} platform`}
              value={link.platform}
              maxLength={40}
              onChange={(event) => {
                const links = [...project.content.socialLinks];
                links[index] = { ...link, platform: event.target.value };
                updateContent("socialLinks", links);
              }}
            />
            <input
              aria-label={`Social link ${index + 1} URL`}
              value={link.url}
              maxLength={500}
              inputMode="url"
              onChange={(event) => {
                const links = [...project.content.socialLinks];
                links[index] = { ...link, url: event.target.value };
                updateContent("socialLinks", links);
              }}
            />
            <button
              type="button"
              aria-label={`Remove social link ${index + 1}`}
              onClick={() =>
                updateContent(
                  "socialLinks",
                  project.content.socialLinks.filter(
                    (_, linkIndex) => linkIndex !== index,
                  ),
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetField({
  label,
  field,
  currentUrl,
  uploading,
  uploadProgress,
  onUpload,
  onRemove,
}: {
  label: string;
  field: AssetFieldName;
  currentUrl: string | null;
  uploading: boolean;
  uploadProgress: number | null;
  onUpload: (
    event: ChangeEvent<HTMLInputElement>,
    field: AssetFieldName,
  ) => void;
  onRemove: (field: AssetFieldName) => void;
}) {
  return (
    <div className="asset-field">
      <div className="editor-field-heading">
        <span>{label}</span>
        {currentUrl ? (
          <button type="button" onClick={() => onRemove(field)}>
            Remove
          </button>
        ) : null}
      </div>
      <label className="asset-dropzone">
        {currentUrl ? (
          // Storage URLs are validated before persistence.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt={`${label} preview`} />
        ) : (
          <span>
            {field === "logoUrl" ? (
              <ImagePlus size={22} aria-hidden="true" />
            ) : (
              <Upload size={22} aria-hidden="true" />
            )}
            {uploading ? (
              <>
                {uploadProgress === null
                  ? "Uploading..."
                  : `Uploading ${uploadProgress}%`}
                <progress
                  max={100}
                  value={uploadProgress ?? undefined}
                  aria-label={`${label} upload progress`}
                />
              </>
            ) : (
              "Upload JPG, PNG, WebP, or AVIF (up to 5 MB)"
            )}
          </span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={uploading}
          onChange={(event) => onUpload(event, field)}
        />
      </label>
    </div>
  );
}

function DesignControls({
  project,
  updateProject,
}: {
  project: EditableProject;
  updateProject: (updater: (current: EditorSnapshot) => EditorSnapshot) => void;
}) {
  const updateTheme = <Key extends keyof ProjectTheme>(
    key: Key,
    value: ProjectTheme[Key],
  ) =>
    updateProject((current) => ({
      ...current,
      theme: { ...current.theme, [key]: value },
    }));

  return (
    <div className="editor-control-stack">
      <SectionTitle
        title="Design"
        copy="Choose a distinct starting point, then tune the details."
      />
      <fieldset className="template-picker">
        <legend>Template</legend>
        {TEMPLATE_IDS.map((templateId) => (
          <button
            key={templateId}
            type="button"
            aria-pressed={project.templateId === templateId}
            onClick={() =>
              updateProject((current) => ({
                ...current,
                templateId,
                theme: { ...TEMPLATE_THEME_PRESETS[templateId] },
              }))
            }
          >
            <span className={`template-thumbnail thumbnail-${templateId}`} />
            <span>
              <strong>{TEMPLATE_LABELS[templateId]}</strong>
              <small>{templateDescription(templateId)}</small>
            </span>
          </button>
        ))}
      </fieldset>
      <div className="editor-color-grid">
        <ColorField
          label="Background"
          value={project.theme.background}
          onChange={(value) => updateTheme("background", value)}
        />
        <ColorField
          label="Foreground"
          value={project.theme.foreground}
          onChange={(value) => updateTheme("foreground", value)}
        />
        <ColorField
          label="Muted text"
          value={project.theme.muted}
          onChange={(value) => updateTheme("muted", value)}
        />
        <ColorField
          label="Accent"
          value={project.theme.accent}
          onChange={(value) => updateTheme("accent", value)}
        />
      </div>
      <Field label="Font">
        <select
          value={project.theme.font}
          onChange={(event) =>
            updateTheme("font", event.target.value as ProjectTheme["font"])
          }
        >
          {approvedFonts.map((font) => (
            <option value={font.value} key={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Border radius" hint={`${project.theme.radius}px`}>
        <input
          type="range"
          min={0}
          max={36}
          step={1}
          value={project.theme.radius}
          onChange={(event) =>
            updateTheme("radius", Number(event.target.value))
          }
        />
      </Field>
      <SegmentedField label="Text alignment">
        {(["left", "center"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={project.theme.alignment === value}
            onClick={() => updateTheme("alignment", value)}
          >
            {value}
          </button>
        ))}
      </SegmentedField>
      <SegmentedField label="Button style">
        {(["solid", "outline", "soft", "glass"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={project.theme.buttonStyle === value}
            onClick={() => updateTheme("buttonStyle", value)}
          >
            {value}
          </button>
        ))}
      </SegmentedField>
      <SegmentedField label="Animation">
        {(["none", "subtle", "expressive"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={project.theme.animation === value}
            onClick={() => updateTheme("animation", value)}
          >
            {value}
          </button>
        ))}
      </SegmentedField>
    </div>
  );
}

function templateDescription(templateId: TemplateId) {
  const descriptions: Record<TemplateId, string> = {
    "minimal-beam": "Quiet and precise",
    kimchi: "Liquid glass",
    kevinora: "Warm editorial",
    spotbeam: "Product split",
    darkrai: "Cinematic dark",
  };
  return descriptions[templateId];
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="color-field">
      <legend>{label}</legend>
      <div>
        <input
          aria-label={`${label} color picker`}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          aria-label={`${label} hex value`}
          value={value}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </fieldset>
  );
}

function SegmentedField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="segmented-field">
      <legend>{label}</legend>
      <div>{children}</div>
    </fieldset>
  );
}

function SettingsControls({
  project,
  publicUrl,
  updateProject,
  deleteState,
  onDelete,
  emailDeliveryAvailable,
}: {
  project: EditableProject;
  publicUrl: string;
  updateProject: (updater: (current: EditorSnapshot) => EditorSnapshot) => void;
  deleteState: "idle" | "working" | "error";
  onDelete: () => void;
  emailDeliveryAvailable: boolean;
}) {
  const updateSettings = <Key extends keyof ProjectSettings>(
    key: Key,
    value: ProjectSettings[Key],
  ) =>
    updateProject((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value },
    }));

  return (
    <div className="editor-control-stack">
      <SectionTitle
        title="Settings"
        copy="Control the signup experience without adding unsafe custom code."
      />
      <Field
        label="Public slug"
        hint={
          project.status === "published"
            ? "Changing this breaks old links unless you add a redirect."
            : undefined
        }
      >
        <input
          value={project.slug}
          minLength={3}
          maxLength={40}
          spellCheck={false}
          onChange={(event) =>
            updateProject((current) => ({
              ...current,
              slug: normalizeSlug(event.target.value).slice(0, 40),
            }))
          }
        />
      </Field>
      <p className="editor-public-url">{publicUrl}</p>
      <ToggleField
        label="Show signup count"
        copy="Display the number of subscribers on the public page."
        checked={project.settings.showSignupCount}
        onChange={(value) => updateSettings("showSignupCount", value)}
      />
      <ToggleField
        label="Enable referrals"
        copy="Give subscribers a unique referral URL and milestone progress."
        checked={project.settings.referralsEnabled}
        onChange={(value) => updateSettings("referralsEnabled", value)}
      />
      <ToggleField
        label="Collect subscriber name"
        copy="Add an optional name field to the signup form."
        checked={project.settings.collectName}
        onChange={(value) => updateSettings("collectName", value)}
      />
      <ToggleField
        label="Require email confirmation"
        copy={
          emailDeliveryAvailable
            ? "Pending subscribers confirm by email before referral credit is awarded."
            : project.settings.requireEmailVerification
              ? "Turn this off before publishing, or configure Resend email delivery."
              : "Configure Resend email delivery before enabling confirmation."
        }
        checked={project.settings.requireEmailVerification}
        disabled={
          !emailDeliveryAvailable &&
          !project.settings.requireEmailVerification
        }
        onChange={(value) =>
          updateSettings("requireEmailVerification", value)
        }
      />
      <ToggleField
        label="Custom question"
        copy="Ask one short question after the email field."
        checked={Boolean(project.settings.customQuestion)}
        onChange={(value) =>
          updateSettings(
            "customQuestion",
            value ? { label: "What are you hoping to solve?", required: false } : null,
          )
        }
      />
      {project.settings.customQuestion ? (
        <div className="custom-question-settings">
          <Field
            label="Question"
            hint={`${project.settings.customQuestion.label.length}/120`}
          >
            <input
              value={project.settings.customQuestion.label}
              maxLength={120}
              onChange={(event) =>
                updateSettings("customQuestion", {
                  ...project.settings.customQuestion!,
                  label: event.target.value,
                })
              }
            />
          </Field>
          <ToggleField
            label="Required"
            copy="Visitors must answer before joining."
            checked={project.settings.customQuestion.required}
            onChange={(value) =>
              updateSettings("customQuestion", {
                ...project.settings.customQuestion!,
                required: value,
              })
            }
          />
        </div>
      ) : null}
      <Field label="Privacy policy URL">
        <input
          type="url"
          inputMode="url"
          value={project.settings.privacyUrl ?? ""}
          placeholder="https://example.com/privacy"
          onChange={(event) =>
            updateSettings("privacyUrl", event.target.value || null)
          }
        />
      </Field>
      <div className="editor-security-note">
        Custom HTML, JavaScript, and unrestricted CSS are intentionally disabled.
      </div>
      <section className="editor-danger-zone" aria-labelledby="danger-zone-title">
        <div>
          <strong id="danger-zone-title">Delete project</strong>
          <p>
            Permanently remove this project, its subscribers, and analytics.
            This action cannot be undone.
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteState === "working"}
        >
          {deleteState === "working" ? "Deleting..." : "Delete project"}
        </button>
      </section>
    </div>
  );
}

function ToggleField({
  label,
  copy,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  copy: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-field">
      <span>
        <strong>{label}</strong>
        <small>{copy}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
