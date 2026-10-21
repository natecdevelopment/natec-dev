import { createFileRoute } from "@tanstack/react-router";
import { ProjectWizard } from "@/components/admin/ProjectWizard";

export const Route = createFileRoute("/admin/projects/new")({
  validateSearch: (s: Record<string, unknown>) => ({ kind: s["kind"] === "upcoming" ? ("upcoming" as const) : ("current" as const) }),
  component: NewProject,
});

function NewProject() {
  const { kind } = Route.useSearch();
  return <ProjectWizard key={kind} kind={kind} />;
}
