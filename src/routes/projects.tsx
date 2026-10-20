import { UnderConstruction } from "@/components/UnderConstruction";
import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/SiteChrome";
import { FeaturedProject, OngoingProjects } from "@/components/ProjectsGrid";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Natec Development Ltd." },
      { name: "description", content: "Shobuj Angon (completed), Shobuj Aloy (50%), Shobuj Digonto (20%) and two projects launching in 2027." },
      { property: "og:title", content: "Natec Development Projects" },
      { property: "og:description", content: "Completed, ongoing and upcoming residential projects in Gazipur." },
    ],
  }),
  component: () => <UnderConstruction title="Projects" />,
});

export function ProjectsPage() {
  return (
    <>
      <PageHero eyebrow="Our projects" title="Residential projects in Gazipur." intro="The current status of every Natec Development project." />
      <section className="mx-auto max-w-7xl px-5 py-20">
        <h2 className="mb-8 text-sm font-bold uppercase tracking-[0.3em] text-accent">Completed</h2>
        <FeaturedProject />
        <h2 className="mb-8 mt-20 text-sm font-bold uppercase tracking-[0.3em] text-accent">Ongoing &amp; upcoming</h2>
        <OngoingProjects />
      </section>
    </>
  );
}
