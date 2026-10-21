import { UnderConstruction } from "@/components/UnderConstruction";
import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/SiteChrome";
import { ProjectsList } from "@/components/ProjectsGrid";
import { publicProjectsQuery } from "@/lib/projects-data";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Natec Development Ltd." },
      { name: "description", content: "Completed, ongoing and upcoming Natec Development residential projects in Sreepur, Gazipur." },
      { property: "og:title", content: "Natec Development Projects" },
      { property: "og:description", content: "Completed, ongoing and upcoming residential projects in Gazipur." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicProjectsQuery),
  component: () => <UnderConstruction title="Projects" real={ProjectsPage} />,
  errorComponent: () => <p className="p-10 text-center">Projects could not be loaded. Please refresh.</p>,
  notFoundComponent: () => <p className="p-10 text-center">No projects found.</p>,
});

export function ProjectsPage() {
  return (
    <>
      <PageHero eyebrow="Our projects" title="Residential projects in Gazipur." intro="The current status of every Natec Development project." />
      <section className="mx-auto max-w-7xl px-5 py-20">
        <ProjectsList />
      </section>
    </>
  );
}
