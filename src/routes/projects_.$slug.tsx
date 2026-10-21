import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { UnderConstruction } from "@/components/UnderConstruction";
import { ProjectDetail } from "@/components/ProjectsGrid";
import { publicProjectsQuery } from "@/lib/projects-data";

export const Route = createFileRoute("/projects_/$slug")({
  loader: async ({ context, params }) => {
    const all = await context.queryClient.ensureQueryData(publicProjectsQuery);
    const p = all.find((x) => x.slug === params.slug);
    if (!p) throw notFound();
    return { name: p.name, address: p.address, image: p.cover?.public_url ?? null };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — Natec Development Ltd.` : "Project — Natec Development Ltd.";
    const desc = loaderData ? `${loaderData.name}, ${loaderData.address}. A Natec Development residential project.` : "A Natec Development residential project.";
    const img = loaderData?.image && /^https:/.test(loaderData.image) ? loaderData.image : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  component: () => <UnderConstruction title="Project" real={ProjectPage} />,
  errorComponent: () => <p className="p-10 text-center">This project could not be loaded. Please refresh.</p>,
  notFoundComponent: () => (
    <div className="p-16 text-center">
      <p>This project isn't available.</p>
      <Link to="/projects" className="btn btn-primary mt-6">All projects</Link>
    </div>
  ),
});

function ProjectPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(publicProjectsQuery);
  const p = data.find((x) => x.slug === slug);
  if (!p) return null;
  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <Link to="/projects" className="eyebrow mb-8 inline-block text-brand-red">← All projects</Link>
      <ProjectDetail p={p} full />
    </section>
  );
}
