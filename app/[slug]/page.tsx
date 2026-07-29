import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplateRenderer } from "@/components/waitlist/template-renderer";
import {
  getPublishedProject,
  getPublicSubscriberCount,
} from "@/lib/project-queries";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) {
    return {
      title: "Waitlist not found | LaunchBeam",
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = await getSiteUrl();
  const canonical = `${siteUrl}/${project.slug}`;
  const image = project.content.heroImageUrl ?? project.content.logoUrl;
  const title = `${project.name} | Join the waitlist`;

  return {
    title,
    description: project.content.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: project.content.description,
      type: "website",
      url: canonical,
      siteName: project.name,
      images: image
        ? [{ url: image, alt: `${project.name} preview` }]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description: project.content.description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicWaitlistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) notFound();

  const subscriberCount = project.settings.showSignupCount
    ? await getPublicSubscriberCount(project.id)
    : undefined;
  const publicProject = {
    id: project.id,
    name: project.name,
    slug: project.slug,
    templateId: project.templateId,
    content: project.content,
    theme: project.theme,
    settings: project.settings,
    subscriberCount,
  };

  return (
    <TemplateRenderer
      project={publicProject}
      mode="public"
      turnstileSiteKey={
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null
      }
    />
  );
}
