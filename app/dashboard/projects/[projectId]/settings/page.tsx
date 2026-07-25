import { redirect } from "next/navigation";

export default async function ProjectSettingsRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/dashboard/projects/${projectId}/edit?tab=settings`);
}
