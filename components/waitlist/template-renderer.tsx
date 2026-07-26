"use client";

import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import type {
  ProjectContent,
  ProjectSettings,
  ProjectTheme,
  TemplateId,
} from "@/lib/types";
import { TEMPLATE_THEME_PRESETS } from "@/lib/types";
import { TurnstileWidget } from "./turnstile-widget";
import "./waitlist.css";

export type WaitlistProject = {
  id: string;
  name: string;
  slug: string;
  templateId: TemplateId;
  content: ProjectContent;
  theme: ProjectTheme;
  settings: ProjectSettings;
  subscriberCount?: number;
};

type SignupResult = {
  alreadySubscribed: boolean;
  emailSent?: boolean;
  position: number;
  referralCount: number;
  referralUrl: string;
  status: "pending" | "subscribed";
};

type RendererMode = "editor" | "preview" | "public";

const templateComponents: Record<
  TemplateId,
  (props: TemplateFrameProps) => ReactNode
> = {
  "minimal-beam": MinimalBeamTemplate,
  kimchi: KimchiTemplate,
  kevinora: KevinoraTemplate,
  spotbeam: SpotbeamTemplate,
  darkrai: DarkraiTemplate,
};

const allowedTemplates = new Set<TemplateId>([
  "minimal-beam",
  "kimchi",
  "kevinora",
  "spotbeam",
  "darkrai",
]);

function safeTemplateId(templateId: string): TemplateId {
  return allowedTemplates.has(templateId as TemplateId)
    ? (templateId as TemplateId)
    : "kimchi";
}

function themesMatch(left: ProjectTheme, right: ProjectTheme) {
  return (
    left.background === right.background &&
    left.foreground === right.foreground &&
    left.muted === right.muted &&
    left.accent === right.accent &&
    left.font === right.font &&
    left.radius === right.radius &&
    left.alignment === right.alignment &&
    left.buttonStyle === right.buttonStyle &&
    left.animation === right.animation
  );
}

function getSessionId() {
  const key = "launchbeam-visitor";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing && /^[a-zA-Z0-9_-]{16,80}$/.test(existing)) return existing;
  } catch {
    // Some privacy modes disable persistent browser storage.
  }
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing && /^[a-zA-Z0-9_-]{16,80}$/.test(existing)) return existing;
  } catch {
    // Continue with a fresh identifier when session storage is unavailable.
  }
  const value = crypto.randomUUID().replace(/-/g, "");
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Session storage remains as a best-effort fallback.
  }
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // The in-memory value still identifies this request.
  }
  return value;
}

function referralCodeFromUrl(value: string) {
  try {
    return new URL(value).searchParams.get("ref") ?? undefined;
  } catch {
    return undefined;
  }
}

function readCampaignParameters() {
  const params = new URLSearchParams(window.location.search);
  return {
    referralCode: params.get("ref") ?? undefined,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  };
}

export function TemplateRenderer({
  project,
  mode = "public",
  turnstileSiteKey = null,
}: {
  project: WaitlistProject;
  mode?: RendererMode;
  turnstileSiteKey?: string | null;
}) {
  const templateId = safeTemplateId(project.templateId);
  const Template = templateComponents[templateId];
  const renderedProject = useMemo<WaitlistProject>(() => {
    const legacyDarkraiTheme =
      templateId === "darkrai" &&
      themesMatch(project.theme, TEMPLATE_THEME_PRESETS.kimchi);
    return {
      ...project,
      templateId,
      theme: legacyDarkraiTheme
        ? { ...TEMPLATE_THEME_PRESETS.darkrai }
        : project.theme,
    };
  }, [project, templateId]);
  const [result, setResult] = useState<SignupResult | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [turnstileToken, setTurnstileToken] = useState(
    turnstileSiteKey || process.env.NODE_ENV === "production"
      ? ""
      : "development-bypass",
  );
  const [state, setState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const setToken = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const campaignParameters = useMemo<ReturnType<typeof readCampaignParameters>>(
    () =>
      typeof window === "undefined"
        ? {
            referralCode: undefined,
            utmSource: undefined,
            utmMedium: undefined,
            utmCampaign: undefined,
          }
        : readCampaignParameters(),
    [],
  );

  const trackEvent = useCallback(
    (
      eventType: "page_view" | "referral_visit" | "share_click",
      metadata: Record<string, string> = {},
      referralCode = campaignParameters.referralCode,
    ) => {
      if (mode !== "public") return;
      const payload = JSON.stringify({
        eventType,
        sessionId: getSessionId(),
        referralCode,
        metadata,
      });
      const endpoint = `/api/public/${encodeURIComponent(project.slug)}/events`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          endpoint,
          new Blob([payload], { type: "application/json" }),
        );
        return;
      }
      void fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      });
    },
    [campaignParameters.referralCode, mode, project.slug],
  );

  useEffect(() => {
    if (mode !== "public") return;
    const viewKey = `launchbeam-view:${project.id}`;
    const now = Date.now();
    let previousView = 0;
    try {
      previousView = Number(window.sessionStorage.getItem(viewKey) ?? 0);
    } catch {
      // Tracking can proceed even when storage is restricted.
    }
    if (now - previousView < 1_500) return;
    try {
      window.sessionStorage.setItem(viewKey, String(now));
    } catch {
      // The effect still runs once per mount when storage is unavailable.
    }
    trackEvent("page_view", {
      referrer: document.referrer.slice(0, 500),
      utmSource: campaignParameters.utmSource ?? "",
      utmMedium: campaignParameters.utmMedium ?? "",
      utmCampaign: campaignParameters.utmCampaign ?? "",
    });
    if (campaignParameters.referralCode) {
      trackEvent("referral_visit");
    }
  }, [
    campaignParameters.referralCode,
    campaignParameters.utmCampaign,
    campaignParameters.utmMedium,
    campaignParameters.utmSource,
    mode,
    project.id,
    trackEvent,
  ]);

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode !== "public") {
      setMessage("The form is active on the published waitlist.");
      setState("error");
      return;
    }
    if (!turnstileToken) {
      setMessage("Complete the spam check before joining.");
      setState("error");
      return;
    }

    setState("submitting");
    setMessage("");
    try {
      const response = await fetch(
        `/api/public/${encodeURIComponent(project.slug)}/subscribe`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            name: project.settings.collectName ? name : undefined,
            customAnswer: project.settings.customQuestion
              ? customAnswer
              : undefined,
            turnstileToken,
            referralCode: campaignParameters.referralCode,
            sessionId: getSessionId(),
            utmSource: campaignParameters.utmSource,
            utmMedium: campaignParameters.utmMedium,
            utmCampaign: campaignParameters.utmCampaign,
          }),
        },
      );
      const body = (await response.json()) as
        | (SignupResult & { message?: string })
        | { error?: string };
      if (!response.ok || !("position" in body)) {
        throw new Error(
          "error" in body && body.error
            ? body.error
            : "We could not add you right now. Please try again.",
        );
      }
      setResult(body);
      setState("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not add you right now. Please try again.",
      );
      setState("error");
      setTurnstileToken(
        turnstileSiteKey || process.env.NODE_ENV === "production"
          ? ""
          : "development-bypass",
      );
      setTurnstileResetKey((current) => current + 1);
    }
  }

  async function copyReferralLink() {
    if (!result?.referralUrl) return;
    await navigator.clipboard.writeText(result.referralUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    trackEvent(
      "share_click",
      { channel: "copy" },
      referralCodeFromUrl(result.referralUrl),
    );
  }

  function share(channel: "x" | "whatsapp") {
    if (!result?.referralUrl) return;
    trackEvent(
      "share_click",
      { channel },
      referralCodeFromUrl(result.referralUrl),
    );
    const copy = `I joined the ${project.name} waitlist. Join me: ${result.referralUrl}`;
    const url =
      channel === "x"
        ? `https://x.com/intent/post?text=${encodeURIComponent(copy)}`
        : `https://wa.me/?text=${encodeURIComponent(copy)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const style = {
    "--waitlist-bg": renderedProject.theme.background,
    "--waitlist-fg": renderedProject.theme.foreground,
    "--waitlist-muted": renderedProject.theme.muted,
    "--waitlist-accent": renderedProject.theme.accent,
    "--waitlist-radius": `${renderedProject.theme.radius}px`,
    "--waitlist-align": renderedProject.theme.alignment,
  } as CSSProperties;

  const frameProps: TemplateFrameProps = {
    project: renderedProject,
    mode,
    style,
    signup:
      result && state === "success" ? (
        <SignupSuccess
          project={renderedProject}
          result={result}
          copied={copied}
          onCopy={copyReferralLink}
          onShare={share}
        />
      ) : (
        <SignupForm
          project={renderedProject}
          email={email}
          name={name}
          customAnswer={customAnswer}
          state={state}
          message={message}
          mode={mode}
          siteKey={turnstileSiteKey}
          turnstileResetKey={turnstileResetKey}
          onEmail={setEmail}
          onName={setName}
          onCustomAnswer={setCustomAnswer}
          onToken={setToken}
          onSubmit={submitSignup}
        />
      ),
  };

  return <>{Template(frameProps)}</>;
}

type TemplateFrameProps = {
  project: WaitlistProject;
  mode: RendererMode;
  style: CSSProperties;
  signup: ReactNode;
};

function Brand({ project }: { project: WaitlistProject }) {
  const { content } = project;
  return (
    <div className="waitlist-brand">
      {content.logoUrl ? (
        // User-controlled URLs are sanitized before storage.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={content.logoUrl} alt="" className="waitlist-logo-image" />
      ) : (
        <span className="waitlist-logo-fallback" aria-hidden="true">
          {project.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span>{content.productName || project.name}</span>
    </div>
  );
}

function HeroCopy({ project }: { project: WaitlistProject }) {
  return (
    <div
      className={`waitlist-copy waitlist-align-${project.theme.alignment}`}
      data-animation={project.theme.animation}
    >
      <p className="waitlist-kicker">{project.content.kicker}</p>
      <h1>{project.content.headline}</h1>
      <p className="waitlist-description">{project.content.description}</p>
    </div>
  );
}

function ProjectImage({
  project,
  framed = false,
}: {
  project: WaitlistProject;
  framed?: boolean;
}) {
  if (project.content.heroImageUrl) {
    return (
      <div className={`waitlist-product-visual ${framed ? "is-framed" : ""}`}>
        {/* User-controlled URLs are sanitized before storage. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={project.content.heroImageUrl}
          alt={`${project.name} product preview`}
        />
      </div>
    );
  }

  return (
    <div
      className={`waitlist-product-visual waitlist-placeholder ${
        framed ? "is-framed" : ""
      }`}
      aria-label={`${project.name} product preview placeholder`}
      role="img"
    >
      <div className="placeholder-browser-bar">
        <span />
        <span />
        <span />
      </div>
      <div className="placeholder-product-grid">
        <div />
        <div />
        <div />
      </div>
      <strong>{project.name}</strong>
    </div>
  );
}

function Footer({ project }: { project: WaitlistProject }) {
  return (
    <footer className="waitlist-footer">
      <div className="waitlist-socials" aria-label="Social links">
        {project.content.socialLinks.map((link) => (
          <a
            key={`${link.platform}-${link.url}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
          >
            {link.platform}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        ))}
      </div>
      <a href="/" target="_blank" rel="noreferrer">
        Powered by LaunchBeam
      </a>
    </footer>
  );
}

function MinimalBeamTemplate(props: TemplateFrameProps) {
  return (
    <main
      className="waitlist-page template-minimal-beam"
      style={props.style}
      data-font={props.project.theme.font}
      data-mode={props.mode}
      data-page-animation={props.project.theme.animation}
    >
      <div className="minimal-shell">
        <Brand project={props.project} />
        <section className="minimal-hero">
          <HeroCopy project={props.project} />
          <div className="waitlist-signup-panel">{props.signup}</div>
        </section>
        {props.project.content.heroImageUrl ? (
          <ProjectImage project={props.project} framed />
        ) : null}
        <Footer project={props.project} />
      </div>
    </main>
  );
}

function KimchiTemplate(props: TemplateFrameProps) {
  return (
    <main
      className="waitlist-page template-kimchi"
      style={props.style}
      data-font={props.project.theme.font}
      data-mode={props.mode}
      data-page-animation={props.project.theme.animation}
    >
      <div className="kimchi-glow glow-one" aria-hidden="true" />
      <div className="kimchi-glow glow-two" aria-hidden="true" />
      <div className="kimchi-shell">
        <Brand project={props.project} />
        <section className="kimchi-hero">
          <HeroCopy project={props.project} />
          {props.project.content.heroImageUrl ? (
            <ProjectImage project={props.project} />
          ) : null}
          <div className="waitlist-signup-panel glass-panel">{props.signup}</div>
        </section>
        <Footer project={props.project} />
      </div>
    </main>
  );
}

function KevinoraTemplate(props: TemplateFrameProps) {
  return (
    <main
      className="waitlist-page template-kevinora"
      style={props.style}
      data-font={props.project.theme.font}
      data-mode={props.mode}
      data-page-animation={props.project.theme.animation}
    >
      <div className="kevinora-shell">
        <Brand project={props.project} />
        <section className="kevinora-hero">
          <p className="kevinora-handwritten" aria-hidden="true">
            something worth waiting for
          </p>
          <HeroCopy project={props.project} />
          <div className="kevinora-rule" aria-hidden="true" />
          <div className="waitlist-signup-panel">{props.signup}</div>
        </section>
        <Footer project={props.project} />
      </div>
    </main>
  );
}

function SpotbeamTemplate(props: TemplateFrameProps) {
  return (
    <main
      className="waitlist-page template-spotbeam"
      style={props.style}
      data-font={props.project.theme.font}
      data-mode={props.mode}
      data-page-animation={props.project.theme.animation}
    >
      <div className="spotbeam-shell">
        <Brand project={props.project} />
        <section className="spotbeam-hero">
          <div className="spotbeam-content">
            <HeroCopy project={props.project} />
            <div className="waitlist-signup-panel">{props.signup}</div>
          </div>
          <ProjectImage project={props.project} framed />
        </section>
        <Footer project={props.project} />
      </div>
    </main>
  );
}

function DarkraiTemplate(props: TemplateFrameProps) {
  return (
    <main
      className="waitlist-page template-darkrai"
      style={props.style}
      data-font={props.project.theme.font}
      data-mode={props.mode}
      data-page-animation={props.project.theme.animation}
    >
      <div className="darkrai-orbit orbit-one" aria-hidden="true" />
      <div className="darkrai-orbit orbit-two" aria-hidden="true" />
      <div className="darkrai-shell">
        <Brand project={props.project} />
        <section className="darkrai-hero">
          <HeroCopy project={props.project} />
          <div className="waitlist-signup-panel dark-panel">{props.signup}</div>
        </section>
        <Footer project={props.project} />
      </div>
    </main>
  );
}

function SignupForm({
  project,
  email,
  name,
  customAnswer,
  state,
  message,
  mode,
  siteKey,
  turnstileResetKey,
  onEmail,
  onName,
  onCustomAnswer,
  onToken,
  onSubmit,
}: {
  project: WaitlistProject;
  email: string;
  name: string;
  customAnswer: string;
  state: "idle" | "submitting" | "success" | "error";
  message: string;
  mode: RendererMode;
  siteKey: string | null;
  turnstileResetKey: number;
  onEmail: (value: string) => void;
  onName: (value: string) => void;
  onCustomAnswer: (value: string) => void;
  onToken: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const isDark = project.templateId === "darkrai";
  return (
    <form className="public-signup-form" onSubmit={onSubmit} noValidate>
      {project.settings.collectName ? (
        <label>
          <span>Name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            value={name}
            onChange={(event) => onName(event.target.value)}
            placeholder="Your name"
          />
        </label>
      ) : null}
      <label>
        <span>Email address</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          placeholder="you@example.com"
          aria-describedby={message ? "waitlist-form-status" : undefined}
        />
      </label>
      {project.settings.customQuestion ? (
        <label>
          <span>{project.settings.customQuestion.label}</span>
          <textarea
            name="customAnswer"
            maxLength={500}
            required={project.settings.customQuestion.required}
            value={customAnswer}
            onChange={(event) => onCustomAnswer(event.target.value)}
            placeholder="Your answer"
          />
        </label>
      ) : null}
      {mode === "public" ? (
        <TurnstileWidget
          siteKey={siteKey}
          theme={isDark ? "dark" : "light"}
          resetKey={turnstileResetKey}
          onToken={onToken}
        />
      ) : (
        <p className="waitlist-preview-note" role="note">
          Signup activates on the published waitlist.
        </p>
      )}
      <button
        className={`waitlist-submit button-${project.theme.buttonStyle}`}
        type="submit"
        disabled={state === "submitting" || mode !== "public"}
      >
        {state === "submitting"
          ? "Joining..."
          : mode === "public"
            ? project.content.buttonText
            : `${project.content.buttonText} (preview)`}
      </button>
      {project.settings.privacyUrl ? (
        <p className="waitlist-privacy-copy">
          By joining, you agree to the project&apos;s{" "}
          <a href={project.settings.privacyUrl} target="_blank" rel="noreferrer">
            privacy policy
          </a>
          .
        </p>
      ) : null}
      {project.settings.showSignupCount &&
      typeof project.subscriberCount === "number" ? (
        <p className="waitlist-count">
          {project.subscriberCount.toLocaleString()} people have joined.
        </p>
      ) : null}
      <p
        id="waitlist-form-status"
        className={state === "error" ? "waitlist-field-error" : "sr-only"}
        role={state === "error" ? "alert" : "status"}
        aria-live="polite"
      >
        {message}
      </p>
    </form>
  );
}

function SignupSuccess({
  project,
  result,
  copied,
  onCopy,
  onShare,
}: {
  project: WaitlistProject;
  result: SignupResult;
  copied: boolean;
  onCopy: () => void;
  onShare: (channel: "x" | "whatsapp") => void;
}) {
  const milestones = [
    { count: 1, label: "Early supporter" },
    { count: 3, label: "Priority access" },
    { count: 5, label: "Founding member" },
  ];
  const nextMilestone = milestones.find(
    (milestone) => milestone.count > result.referralCount,
  );

  return (
    <section className="waitlist-success" aria-live="polite">
      <span className="success-icon" aria-hidden="true">
        <Check size={20} />
      </span>
      <p className="waitlist-kicker">
        {result.alreadySubscribed ? "Welcome back" : "You made it"}
      </p>
      <h2>{project.content.successTitle}</h2>
      <p>{project.content.successMessage}</p>
      <strong className="waitlist-position">
        You&apos;re #{result.position} on the waitlist.
      </strong>
      {result.status === "pending" ? (
        <p>
          {result.emailSent === false
            ? "Your place is pending, but the confirmation email could not be sent. Contact the project owner before sharing."
            : "Check your inbox to confirm your place before referral credit begins."}
        </p>
      ) : null}
      {project.settings.referralsEnabled ? (
        <>
          <p>Move up by inviting friends.</p>
          <div className="referral-link-row">
            <input
              aria-label="Your referral link"
              readOnly
              value={result.referralUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" onClick={onCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="share-actions">
            <button type="button" onClick={() => onShare("x")}>
              <Share2 size={16} aria-hidden="true" />
              Share on X
            </button>
            <button type="button" onClick={() => onShare("whatsapp")}>
              <MessageCircle size={16} aria-hidden="true" />
              WhatsApp
            </button>
          </div>
          {nextMilestone ? (
            <div className="referral-progress">
              <div>
                <span>{result.referralCount} referrals</span>
                <span>
                  {nextMilestone.count} for {nextMilestone.label}
                </span>
              </div>
              <progress
                value={result.referralCount}
                max={nextMilestone.count}
                aria-label={`Referral progress toward ${nextMilestone.label}`}
              />
            </div>
          ) : (
            <p className="referral-complete">
              Founding member milestone unlocked.
            </p>
          )}
        </>
      ) : null}
    </section>
  );
}
