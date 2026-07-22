"use client";

import type {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  RefObject,
} from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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

type PlanIntent = "free" | "pro";
type StudioTab = "page" | "design" | "analytics";
type PreviewMode = "desktop" | "mobile";
type TemplateId = "focus" | "editorial" | "product";
type ButtonStyle = "solid" | "outline" | "soft";
type AnalyticsTab = "overview" | "sources" | "referrals";

const campaign = {
  startup: "Kimchi",
  founder: "Maya Chen",
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
  { id: "focus", label: "Focus", description: "Centered and concise" },
  { id: "editorial", label: "Editorial", description: "Quiet, story-led layout" },
  { id: "product", label: "Product", description: "Visual product-first split" },
];

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Analytics", href: "#analytics" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

const featureItems = [
  {
    icon: MousePointer2,
    title: "Waitlist page builder",
    copy: "Edit campaign copy, templates, and calls to action in the current prototype.",
    status: "Prototype available",
  },
  {
    icon: BarChart3,
    title: "Demand Score",
    copy: "Bring conversion and referral signals into one decision-friendly score.",
    status: "Prototype available",
  },
  {
    icon: Link2,
    title: "Referral attribution",
    copy: "Give subscribers unique links and connect invited signups to the right referrer.",
    status: "Planned for beta",
  },
  {
    icon: Users,
    title: "Positions and rewards",
    copy: "Let subscribers see their place and progress toward referral milestones.",
    status: "Planned for beta",
  },
  {
    icon: Mail,
    title: "Subscriber export",
    copy: "Export the audience you build before moving into your launch stack.",
    status: "Planned for beta",
  },
  {
    icon: LayoutTemplate,
    title: "Custom domains",
    copy: "Publish the finished waitlist on your own domain with Pro.",
    status: "Pro roadmap",
  },
] as const;

const plans = [
  {
    id: "free" as const,
    name: "Free",
    price: "Free",
    description: "For testing an idea.",
    cta: "Create your waitlist",
    recommended: false,
    features: [
      "1 project",
      "Up to 100 subscribers",
      "Basic referral tracking",
      "CSV export",
      "LaunchBeam branding",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$9",
    description: "For serious launches.",
    cta: "Start with Pro",
    recommended: true,
    features: [
      "More subscribers",
      "Multiple projects",
      "Full referral rewards",
      "Custom domain",
      "Advanced analytics",
      "Remove LaunchBeam branding",
    ],
  },
] as const;

const faqs = [
  {
    question: "Can I use my own domain?",
    answer:
      "Custom domains are planned for Pro, but domain connection is not active in the current beta prototype.",
  },
  {
    question: "Can I export my subscriber data?",
    answer:
      "CSV export is planned for both plans. Production subscriber collection and exports are not live yet.",
  },
  {
    question: "How does referral tracking work?",
    answer:
      "LaunchBeam is designed to assign each subscriber a unique link and attribute invited signups. The interface shown today is a prototype.",
  },
  {
    question: "What happens when I reach my plan limit?",
    answer:
      "No limits are enforced during the prototype. Upgrade and limit policies will be published before accounts open.",
  },
  {
    question: "Can I remove LaunchBeam branding?",
    answer:
      "Removing LaunchBeam branding is planned for Pro and is not an active setting in the current prototype.",
  },
  {
    question: "What happens if I cancel?",
    answer:
      "Billing is not active yet. Cancellation, export, and retention terms will be clear before paid subscriptions launch.",
  },
] as const;

export function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [betaPlan, setBetaPlan] = useState<PlanIntent>("free");
  const [isBetaOpen, setIsBetaOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
    const queryPlan = new URLSearchParams(window.location.search).get("plan");
    if (queryPlan === "free" || queryPlan === "pro") {
      const timeout = window.setTimeout(() => {
        setBetaPlan(queryPlan);
        setIsBetaOpen(true);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
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

  const openBeta = (plan: PlanIntent) => {
    setBetaPlan(plan);
    setIsBetaOpen(true);
    window.history.replaceState(null, "", `?plan=${plan}#early-access`);
  };

  const closeBeta = () => {
    setIsBetaOpen(false);
    window.history.replaceState(null, "", `${window.location.pathname}#top`);
  };

  return (
    <main className="site-shell">
      <Navigation
        isScrolled={isScrolled}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        menuButtonRef={menuButtonRef}
        mobileMenuRef={mobileMenuRef}
        onCreate={() => openBeta("free")}
      />
      <HeroSection onCreate={() => openBeta("free")} />
      <InsightsSection />
      <FeaturesSection />
      <PricingSection onSelectPlan={openBeta} />
      <FaqSection />
      <FinalCta onCreate={() => openBeta("free")} />
      <Footer />
      <BetaSignupDialog
        key={`${betaPlan}-${isBetaOpen ? "open" : "closed"}`}
        isOpen={isBetaOpen}
        plan={betaPlan}
        onClose={closeBeta}
      />
    </main>
  );
}

function Navigation({
  isScrolled,
  isMenuOpen,
  setIsMenuOpen,
  menuButtonRef,
  mobileMenuRef,
  onCreate,
}: {
  isScrolled: boolean;
  isMenuOpen: boolean;
  setIsMenuOpen: (value: boolean) => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  mobileMenuRef: RefObject<HTMLDivElement | null>;
  onCreate: () => void;
}) {
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className={`site-header ${isScrolled ? "is-scrolled" : ""}`}>
      <nav className="glass-nav" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="LaunchBeam home">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-wordmark">LaunchBeam</span>
        </a>

        <div className="nav-links" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="nav-actions">
          <BetaCta plan="free" onSelect={onCreate} size="small">
            Create your waitlist
          </BetaCta>
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
            <BetaCta
              plan="free"
              onSelect={() => {
                closeMenu();
                onCreate();
              }}
            >
              Create your waitlist
            </BetaCta>
          </div>
        </>
      ) : null}
    </header>
  );
}

function HeroSection({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="hero-section" id="top">
      <div className="section-inner hero-inner">
        <div className="hero-copy" data-hero-sequence>
          <h1>Build an audience before you launch.</h1>
          <p className="hero-lede">
            Create a polished waitlist, reward referrals, and measure real demand
            before committing months to your idea.
          </p>
          <div className="hero-actions">
            <BetaCta plan="free" onSelect={onCreate}>
              Create your waitlist
            </BetaCta>
            <a className="button secondary" href="#product">
              <span>View demo</span>
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
          <p className="trust-line">
            <span>Private beta</span>
            Built for indie founders validating their next idea.
          </p>
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
  const [templateId, setTemplateId] = useState<TemplateId>("focus");
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
    <div id="product" className="product-stage" data-reveal="scale">
      <BrowserMockup title={`${campaign.startup} campaign`} className="studio-window">
        <div className="studio-toolbar">
          <div className="studio-tabs" role="tablist" aria-label="Campaign workspace">
            <StudioTabButton
              label="Page"
              icon={MousePointer2}
              isActive={activeTab === "page"}
              onClick={() => setActiveTab("page")}
            />
            <StudioTabButton
              label="Design"
              icon={LayoutTemplate}
              isActive={activeTab === "design"}
              onClick={() => setActiveTab("design")}
            />
            <StudioTabButton
              label="Analytics"
              icon={BarChart3}
              isActive={activeTab === "analytics"}
              onClick={() => setActiveTab("analytics")}
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
              {saveState === "saving" ? "Saving locally" : "Draft / local preview"}
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
                  <small>Prototype control</small>
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
                    <span>by {campaign.founder}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "design" ? (
              <div className="control-group">
                <div className="control-heading">
                  <span>Template</span>
                  <small>Three distinct directions</small>
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
}: {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      id={`studio-tab-${label.toLowerCase()}`}
      role="tab"
      aria-selected={isActive}
      aria-controls="studio-panel"
      className={isActive ? "is-active" : ""}
      onClick={onClick}
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
        {templateId === "product" ? (
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
          <p className="waitlist-kicker">
            {templateId === "editorial" ? "A new research rhythm" : "Private beta"}
          </p>
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
      <span className="example-form-label">Example waitlist form / prototype</span>
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
            ? "Prototype complete. No email was sent or stored."
            : "No email is sent or stored in this example form."}
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
          copy="LaunchBeam turns conversion and referral activity into one clear launch signal, then keeps the supporting detail close at hand."
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
              {(["overview", "sources", "referrals"] as AnalyticsTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  id={`analytics-tab-${tab}`}
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`analytics-${tab}`}
                  className={activeTab === tab ? "is-active" : ""}
                  onClick={() => setActiveTab(tab)}
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
          kicker="Product direction"
          title="The launch essentials, without the noise."
          copy="The current prototype focuses on the page builder and Demand Score. The remaining capabilities are labelled as roadmap items until they are production-ready."
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
  onSelectPlan,
}: {
  onSelectPlan: (plan: PlanIntent) => void;
}) {
  return (
    <section className="pricing-section">
      <div className="section-inner" id="pricing">
        <SectionHeading
          align="center"
          kicker="Beta pricing"
          title="Start with one idea."
          copy="Two straightforward plans for the upcoming beta. No payment is collected today."
        />
        <div className="pricing-grid" data-reveal="group">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} onSelect={onSelectPlan} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  onSelect,
}: {
  plan: (typeof plans)[number];
  onSelect: (plan: PlanIntent) => void;
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
        {plan.id === "pro" ? <span>/month</span> : null}
      </div>
      <BetaCta
        plan={plan.id}
        onSelect={() => onSelect(plan.id)}
        variant={plan.recommended ? "primary" : "secondary"}
      >
        {plan.cta}
      </BetaCta>
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
          copy="LaunchBeam is in private beta, so the answers below separate the working prototype from the planned product."
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

function FinalCta({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="final-cta-section">
      <div className="section-inner final-cta" id="early-access" data-reveal="scale">
        <div>
          <span>Private beta</span>
          <h2>Create the audience your launch deserves.</h2>
          <p>Start with a focused waitlist and a clearer signal before you build.</p>
        </div>
        <BetaCta plan="free" onSelect={onCreate}>
          Create your waitlist
        </BetaCta>
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
          <span className="brand-wordmark">LaunchBeam</span>
        </a>
        <nav className="footer-links" aria-label="Footer navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <p>Private beta. Built for indie founders.</p>
      </div>
    </footer>
  );
}

function BetaSignupDialog({
  isOpen,
  plan,
  onClose,
}: {
  isOpen: boolean;
  plan: PlanIntent;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const consentId = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    if (!consent) {
      setStatus("error");
      setMessage("Confirm that LaunchBeam may email you about beta access.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/beta-signups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, plan, consent }),
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to join the beta right now.");
      setStatus("success");
      setMessage(payload.message ?? "You are on the LaunchBeam beta list.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to join the beta right now.");
    }
  };

  const close = () => {
    dialogRef.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="beta-dialog"
      aria-labelledby="beta-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.currentTarget === event.target) close();
      }}
    >
      <div className="beta-dialog-panel">
        <button type="button" className="dialog-close" aria-label="Close beta signup" onClick={close}>
          <X size={18} aria-hidden="true" />
        </button>
        <span className="dialog-kicker">LaunchBeam private beta</span>
        <h2 id="beta-dialog-title">
          {plan === "pro" ? "Start with Pro." : "Create your waitlist."}
        </h2>
        <p>
          Accounts are not open yet. Join the beta list and we will email you
          when project creation becomes available.
        </p>

        {status === "success" ? (
          <div className="dialog-success" role="status">
            <span className="success-icon" aria-hidden="true"><Check size={22} /></span>
            <h3>You&apos;re on the beta list.</h3>
            <p>{message}</p>
            <button type="button" className="button secondary" onClick={close}>Close</button>
          </div>
        ) : (
          <form className="beta-form" onSubmit={submit} noValidate>
            <label className="form-control" htmlFor="beta-email">
              <span>Work email</span>
              <input
                id="beta-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                aria-invalid={status === "error"}
                aria-describedby="beta-form-status"
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (status === "error") setStatus("idle");
                }}
              />
            </label>
            <label className="consent-control" htmlFor={consentId}>
              <input
                id={consentId}
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>LaunchBeam may email me about beta access. I can unsubscribe at any time.</span>
            </label>
            <button className="button primary beta-submit" type="submit" disabled={status === "loading"}>
              <span>{status === "loading" ? "Requesting access..." : "Request beta access"}</span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <p id="beta-form-status" className={`beta-form-status ${status}`} aria-live="polite">
              {message}
            </p>
            <p className="data-note">Your email is stored only for LaunchBeam beta access.</p>
          </form>
        )}
      </div>
    </dialog>
  );
}

function BetaCta({
  children,
  plan,
  onSelect,
  variant = "primary",
  size = "normal",
}: {
  children: ReactNode;
  plan: PlanIntent;
  onSelect: () => void;
  variant?: "primary" | "secondary";
  size?: "normal" | "small";
}) {
  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onSelect();
  };

  return (
    <a
      className={`button ${variant} ${size}`}
      href={`?plan=${plan}#early-access`}
      onClick={handleClick}
    >
      <span>{children}</span>
      <ArrowRight size={size === "small" ? 16 : 17} aria-hidden="true" />
    </a>
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
