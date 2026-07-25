import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplateRenderer } from "@/components/waitlist/template-renderer";
import { getOwnedProject } from "@/lib/project-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private project preview | LaunchBeam",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ProjectPreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getOwnedProject(projectId);
  if (!project) notFound();

  return <TemplateRenderer project={project} mode="preview" />;
}
