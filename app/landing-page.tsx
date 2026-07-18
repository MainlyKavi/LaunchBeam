"use client";

import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Code2,
  Download,
  ExternalLink,
  Globe2,
  Layers3,
  LineChart,
  Link2,
  Mail,
  Menu,
  MousePointer2,
  Palette,
  Play,
  ShieldCheck,
  Smartphone,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ThemeName = "paper" | "graphite" | "soft";
type FontName = "Montserrat" | "Serif" | "Mono";

type BuilderState = {
  startup: string;
  headline: string;
  description: string;
  button: string;
  launchDate: string;
  accent: string;
  theme: ThemeName;
  font: FontName;
};

type Template = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  accent: string;
  background: string;
  metric: string;
};

type Brand = {
  id: string;
  label: string;
  accent: string;
  background: string;
  font: FontName;
  button: string;
};

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
];

const signInHref = "/signin-with-chatgpt?return_to=/";

function planSignupHref(plan: string) {
  const returnTo = `/?plan=${plan.toLowerCase()}#product`;
  return `/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`;
}

const freeSignupHref = planSignupHref("free");

const footerLinks = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Changelog" },
  { label: "Help" },
  { label: "Privacy" },
  { label: "Terms" },
  { label: "X/Twitter" },
  { label: "GitHub" },
];

const templates: Template[] = [
  {
    id: "ai",
    label: "AI SaaS",
    eyebrow: "Private beta",
    title: "Your AI research assistant for product teams.",
    description:
      "Join the waitlist for research summaries, customer insights, and launch notes generated from your product data.",
    cta: "Request access",
    accent: "#111111",
    background: "linear-gradient(145deg, #FAFAFA, #E8E8E8)",
    metric: "2,848 signups · 15.5% conversion",
  },
  {
    id: "mobile",
    label: "Mobile app",
    eyebrow: "Launching on iOS",
    title: "A calmer way to plan your week from your phone.",
    description:
      "Get early access to the pocket planning app that turns scattered notes into a clean daily rhythm.",
    cta: "Join early access",
    accent: "#666666",
    background: "linear-gradient(145deg, #F2F2F2, #FAFAFA)",
    metric: "2,848 signups · 15.5% conversion",
  },
  {
    id: "dev",
    label: "Developer tool",
    eyebrow: "CLI beta",
    title: "Ship cleaner APIs without writing glue code.",
    description:
      "Reserve your beta key for schema-first SDK generation, changelog automation, and usage insights.",
    cta: "Reserve a beta key",
    accent: "#111111",
    background: "linear-gradient(145deg, #E8E8E8, #FAFAFA)",
    metric: "2,848 signups · 15.5% conversion",
  },
  {
    id: "creator",
    label: "Creator platform",
    eyebrow: "Founding members",
    title: "Turn your audience into a private launch circle.",
    description:
      "Invite your most engaged followers, reward referrals, and launch with demand already visible.",
    cta: "Claim a spot",
    accent: "#666666",
    background: "linear-gradient(145deg, #FAFAFA, #F2F2F2)",
    metric: "2,848 signups · 15.5% conversion",
  },
  {
    id: "productivity",
    label: "Productivity app",
    eyebrow: "Coming soon",
    title: "A focused workspace for tiny teams moving fast.",
    description:
      "Join the first teams testing lightweight docs, decisions, and launch rituals in one quiet place.",
    cta: "Get invited",
    accent: "#111111",
    background: "linear-gradient(145deg, #F2F2F2, #E8E8E8)",
    metric: "2,848 signups · 15.5% conversion",
  },
  {
    id: "fintech",
    label: "Fintech product",
    eyebrow: "Early access",
    title: "Simple runway planning for modern founders.",
    description:
      "Get notified when our cash, hiring, and scenario planning platform opens to early teams.",
    cta: "Join the launch list",
    accent: "#666666",
    background: "linear-gradient(145deg, #E8E8E8, #F2F2F2)",
    metric: "2,848 signups · 15.5% conversion",
  },
];

const brands: Brand[] = [
  {
    id: "clean",
    label: "Clean",
    accent: "#111111",
    background: "linear-gradient(145deg, #FAFAFA, #F2F2F2)",
    font: "Montserrat",
    button: "Pill",
  },
  {
    id: "signal",
    label: "Signal",
    accent: "#666666",
    background: "linear-gradient(145deg, #E8E8E8, #F2F2F2)",
    font: "Mono",
    button: "Sharp",
  },
  {
    id: "studio",
    label: "Studio",
    accent: "#111111",
    background: "linear-gradient(145deg, #F2F2F2, #FAFAFA)",
    font: "Serif",
    button: "Soft",
  },
];

const features = [
  {
    icon: Layers3,
    title: "No-code page builder",
    copy: "Build and publish a polished page without writing code.",
  },
  {
    icon: Mail,
    title: "Email collection",
    copy: "Capture subscribers with clear, consent-aware forms.",
  },
  {
    icon: Link2,
    title: "Referral links",
    copy: "Give every subscriber a unique link and track their invites.",
  },
  {
    icon: Trophy,
    title: "Reward milestones",
    copy: "Set milestones that reward useful referrals.",
  },
  {
    icon: Globe2,
    title: "Custom domains",
    copy: "Connect your domain on supported paid plans.",
  },
  {
    icon: Download,
    title: "Subscriber export",
    copy: "Take your subscriber list with you as CSV.",
  },
  {
    icon: BarChart3,
    title: "Conversion analytics",
    copy: "See conversion, growth, and referral performance together.",
  },
  {
    icon: Smartphone,
    title: "Mobile optimization",
    copy: "Keep every template readable on any screen.",
  },
  {
    icon: Code2,
    title: "Embeddable forms",
    copy: "Place the signup form on an existing site.",
  },
];

const trafficSources = [
  { label: "X / Twitter", value: 42 },
  { label: "Product Hunt", value: 28 },
  { label: "Founder communities", value: 18 },
  { label: "Direct", value: 12 },
];

const referrers = [
  { name: "maya@studio.so", referrals: 36 },
  { name: "kai@launchkit.dev", referrals: 24 },
  { name: "nora@solo.ai", referrals: 18 },
];

const plans = [
  {
    name: "Free",
    monthly: 0,
    yearly: 0,
    description: "For validating one idea before committing to a paid plan.",
    cta: "Start free",
    features: [
      "1 waitlist project",
      "Up to 100 subscribers",
      "Basic templates",
      "Basic analytics",
      "One referral link per subscriber",
      "Basic referral tracking",
      "LaunchBeam branding",
      "CSV export",
    ],
  },
  {
    name: "Pro",
    monthly: 15,
    yearly: 12,
    description: "For founders running active launches on their own brand.",
    cta: "Start Pro",
    recommended: true,
    features: [
      "Multiple projects",
      "Higher subscriber limit",
      "Full referral system",
      "Reward milestones",
      "Custom domains",
      "Advanced analytics",
      "Remove LaunchBeam branding",
      "Integrations",
    ],
  },
  {
    name: "Growth",
    monthly: 39,
    yearly: 31,
    description: "For small teams coordinating several launches.",
    cta: "Choose Growth",
    features: [
      "Everything in Pro",
      "Team members",
      "Higher project and subscriber limits",
      "A/B testing",
      "Custom reward tiers",
      "Priority onboarding",
    ],
  },
];

const faqs = [
  {
    question: "Can I use my own domain?",
    answer:
      "Custom domains are part of the planned Pro experience, but domain connection is not active in this marketing preview yet.",
  },
  {
    question: "Can I export my subscriber data?",
    answer:
      "CSV export is included in the product plan. This preview does not store subscribers, so there is no live data to export yet.",
  },
  {
    question: "Who owns the waitlist and subscriber data?",
    answer:
      "This preview stores no subscriber data. Production ownership, processing, and retention terms will be published before live collection opens.",
  },
  {
    question: "How does referral tracking work?",
    answer:
      "The product is designed to assign each subscriber a unique referral link and attribute resulting signups. The interaction shown here is a front-end demonstration.",
  },
  {
    question: "What happens when I reach my plan limit?",
    answer:
      "Plan-limit handling is not implemented yet. Upgrade and overage behavior will be defined before paid accounts become available.",
  },
  {
    question: "What happens to my waitlist page if I cancel?",
    answer:
      "Billing and cancellation are not active in this preview. A clear retention and export policy will be published before paid plans launch.",
  },
  {
    question: "Does LaunchBeam support GDPR-compliant consent?",
    answer:
      "Consent controls and production data processing are still under development. Do not use this preview for regulated subscriber collection.",
  },
  {
    question: "Can I remove LaunchBeam branding?",
    answer:
      "Removing LaunchBeam branding is planned for Pro and Growth. It is not an active account setting in this preview.",
  },
  {
    question: "Can I embed the signup form on another website?",
    answer:
      "Embeddable forms are part of the product direction, but no production embed code is available from this preview.",
  },
  {
    question: "Which integrations are supported?",
    answer:
      "No third-party integrations are live in this preview. Supported services will be listed only after they are implemented and verified.",
  },
];

export function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    document.body.classList.add("menu-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="site-shell">
      <Navigation
        isScrolled={isScrolled}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />
      <HeroSection />
      <BuilderSection />
      <TemplateShowcase />
      <InsightsSection />
      <CustomizationSection />
      <FeaturesSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <Footer />
    </main>
  );
}

function Navigation({
  isScrolled,
  isMenuOpen,
  setIsMenuOpen,
}: {
  isScrolled: boolean;
  isMenuOpen: boolean;
  setIsMenuOpen: (value: boolean) => void;
}) {
  return (
    <header className={`site-header ${isScrolled ? "is-scrolled" : ""}`}>
      <nav className="glass-nav" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="LaunchBeam home">
          <span className="brand-mark" aria-hidden="true" />
          <span>LaunchBeam</span>
        </a>

        <div className="nav-links" aria-label="Primary">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="nav-actions">
          <a className="signin" href={signInHref}>
            Sign in
          </a>
          <GlassButton href={freeSignupHref} size="small" icon={ArrowRight}>
            Create your waitlist
          </GlassButton>
        </div>

        <button
          className="menu-toggle"
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <div
        className={`mobile-menu ${isMenuOpen ? "is-open" : ""}`}
        aria-hidden={!isMenuOpen}
      >
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setIsMenuOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <a
          href={signInHref}
          onClick={() => setIsMenuOpen(false)}
        >
          Sign in
        </a>
        <GlassButton href={freeSignupHref} icon={ArrowRight}>
          Create your waitlist
        </GlassButton>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="hero-section" id="top">
      <div className="section-inner hero-grid">
        <div className="hero-copy" data-reveal>
          <p className="eyebrow">Waitlists for modern product teams</p>
          <h1>Launch before you&apos;re ready.</h1>
          <p className="hero-lede">
            Create a beautiful waitlist, validate demand, and build an audience
            for your startup before launch.
          </p>
          <div className="hero-actions">
            <GlassButton href={freeSignupHref} icon={ArrowRight}>
              Create your waitlist
            </GlassButton>
            <GlassButton href="#product" variant="secondary" icon={Play}>
              View live demo
            </GlassButton>
          </div>
          <div className="trust-strip" aria-label="LaunchBeam status">
            <span>Currently in private beta</span>
            <span>Built for founders validating their next idea</span>
          </div>
        </div>

        <div className="hero-mockup-wrap" data-reveal>
          <BuilderMockup />
        </div>
      </div>
    </section>
  );
}

function BuilderMockup() {
  return (
    <div className="hero-product-stack" aria-label="LaunchBeam page builder preview">
      <BrowserMockup title="LaunchBeam builder" className="hero-builder-window">
        <div className="builder-app">
          <aside className="builder-sidebar">
            <div className="sidebar-pill is-active">
              <MousePointer2 size={15} />
              Page
            </div>
            <div className="sidebar-pill">
              <Palette size={15} />
              Brand
            </div>
            <div className="sidebar-pill">
              <Trophy size={15} />
              Rewards
            </div>
          </aside>
          <div className="builder-panel">
            <div className="field-row">
              <span>Startup name</span>
              <strong>Northstar AI</strong>
            </div>
            <div className="field-row wide">
              <span>Headline</span>
              <strong>Meet your product research copilot.</strong>
            </div>
            <div className="swatch-row" aria-label="Brand colors">
              <span className="swatch ink" />
              <span className="swatch graphite" />
              <span className="swatch mist" />
            </div>
            <div className="publish-row">
              <span>Launch page</span>
              <span className="mock-button">Publish</span>
            </div>
          </div>
          <div className="live-preview-card">
            <div className="preview-logo">N</div>
            <p className="preview-kicker">Example campaign data</p>
            <h3>Meet your product research copilot.</h3>
            <p>
              2,848 signups from 18,420 visitors, including 962 referral
              signups.
            </p>
            <div className="preview-form">
              <span>you@company.com</span>
              <span className="mock-button">Join waitlist</span>
            </div>
          </div>
        </div>
      </BrowserMockup>
      <GlassPanel className="hero-stats-card">
        <div>
          <span className="metric-label">Demand score</span>
          <strong>78/100</strong>
        </div>
        <div className="mini-spark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </GlassPanel>
      <GlassPanel className="hero-position-card">
        <span>Example subscriber</span>
        <strong>#247 · 2 of 3 referrals complete</strong>
      </GlassPanel>
    </div>
  );
}

function BuilderSection() {
  const [builder, setBuilder] = useState<BuilderState>({
    startup: "Northstar AI",
    headline: "Meet your product research copilot.",
    description:
      "Join the private beta for faster customer discovery, launch notes, and market signals.",
    button: "Join the waitlist",
    launchDate: "2026-09-12",
    accent: "#111111",
    theme: "paper",
    font: "Montserrat",
  });
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  useEffect(() => {
    if (saveState !== "saving") return;
    const timeout = window.setTimeout(() => setSaveState("saved"), 450);
    return () => window.clearTimeout(timeout);
  }, [builder, saveState]);

  const previewStyle = {
    "--preview-accent": builder.accent,
  } as CSSProperties;

  const setField = <K extends keyof BuilderState>(
    key: K,
    value: BuilderState[K],
  ) => {
    setSaveState("saving");
    setBuilder((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="story-section" id="product">
      <div className="section-inner split-layout">
        <div className="sticky-copy" data-reveal>
          <SectionHeading
            kicker="Page builder"
            title="From idea to waitlist in minutes."
            copy="Shape the first public version of your product with focused controls for copy, brand, timing, and audience capture."
          />
        </div>
        <div className="builder-demo" data-reveal>
          <GlassPanel className="editor-panel">
            <div className="panel-header">
              <span>Editor</span>
              <span className={`status-dot ${saveState}`} aria-live="polite">
                {saveState === "saving" ? "Saving" : "Draft saved"}
              </span>
            </div>
            <div className="editor-fields">
              <LabeledInput
                label="Startup name"
                value={builder.startup}
                onChange={(value) => setField("startup", value)}
              />
              <LabeledInput
                label="Headline"
                value={builder.headline}
                onChange={(value) => setField("headline", value)}
              />
              <LabeledInput
                label="Description"
                value={builder.description}
                onChange={(value) => setField("description", value)}
              />
              <LabeledInput
                label="Button text"
                value={builder.button}
                onChange={(value) => setField("button", value)}
              />
              <label className="form-control">
                <span>Launch date</span>
                <input
                  type="date"
                  value={builder.launchDate}
                  onChange={(event) => setField("launchDate", event.target.value)}
                />
              </label>
              <label className="form-control">
                <span>Font</span>
                <select
                  value={builder.font}
                  onChange={(event) =>
                    setField("font", event.target.value as FontName)
                  }
                >
                  <option>Montserrat</option>
                  <option>Serif</option>
                  <option>Mono</option>
                </select>
              </label>
              <div className="style-controls" aria-label="Color theme">
                {[
                  { name: "paper" as const, color: "#111111" },
                  { name: "graphite" as const, color: "#666666" },
                  { name: "soft" as const, color: "#111111" },
                ].map((option) => (
                  <button
                    key={option.name}
                    type="button"
                    className={builder.theme === option.name ? "is-active" : ""}
                    aria-label={`${option.name} theme`}
                    aria-pressed={builder.theme === option.name}
                    onClick={() => {
                      setSaveState("saving");
                      setBuilder((current) => ({
                        ...current,
                        theme: option.name,
                        accent: option.color,
                      }));
                    }}
                  >
                    <span style={{ background: option.color }} />
                  </button>
                ))}
              </div>
            </div>
          </GlassPanel>

          <BrowserMockup title={`${builder.startup} preview`} className="preview-window">
            <div
              className={`waitlist-preview theme-${builder.theme} font-${builder.font.toLowerCase()}`}
              style={previewStyle}
            >
              <div className="preview-brand">
                <span>{builder.startup.charAt(0)}</span>
                <strong>{builder.startup}</strong>
              </div>
              <p className="preview-kicker">Launching {formatDate(builder.launchDate)}</p>
              <h3>{builder.headline}</h3>
              <p>{builder.description}</p>
              <PreviewSignupForm buttonLabel={builder.button} />
              <div className="preview-proof">
                <span>2,848 signups</span>
                <span>962 referral signups</span>
              </div>
            </div>
          </BrowserMockup>
        </div>
      </div>
    </section>
  );
}

function TemplateShowcase() {
  const [active, setActive] = useState(templates[0]);

  return (
    <section className="template-section" id="templates">
      <div className="section-inner">
        <SectionHeading
          align="center"
          kicker="Templates"
          title="Designed to make your idea feel real."
          copy="Start with a refined launch page tailored to the kind of product you are validating."
        />
        <div className="template-tabs" aria-label="Template categories">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              aria-pressed={active.id === template.id}
              className={active.id === template.id ? "is-active" : ""}
              onClick={() => setActive(template)}
            >
              {template.label}
            </button>
          ))}
        </div>
        <div className="template-stage" data-reveal>
          <BrowserMockup title={active.label} className="template-browser">
            <div
              className="template-preview"
              style={
                {
                  "--template-accent": active.accent,
                  "--template-bg": active.background,
                } as CSSProperties
              }
            >
              <div className="template-device">
                <div className="template-logo">{active.label.charAt(0)}</div>
                <p>{active.eyebrow}</p>
                <h3>{active.title}</h3>
                <span>{active.description}</span>
                <span className="mock-button">{active.cta}</span>
              </div>
              <div className="template-detail">
                <div className="template-chip">
                  <span>Example campaign data</span>
                  <strong>{active.metric}</strong>
                </div>
                <div className="floating-lines" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </BrowserMockup>
        </div>
      </div>
    </section>
  );
}

function InsightsSection() {
  return (
    <section className="insights-section" id="analytics">
      <div className="section-inner">
        <SectionHeading
          align="center"
          kicker="Demand and analytics"
          title="Know when your idea is working."
          copy="LaunchBeam combines conversion, referral activity, returning visitors, signup growth, and survey intent into one clear launch signal."
        />
        <DashboardMockup />
      </div>
    </section>
  );
}

function DashboardMockup() {
  return (
    <BrowserMockup title="Northstar AI overview" className="dashboard-browser" dataReveal>
      <div className="dashboard-toolbar">
        <div>
          <strong>Northstar AI</strong>
          <span>Example campaign data</span>
        </div>
        <span>Last 30 days</span>
      </div>

      <GlassPanel className="score-card dashboard-score">
        <div className="score-ring" aria-label="Demand score 78 out of 100">
          <span>78</span>
          <small>/100</small>
        </div>
        <div className="score-copy">
          <p className="score-label">Strong early interest</p>
          <h3>Referral activity is above average.</h3>
          <p>
            Your conversion rate is healthy, daily growth is accelerating, and
            34% of new subscribers arrived through invites.
          </p>
        </div>
        <div className="score-factors" aria-label="Key demand signals">
          {[
            ["Signup conversion", "15.5%"],
            ["Referral activity", "34%"],
            ["Daily growth", "+18.4%"],
            ["Returning visitors", "22%"],
            ["Survey intent", "High"],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className="metrics-strip" aria-label="Launch analytics">
        <DashboardMetric label="Total visitors" value={18420} suffix="" icon={Users} />
        <DashboardMetric label="Total signups" value={2848} suffix="" icon={Mail} />
        <DashboardMetric label="Conversion rate" value={15.5} suffix="%" icon={LineChart} />
        <DashboardMetric label="Referral signups" value={962} suffix="" icon={Link2} />
        <DashboardMetric label="Daily growth" value={18.4} suffix="%" prefix="+" icon={BarChart3} />
      </div>

      <div className="analytics-detail-grid">
        <GlassPanel className="chart-panel growth-panel">
          <div className="dashboard-card-header">
            <span>Daily growth</span>
            <strong>+18.4%</strong>
          </div>
          <div className="growth-chart" aria-label="Daily signup growth chart">
            {[32, 44, 38, 58, 72, 64, 86, 93, 78, 104, 116, 132].map(
              (height, index) => (
                <span
                  key={`${height}-${index}`}
                  style={{ height: `${height}px` }}
                />
              ),
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="chart-panel source-panel">
          <div className="dashboard-card-header">
            <span>Top traffic sources</span>
            <strong>7 days</strong>
          </div>
          <div className="source-list">
            {trafficSources.map((source) => (
              <div key={source.label} className="source-row">
                <div>
                  <span>{source.label}</span>
                  <strong>{source.value}%</strong>
                </div>
                <div className="source-bar">
                  <span style={{ width: `${source.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="chart-panel referrer-panel">
          <div className="dashboard-card-header">
            <span>Top referrers</span>
            <strong>Example</strong>
          </div>
          <div className="referrer-list">
            {referrers.map((referrer) => (
              <div key={referrer.name}>
                <span>{referrer.name}</span>
                <strong>{referrer.referrals} referrals</strong>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </BrowserMockup>
  );
}

function CustomizationSection() {
  const [activeBrand, setActiveBrand] = useState(brands[0]);

  const brandStyle = {
    "--brand-accent": activeBrand.accent,
    "--brand-bg": activeBrand.background,
  } as CSSProperties;

  return (
    <section className="customization-section">
      <div className="section-inner">
        <SectionHeading
          align="center"
          kicker="Customization"
          title="Make it unmistakably yours."
          copy="Change colors, fonts, backgrounds, buttons, images, and sections without losing polish."
        />
        <div className="customizer-layout" data-reveal>
          <GlassPanel className="customizer-controls">
            <div className="panel-header">
              <span>Brand styles</span>
              <span>Live</span>
            </div>
            {brands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                className={activeBrand.id === brand.id ? "is-active" : ""}
                aria-pressed={activeBrand.id === brand.id}
                onClick={() => setActiveBrand(brand)}
              >
                <span className="brand-swatch" style={{ background: brand.accent }} />
                <span>{brand.label}</span>
                <small>{brand.font} font</small>
              </button>
            ))}
          </GlassPanel>
          <div
            className={`brand-preview font-${activeBrand.font.toLowerCase()}`}
            style={brandStyle}
          >
            <div className="brand-preview-inner">
              <span className="preview-kicker">Early access</span>
              <h3>Build the launch list for your next product.</h3>
              <p>
                A flexible waitlist page that can feel quiet, technical,
                editorial, or bold with a few brand controls.
              </p>
              <span
                className={`mock-button button-${activeBrand.button.toLowerCase()}`}
              >
                Join the waitlist
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="features-section" id="features">
      <div className="section-inner">
        <div className="feature-hero-row" data-reveal>
          <SectionHeading
            kicker="Launch toolkit"
            title="Everything your pre-launch page needs."
            copy="The essentials are connected: page creation, capture, referrals, analytics, exports, and the brand controls that make the idea feel real."
          />
          <GlassPanel className="feature-highlight">
            <ShieldCheck size={28} />
            <h3>Built for serious validation.</h3>
            <p>
              Launch fast without creating a disposable page you will outgrow
              the moment people start sharing it.
            </p>
          </GlassPanel>
        </div>
        <div className="feature-list" data-reveal>
          {features.map((feature) => (
            <FeatureItem
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              copy={feature.copy}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <section className="pricing-section" id="pricing">
      <div className="section-inner">
        <div className="pricing-heading">
          <SectionHeading
            align="center"
            kicker="Pricing"
            title="Start free. Upgrade when the signal is real."
            copy="Simple plans for founders testing demand before investing in a full launch stack."
          />
          <div className="billing-toggle" aria-label="Billing cycle">
            <button
              type="button"
              className={billing === "monthly" ? "is-active" : ""}
              aria-pressed={billing === "monthly"}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billing === "yearly" ? "is-active" : ""}
              aria-pressed={billing === "yearly"}
              onClick={() => setBilling("yearly")}
            >
              Yearly
            </button>
          </div>
          <p className="pricing-signin">
            Already have an account? <a href={signInHref}>Sign in</a>
          </p>
        </div>
        <div className="pricing-grid" data-reveal>
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} billing={billing} />
          ))}
        </div>
      </div>
    </section>
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
    <section className="faq-section" id="faq">
      <div className="section-inner faq-layout">
        <SectionHeading
          kicker="FAQ"
          title="A few honest answers."
          copy="LaunchBeam is currently a product preview. These answers separate the planned platform from what is active today."
        />
        <div className="faq-list" data-reveal>
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
                    <ChevronDown size={19} aria-hidden="true" />
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

function FinalCta() {
  return (
    <section className="final-cta-section">
      <div className="section-inner">
        <GlassPanel className="final-cta" dataReveal>
          <div className="final-cta-bg" aria-hidden="true" />
          <span className="preview-kicker">Ready when you are</span>
          <h2>Your audience is already out there.</h2>
          <p>
            Create your waitlist today and find out who wants your product
            before you build it.
          </p>
          <GlassButton href={freeSignupHref} icon={ArrowRight}>
            Build your waitlist
          </GlassButton>
        </GlassPanel>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="section-inner footer-inner">
        <a className="brand" href="#top" aria-label="LaunchBeam home">
          <span className="brand-mark" aria-hidden="true" />
          <span>LaunchBeam</span>
        </a>
        <div className="footer-links">
          {footerLinks.map((item) =>
            item.href ? (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ) : (
              <span key={item.label} className="future-link" aria-disabled="true">
                {item.label}
              </span>
            ),
          )}
        </div>
      </div>
    </footer>
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
    <div className={`section-heading align-${align}`}>
      <span className="section-kicker">{kicker}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function GlassPanel({
  children,
  className = "",
  dataReveal = false,
}: {
  children: ReactNode;
  className?: string;
  dataReveal?: boolean;
}) {
  return (
    <div className={`glass-panel ${className}`} data-reveal={dataReveal ? "" : undefined}>
      {children}
    </div>
  );
}

function GlassButton({
  children,
  href,
  variant = "primary",
  size = "normal",
  icon: Icon,
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
  size?: "normal" | "small";
  icon?: LucideIcon;
}) {
  return (
    <a className={`glass-button ${variant} ${size}`} href={href}>
      <span>{children}</span>
      {Icon ? <Icon size={size === "small" ? 16 : 18} aria-hidden="true" /> : null}
    </a>
  );
}

function BrowserMockup({
  title,
  children,
  className = "",
  dataReveal = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  dataReveal?: boolean;
}) {
  return (
    <div className={`browser-frame ${className}`} data-reveal={dataReveal ? "" : undefined}>
      <div className="browser-topbar">
        <div className="traffic-lights" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="browser-title">{title}</div>
        <ExternalLink size={15} aria-hidden="true" />
      </div>
      <div className="browser-content">{children}</div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useMemo(() => `field-${label.toLowerCase().replace(/\s+/g, "-")}`, [label]);

  return (
    <label className="form-control" htmlFor={id}>
      <span>{label}</span>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function PreviewSignupForm({ buttonLabel }: { buttonLabel: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    setStatus(isValid ? "success" : "error");
  };

  return (
    <div className="signup-demo">
      <form className="preview-signup" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor="builder-preview-email">
          Email address
        </label>
        <input
          id="builder-preview-email"
          type="email"
          autoComplete="email"
          placeholder="founder@company.com"
          value={email}
          aria-invalid={status === "error"}
          aria-describedby="builder-preview-status"
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle") setStatus("idle");
          }}
        />
        <button type="submit">
          {status === "success" ? "You're on the list" : buttonLabel}
        </button>
      </form>
      <p
        id="builder-preview-status"
        className={`form-status ${status}`}
        aria-live="polite"
      >
        {status === "error"
          ? "Enter a valid email address."
          : status === "success"
            ? "Success. Your sample signup was captured."
            : ""}
      </p>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  suffix,
  prefix = "",
  icon: Icon,
}: {
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
  icon: LucideIcon;
}) {
  const formatted =
    value % 1 === 0 ? value.toLocaleString("en-US") : value.toFixed(1);

  return (
    <GlassPanel className="metric-card">
      <div>
        <span>{label}</span>
        <strong>
          {prefix}
          {formatted}
          {suffix}
        </strong>
      </div>
      <Icon size={22} aria-hidden="true" />
    </GlassPanel>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  copy,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
}) {
  return (
    <article className="feature-item">
      <div className="feature-icon">
        <Icon size={21} aria-hidden="true" />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
    </article>
  );
}

function PricingCard({
  plan,
  billing,
}: {
  plan: (typeof plans)[number];
  billing: "monthly" | "yearly";
}) {
  const price = billing === "monthly" ? plan.monthly : plan.yearly;
  const priceLabel = price === 0 ? "Free" : `$${price}`;

  return (
    <GlassPanel className={`pricing-card ${plan.recommended ? "recommended" : ""}`}>
      {plan.recommended ? <span className="recommended-pill">Recommended</span> : null}
      <h3>{plan.name}</h3>
      <p>{plan.description}</p>
      <div className="price-row">
        <strong>{priceLabel}</strong>
        {price > 0 ? <span>/ month</span> : null}
      </div>
      <a className="plan-button" href={planSignupHref(plan.name)}>
        {plan.cta}
      </a>
      <div className="plan-features">
        {plan.features.map((feature) => (
          <div key={feature}>
            <Check size={17} aria-hidden="true" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

function formatDate(value: string) {
  if (!value) return "soon";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "soon";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
