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
  screenshotUrl: string | null;
  backgroundImageUrl: string | null;
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
  screenshotUrl: null,
  backgroundImageUrl: null,
  socialLinks: [],
};

export function createStarterProjectContent(projectName: string): ProjectContent {
  const name = projectName.trim().slice(0, 80) || "Your product";
  return {
    ...DEFAULT_PROJECT_CONTENT,
    productName: name,
    kicker: "Coming soon",
    headline: `Be first to know when ${name} launches.`,
    description: `Join the ${name} waitlist for product updates and early access.`,
    successMessage: `We'll let you know when ${name} is ready.`,
  };
}

export const TEMPLATE_THEME_PRESETS = {
  "minimal-beam": {
    background: "#f7f7f4",
    foreground: "#111111",
    muted: "#666661",
    accent: "#111111",
    font: "argentum",
    radius: 12,
    alignment: "center",
    buttonStyle: "solid",
    animation: "subtle",
  },
  kimchi: {
    background: "#e9e5ff",
    foreground: "#18151f",
    muted: "#625b6c",
    accent: "#5b4de4",
    font: "argentum",
    radius: 20,
    alignment: "center",
    buttonStyle: "solid",
    animation: "subtle",
  },
  kevinora: {
    background: "#f2e7d4",
    foreground: "#34261e",
    muted: "#756253",
    accent: "#9a4f32",
    font: "editorial",
    radius: 18,
    alignment: "left",
    buttonStyle: "soft",
    animation: "subtle",
  },
  spotbeam: {
    background: "#f3f5f8",
    foreground: "#151923",
    muted: "#667085",
    accent: "#3157d5",
    font: "argentum",
    radius: 16,
    alignment: "left",
    buttonStyle: "solid",
    animation: "subtle",
  },
  darkrai: {
    background: "#090b11",
    foreground: "#f7f8fb",
    muted: "#aeb6c7",
    accent: "#9caeff",
    font: "argentum",
    radius: 22,
    alignment: "center",
    buttonStyle: "glass",
    animation: "subtle",
  },
} satisfies Record<TemplateId, ProjectTheme>;

export const DEFAULT_PROJECT_THEME: ProjectTheme =
  TEMPLATE_THEME_PRESETS.kimchi;

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
