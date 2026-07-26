import { notFound } from "next/navigation";
import { ProjectEditor } from "@/components/editor/project-editor";
import { getOwnedProject } from "@/lib/project-queries";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const project = await getOwnedProject(projectId);
  if (!project) notFound();

  const initialTab =
    query.tab === "design" || query.tab === "settings"
      ? query.tab
      : "content";

  return (
    <ProjectEditor
      initialProject={project}
      initialTab={initialTab}
      siteUrl={await getSiteUrl()}
      emailDeliveryAvailable={Boolean(
        process.env.RESEND_API_KEY?.trim() &&
          process.env.RESEND_FROM_EMAIL?.trim(),
      )}
    />
  );
}
