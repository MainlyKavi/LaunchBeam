import type {
  ProjectContent,
  ProjectSettings,
  ProjectTheme,
  TemplateId,
} from "@/lib/types";
import {
  DEFAULT_PROJECT_CONTENT,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_PROJECT_THEME,
  TEMPLATE_IDS,
} from "@/lib/types";
import {
  projectContentSchema,
  projectSettingsSchema,
  projectThemeSchema,
} from "@/lib/validation/project";

export type RawProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  status: "draft" | "published" | "archived";
  template_id: string;
  content: unknown;
  theme: unknown;
  settings: unknown;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectView = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  status: "draft" | "published" | "archived";
  templateId: TemplateId;
  content: ProjectContent;
  theme: ProjectTheme;
  settings: ProjectSettings;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function coerceTemplateId(value: string): TemplateId {
  return TEMPLATE_IDS.includes(value as TemplateId)
    ? (value as TemplateId)
    : "kimchi";
}

export function mapProjectRow(row: RawProjectRow): ProjectView {
  const contentResult = projectContentSchema.safeParse(row.content);
  const themeResult = projectThemeSchema.safeParse(row.theme);
  const settingsResult = projectSettingsSchema.safeParse(row.settings);

  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    templateId: coerceTemplateId(row.template_id),
    content: contentResult.success
      ? contentResult.data
      : DEFAULT_PROJECT_CONTENT,
    theme: themeResult.success ? themeResult.data : DEFAULT_PROJECT_THEME,
    settings: settingsResult.success
      ? settingsResult.data
      : DEFAULT_PROJECT_SETTINGS,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
