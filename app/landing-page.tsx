"use client";

import type {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
} from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  ExternalLink,
  LayoutTemplate,
  Link2,
  Mail,
  Menu,
  Monitor,
  MousePointer2,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { LaunchBeamLogo } from "@/components/launchbeam-logo";
import type { TemplateId } from "@/lib/types";

type StudioTab = "page" | "design" | "analytics";
type PreviewMode = "desktop" | "mobile";
type ButtonStyle = "solid" | "outline" | "soft";
type AnalyticsTab = "overview" | "sources" | "referrals";

const studioTabs = ["page", "design", "analytics"] as const;
const analyticsTabs = ["overview", "sources", "referrals"] as const;

function handleTabKeyDown<Tab extends string>(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  tabs: readonly Tab[],
  activeTab: Tab,
  setActiveTab: (tab: Tab) => void,
  idPrefix: string,
) {
  let nextIndex: number | null = null;
  const activeIndex = tabs.indexOf(activeTab);
  if (event.key === "ArrowRight") nextIndex = (activeIndex + 1) % tabs.length;
  if (event.key === "ArrowLeft") {
    nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
  }
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  if (nextIndex === null) return;

  event.preventDefault();
  const nextTab = tabs[nextIndex];
  setActiveTab(nextTab);
  document.getElementById(`${idPrefix}-${nextTab}`)?.focus();
}

const campaign = {
  startup: "Kimchi",
  slug: "kimchi",
  logo: "K",
  headline: "Research that finds the signal in customer conversations.",
  description:
    "Kimchi turns interviews and support calls into clear product decisions.",
  visitors: 4260,
  signups: 1108,
  conversion: "26.0%",
  referralSignups: 312,
  referralRate: "28.2%",
  dailyGrowth: "+8.4%",
  demandScore: 78,
} as const;

const weeklySignups = [64, 68, 72, 76, 80, 86, 96] as const;
const weeklySignupTotal = weeklySignups.reduce((total, value) => total + value, 0);

const trafficSources = [
  { label: "X / Twitter", count: 1640 },
  { label: "Product Hunt", count: 1210 },
  { label: "Founder communities", count: 830 },
  { label: "Direct", count: 580 },
] as const;

const referrers = [
  { name: "ava@fieldnotes.co", referrals: 36 },
  { name: "kai@launchkit.dev", referrals: 24 },
  { name: "nora@solo.ai", referrals: 18 },
  { name: "Other subscribers", referrals: 234 },
] as const;

const templates: Array<{
  id: TemplateId;
  label: string;
  description: string;
}> = [
  {
    id: "minimal-beam",
    label: "Minimal Beam",
    description: "Quiet and precise",
  },
  { id: "kimchi", label: "Kimchi", description: "Soft liquid-glass depth" },
  {
    id: "kevinora",
    label: "Kevinora",
    description: "Warm editorial detail",
  },
  {
    id: "spotbeam",
    label: "Spotbeam",
    description: "Product-first split",
  },
  { id: "darkrai", label: "Darkrai", description: "Cinematic contrast" },
];

const navLinks = [
  { label: "Product", href: "#demo" },
  { label: "Analytics", href: "#analytics" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

const featureItems = [
  {
    icon: MousePointer2,
    title: "Waitlist page builder",
    copy: "Create, customize, preview, and publish a polished page from one shared editor.",
    status: "Available",
  },
  {
    icon: BarChart3,
    title: "Demand Score",
    copy: "Bring conversion and referral signals into one decision-friendly score.",
    status: "Available",
  },
  {
    icon: Link2,
    title: "Referral attribution",
    copy: "Give every subscriber a unique link and connect invited signups to the right referrer.",
    status: "Available",
  },
  {
    icon: Users,
    title: "Positions and rewards",
    copy: "Let subscribers see their place and progress toward referral milestones.",
    status: "Available",
  },
  {
    icon: Mail,
    title: "Subscriber export",
    copy: "Export the audience you build before moving into your launch stack.",
    status: "Available",
  },
  {
    icon: LayoutTemplate,
    title: "Five responsive templates",
    copy: "Start with Kimchi, Minimal Beam, Kevinora, Spotbeam, or Darkrai and keep your campaign content when you switch.",
    status: "Available",
  },
] as const;

const plans = [
  {
    id: "free",
    name: "Free",
    price: "Free",
    description: "For validating your next idea.",
    recommended: true,
    features: [
      "Create and publish waitlist projects",
      "Real subscriber collection",
      "Referral tracking and positions",
      "Five responsive templates",
      "Analytics and Demand Score",
      "CSV export",
      "LaunchBeam branding",
    ],
  },
] as const;

const faqs = [
  {
    question: "Can I use my own domain?",
    answer:
      "Not yet. Published projects currently use a shareable launchbeam.vercel.app/[slug] address.",
  },
  {
    question: "Can I export my subscriber data?",
    answer:
      "Yes. Project owners can search and filter subscribers, then download a server-generated CSV with safe spreadsheet escaping.",
  },
  {
    question: "How does referral tracking work?",
    answer:
      "Every subscriber receives a unique project-specific link. Valid referred signups move the referrer toward clear one-, three-, and five-referral milestones.",
  },
  {
    question: "Are billing-based usage limits enforced?",
    answer:
      "No. The current release does not include paid tiers or billing-based project and subscriber limits.",
  },
  {
    question: "Can I remove LaunchBeam branding?",
    answer:
      "LaunchBeam branding remains on public waitlist pages in the current release.",
  },
  {
    question: "What happens if I cancel?",
    answer:
      "There is no paid subscription to cancel. You can export your subscriber list and manage your project from the dashboard.",
  },
] as const;

export function LandingPage({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const accountHref = isAuthenticated ? "/dashboard" : "/signup";
  const accountLabel = isAuthenticated ? "Open dashboard" : "Create your waitlist";

  useLayoutEffect(() => {
    document.documentElement.classList.add("motion-ready");
    return () => document.documentElement.classList.remove("motion-ready");
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const menu = mobileMenuRef.current;
    const focusable = menu?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled])',
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus();
    document.body.classList.add("menu-open");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        window.setTimeout(() => menuButtonRef.current?.focus(), 0);
        return;
      }
      if (event.key !== "Tab" || !first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const heroVisual = document.querySelector<HTMLElement>(".hero-visual");
    if (!heroVisual) return;

    const motionQuery = window.matchMedia(
      "(min-width: 961px) and (prefers-reduced-motion: no-preference)",
    );
    let frame = 0;

    const update = () => {
      frame = 0;
      if (!motionQuery.matches) {
        heroVisual.style.removeProperty("--hero-parallax");
        return;
      }

      const progress = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
      heroVisual.style.setProperty("--hero-parallax", `${Math.round(progress * -12)}px`);
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    motionQuery.addEventListener("change", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      motionQuery.removeEventListener("change", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
      heroVisual.style.removeProperty("--hero-parallax");
    };
  }, []);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navigation
        isScrolled={isScrolled}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        menuButtonRef={menuButtonRef}
        mobileMenuRef={mobileMenuRef}
        accountHref={accountHref}
        accountLabel={accountLabel}
      />
      <main id="main-content" tabIndex={-1}>
        <HeroSection accountHref={accountHref} accountLabel={accountLabel} />
        <InsightsSection />
        <FeaturesSection />
        <PricingSection accountHref={accountHref} accountLabel={accountLabel} />
        <FaqSection />
        <FinalCta accountHref={accountHref} accountLabel={accountLabel} />
      </main>
      <Footer isAuthenticated={isAuthenticated} />
    </div>
  );
}

function Navigation({
  isScrolled,
  isMenuOpen,
  setIsMenuOpen,
  menuButtonRef,
  mobileMenuRef,
  accountHref,
  accountLabel,
}: {
  isScrolled: boolean;
  isMenuOpen: boolean;
  setIsMenuOpen: (value: boolean) => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  mobileMenuRef: RefObject<HTMLDivElement | null>;
  accountHref: string;
  accountLabel: string;
}) {
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={`site-header ${isScrolled ? "is-scrolled" : ""}`}>
      <nav className="glass-nav" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="LaunchBeam home">
          <LaunchBeamLogo />
        </a>

        <div className="nav-links" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="nav-actions">
          <ActionLink href={accountHref} size="small">
            {accountLabel}
          </ActionLink>
        </div>

        <button
          ref={menuButtonRef}
          className="menu-toggle"
          type="button"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </nav>

      {isMenuOpen ? (
        <>
          <button
            type="button"
            className="mobile-menu-backdrop"
            aria-label="Close navigation menu"
            tabIndex={-1}
            onClick={closeMenu}
          />
          <div
            id="mobile-navigation"
            ref={mobileMenuRef}
            className="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={closeMenu}>
                {link.label}
              </a>
            ))}
            <ActionLink href={accountHref}>
              {accountLabel}
            </ActionLink>
          </div>
        </>
      ) : null}
    </header>
  );
}

function HeroSection({
  accountHref,
  accountLabel,
}: {
  accountHref: string;
  accountLabel: string;
}) {
  return (
    <section className="hero-section" id="top">
      <div className="section-inner hero-inner">
        <div className="hero-copy" data-hero-sequence>
          <h1>Build an audience before you launch.</h1>
          <div className="hero-actions">
            <ActionLink href={accountHref}>
              {accountLabel}
            </ActionLink>
            <a className="button secondary" href="#demo">
              <span>Try the interactive demo</span>
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <ProductStudio />
        </div>
      </div>
    </section>
  );
}

function ProductStudio() {
  const [activeTab, setActiveTab] = useState<StudioTab>("page");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [templateId, setTemplateId] = useState<TemplateId>("kimchi");
  const [buttonStyle, setButtonStyle] = useState<ButtonStyle>("solid");
  const [headline, setHeadline] = useState<string>(campaign.headline);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  useEffect(() => {
    if (saveState !== "saving") return;
    const timeout = window.setTimeout(() => setSaveState("saved"), 350);
    return () => window.clearTimeout(timeout);
  }, [headline, templateId, buttonStyle, previewMode, saveState]);

  const markChanged = () => setSaveState("saving");

  return (
    <div id="demo" className="product-stage" data-reveal="scale">
      <BrowserMockup title={`${campaign.startup} campaign`} className="studio-window">
        <div className="studio-toolbar">
          <div className="studio-tabs" role="tablist" aria-label="Campaign workspace">
            <StudioTabButton
              label="Page"
              icon={MousePointer2}
              isActive={activeTab === "page"}
              onClick={() => setActiveTab("page")}
              onKeyDown={(event) =>
                handleTabKeyDown(
                  event,
                  studioTabs,
                  activeTab,
                  setActiveTab,
                  "studio-tab",
                )
              }
            />
            <StudioTabButton
              label="Design"
              icon={LayoutTemplate}
              isActive={activeTab === "design"}
              onClick={() => setActiveTab("design")}
              onKeyDown={(event) =>
                handleTabKeyDown(
                  event,
                  studioTabs,
                  activeTab,
                  setActiveTab,
                  "studio-tab",
                )
              }
            />
            <StudioTabButton
              label="Analytics"
              icon={BarChart3}
              isActive={activeTab === "analytics"}
              onClick={() => setActiveTab("analytics")}
              onKeyDown={(event) =>
                handleTabKeyDown(
                  event,
                  studioTabs,
                  activeTab,
                  setActiveTab,
                  "studio-tab",
                )
              }
            />
          </div>

          <div className="studio-toolbar-right">
            <div className="preview-toggle" aria-label="Preview size">
              <IconToggle
                label="Desktop preview"
                icon={Monitor}
                isActive={previewMode === "desktop"}
                onClick={() => {
                  setPreviewMode("desktop");
                  markChanged();
                }}
              />
              <IconToggle
                label="Mobile preview"
                icon={Smartphone}
                isActive={previewMode === "mobile"}
                onClick={() => {
                  setPreviewMode("mobile");
                  markChanged();
                }}
              />
            </div>
            <span className={`draft-status ${saveState}`} aria-live="polite">
              {saveState === "saving" ? "Updating preview" : "Interactive demo"}
            </span>
          </div>
        </div>

        <div className="studio-body">
          <aside
            className="studio-controls"
            id="studio-panel"
            role="tabpanel"
            aria-labelledby={`studio-tab-${activeTab}`}
            aria-label="Campaign controls"
          >
            {activeTab === "page" ? (
              <div className="control-group">
                <div className="control-heading">
                  <span>Campaign copy</span>
                  <small>Live demo</small>
                </div>
                <label className="form-control" htmlFor="studio-headline">
                  <span>Headline</span>
                  <textarea
                    id="studio-headline"
                    value={headline}
                    rows={4}
                    onChange={(event) => {
                      setHeadline(event.target.value);
                      markChanged();
                    }}
                  />
                </label>
                <div className="campaign-identity">
                  <span className="campaign-logo" aria-hidden="true">{campaign.logo}</span>
                  <div>
                    <strong>{campaign.startup}</strong>
                    <span>launchbeam.vercel.app/{campaign.slug}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "design" ? (
              <div className="control-group">
                <div className="control-heading">
                  <span>Template</span>
                  <small>Five responsive directions</small>
                </div>
                <div className="template-options">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={templateId === template.id ? "is-active" : ""}
                      aria-pressed={templateId === template.id}
                      onClick={() => {
                        setTemplateId(template.id);
                        markChanged();
                      }}
                    >
                      <span className={`template-swatch ${template.id}`} aria-hidden="true" />
                      <span>
                        <strong>{template.label}</strong>
                        <small>{template.description}</small>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="control-heading button-heading">
                  <span>Button style</span>
                </div>
                <div className="button-style-options" aria-label="Waitlist button style">
                  {(["solid", "outline", "soft"] as ButtonStyle[]).map((style) => (
                    <button
                      key={style}
                      type="button"
                      className={buttonStyle === style ? "is-active" : ""}
                      aria-pressed={buttonStyle === style}
                      onClick={() => {
                        setButtonStyle(style);
                        markChanged();
                      }}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "analytics" ? (
              <div className="control-group studio-data-summary">
                <div className="control-heading">
                  <span>Campaign signals</span>
                  <small>Example campaign data</small>
                </div>
                <div className="mini-score">
                  <span>Demand Score</span>
                  <strong>{campaign.demandScore}</strong>
                  <small>Strong early interest</small>
                </div>
                <p>Analytics shown here are simulated and do not represent LaunchBeam customers.</p>
              </div>
            ) : null}
          </aside>

          <div className="studio-canvas">
            {activeTab === "analytics" ? (
              <StudioAnalytics />
            ) : (
              <WaitlistPreview
                previewMode={previewMode}
                templateId={templateId}
                buttonStyle={buttonStyle}
                headline={headline}
              />
            )}
          </div>
        </div>
      </BrowserMockup>
    </div>
  );
}

function StudioTabButton({
  label,
  icon: Icon,
  isActive,
  onClick,
  onKeyDown,
}: {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      id={`studio-tab-${label.toLowerCase()}`}
      role="tab"
      aria-selected={isActive}
      aria-controls="studio-panel"
      className={isActive ? "is-active" : ""}
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function IconToggle({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      className={isActive ? "is-active" : ""}
      onClick={onClick}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

function WaitlistPreview({
  previewMode,
  templateId,
  buttonStyle,
  headline,
}: {
  previewMode: PreviewMode;
  templateId: TemplateId;
  buttonStyle: ButtonStyle;
  headline: string;
}) {
  return (
    <div className={`preview-viewport ${previewMode}`}>
      <div className={`waitlist-live template-${templateId}`}>
        {templateId === "spotbeam" ? (
          <div className="product-graphic" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        <div className="waitlist-content">
          <div className="preview-brand-row">
            <span className="campaign-logo" aria-hidden="true">{campaign.logo}</span>
            <span>{campaign.startup}</span>
          </div>
          <p className="waitlist-kicker">Private beta</p>
          <p className="preview-headline">{headline || "Add a campaign headline"}</p>
          <p>{campaign.description}</p>
          <PreviewSignupForm buttonStyle={buttonStyle} />
          <div className="example-proof">
            <span>Example campaign data</span>
            <strong>{campaign.signups.toLocaleString("en-US")} signups</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewSignupForm({ buttonStyle }: { buttonStyle: ButtonStyle }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    setStatus(isValid ? "success" : "error");
  };

  return (
    <div className="signup-demo">
      <span className="example-form-label">Interactive demo form</span>
      <form className="preview-signup" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="kimchi-preview-email">
          Example subscriber email
        </label>
        <input
          id="kimchi-preview-email"
          type="email"
          autoComplete="off"
          placeholder="you@company.com"
          value={email}
          aria-invalid={status === "error"}
          aria-describedby="kimchi-preview-status"
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle") setStatus("idle");
          }}
        />
        <button type="submit" className={`preview-submit ${buttonStyle}`}>
          {status === "success" ? "Preview complete" : "Join the waitlist"}
        </button>
      </form>
      <p
        id="kimchi-preview-status"
        className={`form-status ${status}`}
        aria-live="polite"
      >
        {status === "error"
          ? "Enter a valid email address."
          : status === "success"
            ? "Demo complete. This example did not submit your email."
            : "Demo only — the address stays in this browser."}
      </p>
    </div>
  );
}

function StudioAnalytics() {
  return (
    <div className="studio-analytics">
      <div className="analytics-preview-header">
        <div>
          <span>Example campaign data</span>
          <p className="analytics-preview-title">{campaign.startup} overview</p>
        </div>
        <strong>{campaign.demandScore}<small>/100</small></strong>
      </div>
      <div className="studio-metrics">
        <CompactMetric label="Visitors" value={campaign.visitors.toLocaleString("en-US")} />
        <CompactMetric label="Signups" value={campaign.signups.toLocaleString("en-US")} />
        <CompactMetric label="Conversion" value={campaign.conversion} />
        <CompactMetric label="Referrals" value={campaign.referralSignups.toLocaleString("en-US")} />
      </div>
      <SignupChart compact />
    </div>
  );
}

function InsightsSection() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");

  return (
    <section className="insights-section">
      <div className="section-inner" id="analytics">
        <SectionHeading
          kicker="Demand and analytics"
          title="Know when your idea is working."
          copy="LaunchBeam turns conversion and referral activity into one clear launch signal. The Kimchi numbers below are simulated example campaign data, not customer results."
        />

        <div className="insights-dashboard" data-reveal="scale">
          <div className="demand-panel">
            <span className="data-label">Example campaign data</span>
            <div className="score-value">
              <strong>{campaign.demandScore}</strong>
              <span>/100</span>
            </div>
            <h3>Strong early interest</h3>
            <p>
              Your conversion and referral activity suggest strong early demand.
              Continue collecting signups before committing to a full launch.
            </p>
            <div className="score-signal">
              <span>Referral share</span>
              <strong>{campaign.referralRate}</strong>
            </div>
          </div>

          <div className="analytics-panel">
            <div className="analytics-tabs" role="tablist" aria-label="Analytics details">
              {analyticsTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  id={`analytics-tab-${tab}`}
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`analytics-${tab}`}
                  className={activeTab === tab ? "is-active" : ""}
                  tabIndex={activeTab === tab ? 0 : -1}
                  onClick={() => setActiveTab(tab)}
                  onKeyDown={(event) =>
                    handleTabKeyDown(
                      event,
                      analyticsTabs,
                      activeTab,
                      setActiveTab,
                      "analytics-tab",
                    )
                  }
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === "overview" ? (
              <div
                id="analytics-overview"
                className="analytics-tab-panel"
                role="tabpanel"
                aria-labelledby="analytics-tab-overview"
              >
                <div className="primary-metrics">
                  <CompactMetric label="Visitors" value={campaign.visitors.toLocaleString("en-US")} />
                  <CompactMetric label="Signups" value={campaign.signups.toLocaleString("en-US")} />
                  <CompactMetric label="Conversion" value={campaign.conversion} />
                  <CompactMetric label="Referral signups" value={campaign.referralSignups.toLocaleString("en-US")} />
                </div>
                <SignupChart />
              </div>
            ) : null}

            {activeTab === "sources" ? (
              <div
                id="analytics-sources"
                className="analytics-tab-panel"
                role="tabpanel"
                aria-labelledby="analytics-tab-sources"
              >
                <div className="analytics-list">
                  {trafficSources.map((source) => {
                    const percentage = (source.count / campaign.visitors) * 100;
                    return (
                      <div className="analytics-row" key={source.label}>
                        <div>
                          <span>{source.label}</span>
                          <strong>{source.count.toLocaleString("en-US")}</strong>
                        </div>
                        <div className="row-bar" aria-hidden="true">
                          <span style={{ width: `${percentage}%` }} />
                        </div>
                        <small>{percentage.toFixed(1)}%</small>
                      </div>
                    );
                  })}
                </div>
                <p className="analytics-footnote">
                  Source visits total {campaign.visitors.toLocaleString("en-US")}.
                </p>
              </div>
            ) : null}

            {activeTab === "referrals" ? (
              <div
                id="analytics-referrals"
                className="analytics-tab-panel"
                role="tabpanel"
                aria-labelledby="analytics-tab-referrals"
              >
                <div className="referral-summary">
                  <span>Referral signups</span>
                  <strong>{campaign.referralSignups}</strong>
                  <small>{campaign.referralRate} of all signups</small>
                </div>
                <div className="referrer-table">
                  {referrers.map((referrer) => (
                    <div key={referrer.name}>
                      <span>{referrer.name}</span>
                      <strong>{referrer.referrals}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="compact-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SignupChart({ compact = false }: { compact?: boolean }) {
  const max = Math.max(...weeklySignups);
  return (
    <div className={`signup-chart-wrap ${compact ? "compact" : ""}`}>
      <div className="chart-heading">
        <div>
          <span>Signups this week</span>
          <strong>{weeklySignupTotal}</strong>
        </div>
        <span>{campaign.dailyGrowth} vs prior week</span>
      </div>
      <div
        className="signup-chart"
        role="img"
        aria-label="Daily example signups this week: 64, 68, 72, 76, 80, 86, and 96"
      >
        {weeklySignups.map((value, index) => (
          <span key={`${value}-${index}`} style={{ height: `${(value / max) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="features-section">
      <div className="section-inner feature-layout" id="features">
        <SectionHeading
          kicker="Product"
          title="The launch essentials, without the noise."
          copy="The interactive Kimchi studio above is a clearly marked demo; signed-in projects use real subscribers, referrals, analytics, publishing, and exports."
        />
        <div className="feature-list" data-reveal="group">
          {featureItems.map((feature) => (
            <FeatureItem key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  copy,
  status,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
  status: string;
}) {
  return (
    <article className="feature-item">
      <Icon size={20} aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
      <span>{status}</span>
    </article>
  );
}

function PricingSection({
  accountHref,
  accountLabel,
}: {
  accountHref: string;
  accountLabel: string;
}) {
  return (
    <section className="pricing-section">
      <div className="section-inner" id="pricing">
        <SectionHeading
          align="center"
          kicker="Pricing"
          title="Start building today."
          copy="Build and publish your first waitlist with the tools available today. No card required."
        />
        <div className="pricing-grid" data-reveal="group">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              href={accountHref}
              ctaLabel={accountLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  href,
  ctaLabel,
}: {
  plan: (typeof plans)[number];
  href: string;
  ctaLabel: string;
}) {
  return (
    <div className={`pricing-card ${plan.recommended ? "recommended" : ""}`}>
      <div className="pricing-card-head">
        <div>
          <h3>{plan.name}</h3>
          <p>{plan.description}</p>
        </div>
        {plan.recommended ? <span>Recommended</span> : null}
      </div>
      <div className="price-row">
        <strong>{plan.price}</strong>
      </div>
      <ActionLink
        href={href}
        variant={plan.recommended ? "primary" : "secondary"}
      >
        {ctaLabel}
      </ActionLink>
      <div className="plan-features">
        {plan.features.map((feature) => (
          <div key={feature}>
            <Check size={16} aria-hidden="true" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpenIndex(openIndex === index ? null : index);
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % faqs.length;
    if (event.key === "ArrowUp") nextIndex = (index - 1 + faqs.length) % faqs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = faqs.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <section className="faq-section">
      <div className="section-inner faq-layout" id="faq">
        <SectionHeading
          kicker="FAQ"
          title="Six honest answers."
          copy="Clear details about the product limits and workflows available today."
        />
        <div className="faq-list" data-reveal="group">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            const triggerId = `faq-trigger-${index}`;
            const panelId = `faq-panel-${index}`;
            return (
              <div className={`faq-item ${isOpen ? "is-open" : ""}`} key={item.question}>
                <h3>
                  <button
                    ref={(element) => {
                      buttonRefs.current[index] = element;
                    }}
                    id={triggerId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                  >
                    <span>{item.question}</span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  hidden={!isOpen}
                  className="faq-answer"
                >
                  <p>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta({
  accountHref,
  accountLabel,
}: {
  accountHref: string;
  accountLabel: string;
}) {
  return (
    <section className="final-cta-section">
      <div className="section-inner final-cta" data-reveal="scale">
        <div>
          <span>Start free</span>
          <h2>Create the audience your launch deserves.</h2>
          <p>Start with a focused waitlist and a clearer signal before you build.</p>
        </div>
        <ActionLink href={accountHref}>
          {accountLabel}
        </ActionLink>
      </div>
    </section>
  );
}

function Footer({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <footer className="site-footer">
      <div className="section-inner footer-inner">
        <a className="brand" href="#top" aria-label="LaunchBeam home">
          <LaunchBeamLogo />
        </a>
        <nav className="footer-links" aria-label="Footer navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href={isAuthenticated ? "/dashboard" : "/login"}>
            {isAuthenticated ? "Dashboard" : "Login"}
          </Link>
        </nav>
        <p>Built for indie founders validating what comes next.</p>
      </div>
    </footer>
  );
}

function ActionLink({
  children,
  href,
  variant = "primary",
  size = "normal",
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
  size?: "normal" | "small";
}) {
  return (
    <Link className={`button ${variant} ${size}`} href={href}>
      <span>{children}</span>
      <ArrowRight size={size === "small" ? 16 : 17} aria-hidden="true" />
    </Link>
  );
}

function BrowserMockup({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`browser-frame ${className}`}>
      <div className="browser-topbar">
        <div className="window-controls" aria-hidden="true">
          <span className="window-control window-control-close" />
          <span className="window-control window-control-minimize" />
          <span className="window-control window-control-fullscreen" />
        </div>
        <div className="browser-title">{title}</div>
        <ExternalLink size={15} aria-hidden="true" />
      </div>
      <div className="browser-content">{children}</div>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  copy,
  align = "left",
}: {
  kicker: string;
  title: string;
  copy: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`section-heading align-${align}`} data-reveal="heading">
      <span className="section-kicker">{kicker}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}
