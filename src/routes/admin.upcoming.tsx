import { createFileRoute } from "@tanstack/react-router";
import { ProjectList } from "@/components/admin/ProjectList";

export const Route = createFileRoute("/admin/upcoming")({ component: () => <ProjectList kind="upcoming" /> });
