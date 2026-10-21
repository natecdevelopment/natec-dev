import { createFileRoute } from "@tanstack/react-router";
import { ProjectWizard } from "@/components/admin/ProjectWizard";

export const Route = createFileRoute("/admin/projects/$id")({ component: EditProject });

function EditProject() {
  const { id } = Route.useParams();
  return <ProjectWizard key={id} id={id} />;
}
