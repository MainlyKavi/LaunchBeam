import { z } from "zod";
import {
  contrastRatio,
  isSafeOpaqueHexColor,
  isSafePersistedHexColor,
} from "@/lib/color-contrast";
import {
  APPROVED_FONTS,
  TEMPLATE_IDS,
} from "@/lib/types";

const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

function hasSafeProtocol(value: string) {
  try {
    return SAFE_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

export const safeUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .url("Enter a complete http or https URL.")
  .refine(hasSafeProtocol, "Only http and https URLs are allowed.");

const nullableUrlSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  safeUrlSchema.nullable(),
);

export const templateIdSchema = z.enum(TEMPLATE_IDS);

export const projectContentSchema = z
  .object({
    productName: z.string().trim().max(80).optional(),
    kicker: z.string().trim().min(1, "Add a short kicker.").max(60),
    headline: z.string().trim().min(1, "Add a headline.").max(140),
    description: z.string().trim().min(1, "Add a description.").max(400),
    buttonText: z.string().trim().min(1, "Add button text.").max(60),
    successTitle: z.string().trim().min(1).max(100),
    successMessage: z.string().trim().min(1).max(240),
    logoUrl: nullableUrlSchema,
    heroImageUrl: nullableUrlSchema,
    screenshotUrl: nullableUrlSchema.default(null),
    backgroundImageUrl: nullableUrlSchema.default(null),
    socialLinks: z
      .array(
        z
          .object({
            platform: z.string().trim().min(1).max(40),
            url: safeUrlSchema,
          })
          .strict(),
      )
      .max(5),
  })
  .strict();

function createProjectThemeSchema(
  isSafeColor: (value: string) => boolean,
) {
  const safeColorSchema = z
    .string()
    .refine(isSafeColor, "Use a safe hex color.");

  return z
    .object({
      background: safeColorSchema,
      foreground: safeColorSchema,
      muted: safeColorSchema,
      accent: safeColorSchema,
      font: z.enum(APPROVED_FONTS),
      radius: z.coerce
        .number()
        .finite()
        .transform((value) => Math.max(0, Math.min(36, Math.round(value)))),
      alignment: z.enum(["left", "center"]),
      buttonStyle: z.enum(["solid", "outline", "soft", "glass"]),
      animation: z.enum(["none", "subtle", "expressive"]),
    })
    .strict();
}

// Stored themes may contain the safe 4/8-digit hex colors accepted by earlier
// releases. Preserve those values on reads; stricter accessibility rules apply
// only when a project is created or updated.
export const persistedProjectThemeSchema = createProjectThemeSchema(
  isSafePersistedHexColor,
);

export const projectThemeSchema = createProjectThemeSchema(
  isSafeOpaqueHexColor,
)
  .superRefine((theme, context) => {
    const foregroundContrast = contrastRatio(
      theme.foreground,
      theme.background,
    );
    if (foregroundContrast !== null && foregroundContrast < 4.5) {
      context.addIssue({
        code: "custom",
        path: ["foreground"],
        message: "Foreground and background colors need stronger contrast.",
      });
    }

    const mutedContrast = contrastRatio(theme.muted, theme.background);
    if (mutedContrast !== null && mutedContrast < 4.5) {
      context.addIssue({
        code: "custom",
        path: ["muted"],
        message: "Muted text and background colors need stronger contrast.",
      });
    }

    if (
      (theme.buttonStyle === "outline" || theme.buttonStyle === "soft") &&
      (contrastRatio(theme.accent, theme.background) ?? 0) < 4.5
    ) {
      context.addIssue({
        code: "custom",
        path: ["accent"],
        message: "Accent and background colors need stronger contrast.",
      });
    }
  });

export const projectSettingsSchema = z
  .object({
    showSignupCount: z.boolean(),
    referralsEnabled: z.boolean(),
    requireEmailVerification: z.boolean(),
    collectName: z.boolean(),
    customQuestion: z
      .object({
        label: z.string().trim().min(1).max(120),
        required: z.boolean(),
      })
      .strict()
      .nullable(),
    privacyUrl: nullableUrlSchema,
  })
  .strict();

const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a project name.")
  .max(80);
const projectSlugInputSchema = z.string().trim().min(1).max(100);

export const projectCreateSchema = z
  .object({
    name: projectNameSchema,
    slug: projectSlugInputSchema,
    templateId: templateIdSchema.default("kimchi"),
    content: projectContentSchema.optional(),
    theme: projectThemeSchema.optional(),
    settings: projectSettingsSchema.optional(),
  })
  .strict();

export const projectUpdateSchema = z
  .object({
    name: projectNameSchema.optional(),
    slug: projectSlugInputSchema.optional(),
    templateId: templateIdSchema.optional(),
    content: projectContentSchema.optional(),
    theme: projectThemeSchema.optional(),
    settings: projectSettingsSchema.optional(),
  })
  .strict();

export const publishSchema = z
  .object({
    publish: z.boolean(),
  })
  .strict();

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
