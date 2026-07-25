export const TEMPLATE_IDS = [
  "minimal-beam",
  "kimchi",
  "kevinora",
  "spotbeam",
  "darkrai",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  "minimal-beam": "Minimal Beam",
  kimchi: "Kimchi",
  kevinora: "Kevinora",
  spotbeam: "Spotbeam",
  darkrai: "Darkrai",
};

export const APPROVED_FONTS = ["argentum", "editorial", "mono"] as const;
export type ApprovedFont = (typeof APPROVED_FONTS)[number];

export type ProjectContent = {
  productName?: string;
  kicker: string;
  headline: string;
  description: string;
  buttonText: string;
  successTitle: string;
  successMessage: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  socialLinks: Array<{
    platform: string;
    url: string;
  }>;
};

export type ProjectTheme = {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  font: ApprovedFont;
  radius: number;
  alignment: "left" | "center";
  buttonStyle: "solid" | "outline" | "soft" | "glass";
  animation: "none" | "subtle" | "expressive";
};

export type ProjectSettings = {
  showSignupCount: boolean;
  referralsEnabled: boolean;
  requireEmailVerification: boolean;
  collectName: boolean;
  customQuestion: {
    label: string;
    required: boolean;
  } | null;
  privacyUrl: string | null;
};

export type ProjectStatus = "draft" | "published" | "archived";

export type ProjectRecord = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  templateId: TemplateId;
  content: ProjectContent;
  theme: ProjectTheme;
  settings: ProjectSettings;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriberStatus = "pending" | "subscribed" | "unsubscribed";

export type SubscriberRecord = {
  id: string;
  projectId: string;
  email: string;
  name: string | null;
  customAnswer: string | null;
  status: SubscriberStatus;
  referralCode: string;
  referredBy: string | null;
  position: number;
  referralCount: number;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
  updatedAt: string;
};

export const EVENT_TYPES = [
  "page_view",
  "signup",
  "referral_visit",
  "referral_signup",
  "share_click",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type AnalyticsEvent = {
  id: number;
  projectId: string;
  eventType: EventType;
  sessionId: string | null;
  subscriberId: string | null;
  referrer: string | null;
  country: string | null;
  deviceType: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export const DEFAULT_PROJECT_CONTENT: ProjectContent = {
  productName: "Kimchi",
  kicker: "Private beta",
  headline: "Research that finds the signal in customer conversations.",
  description:
    "Kimchi turns interviews and support calls into clear product decisions.",
  buttonText: "Join the waitlist",
  successTitle: "You're on the list.",
  successMessage: "We'll let you know when Kimchi is ready.",
  logoUrl: null,
  heroImageUrl: null,
  socialLinks: [],
};

export const DEFAULT_PROJECT_THEME: ProjectTheme = {
  background: "#e9e5ff",
  foreground: "#18151f",
  muted: "#6f6879",
  accent: "#5b4de4",
  font: "argentum",
  radius: 20,
  alignment: "center",
  buttonStyle: "solid",
  animation: "subtle",
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  showSignupCount: false,
  referralsEnabled: true,
  requireEmailVerification: false,
  collectName: false,
  customQuestion: null,
  privacyUrl: null,
};

export const DEFAULT_PROJECT_CONFIG = {
  name: "Kimchi",
  slug: "kimchi",
  templateId: "kimchi" as const,
};

export const PLAN_LIMITS = {
  free: {
    activeProjects: 1,
    subscribersPerProject: 100,
  },
  pro: {
    activeProjects: Number.MAX_SAFE_INTEGER,
    subscribersPerProject: Number.MAX_SAFE_INTEGER,
  },
} as const;
