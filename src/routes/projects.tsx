import { UnderConstruction } from "@/components/UnderConstruction";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHero, Reveal, WhatsAppIcon } from "@/components/SiteChrome";
import { ProjectCard } from "@/components/ProjectCard";
import { waMessage, WA_UPCOMING } from "@/components/ProjectsGrid";
import { publicProjectsQuery, type ProjectWithMedia } from "@/lib/projects-data";

const SITE = "https://natec-dev.lovable.app";
const TABS = ["all", "completed", "ongoing", "upcoming"] as const;
type Tab = (typeof TABS)[number];
const TITLE = "Residential Projects in Gazipur | Natec Development Ltd.";
const DESC = "Natec residential projects in Rajendrapur, Sreepur, Gazipur: 75 homes delivered or under construction, all sold, plus upcoming projects.";
const WA_VISIT = waMessage("Hi Natec, I'd like to book a site visit at Rajendrapur Bazar.");

function matchesTab(p: Pick<ProjectWithMedia, "kind" | "status">, tab: Tab) {
  if (tab === "all") return true;
  if (tab === "upcoming") return p.kind === "upcoming";
  if (p.kind === "upcoming") return false;
  return tab === "completed" ? p.status === "Completed" : p.status !== "Completed";
}

export const Route = createFileRoute("/projects")({
  validateSearch: (s: Record<string, unknown>): { filter?: Tab } => {
    const f = String(s["filter"] ?? "");
    return (TABS as readonly string[]).includes(f) && f !== "all" ? { filter: f as Tab } : {};
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(publicProjectsQuery),
  head: ({ loaderData }) => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/projects` },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: `${SITE}/projects/shobuj-digonto/aerial.webp` },
      { name: "twitter:image", content: `${SITE}/projects/shobuj-digonto/aerial.webp` },
    ],
    links: [{ rel: "canonical", href: `${SITE}/projects` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Natec Development residential projects",
          itemListElement: (loaderData ?? []).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: p.name,
            url: p.kind === "upcoming" ? `${SITE}/projects` : `${SITE}/projects/${p.slug}`,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
            { "@type": "ListItem", position: 2, name: "Projects", item: `${SITE}/projects` },
          ],
        }),
      },
    ],
  }),
  component: () => <UnderConstruction title="Projects" real={ProjectsPage} />,
  errorComponent: () => <p className="p-10 pt-32 text-center">Projects could not be loaded. Please refresh.</p>,
  notFoundComponent: () => <p className="p-10 pt-32 text-center">No projects found.</p>,
});

function ProjectsPage() {
  const { data } = useSuspenseQuery(publicProjectsQuery);
  const { filter = "all" } = Route.useSearch();
  const list = data.filter((p) => matchesTab(p, filter));
  const count = (t: Tab) => data.filter((p) => matchesTab(p, t)).length;
  return (
    <>
      <PageHero
        image="/projects/shobuj-digonto/aerial.webp"
        imageAlt="Aerial view of Shobuj Digonto, a Natec residential building in Rajendrapur, Sreepur, Gazipur"
        imagePosition="center 40%"
        crumbs={[{ label: "Home", to: "/" }, { label: "Projects" }]}
        eyebrow="Our projects"
        title={<>Our residential projects in <em className="accent-dark">Gazipur</em></>}
        intro="75 homes delivered or under construction — all sold."
      >
        <a href={WA_UPCOMING} target="_blank" rel="noreferrer" className="btn btn-primary"><WhatsAppIcon /> Register for upcoming projects</a>
        <a href={WA_VISIT} target="_blank" rel="noreferrer" className="btn btn-ghost-dark">Book a site visit</a>
      </PageHero>

      <section className="section-pad bg-ivory">
        <div className="container-x">
          <div role="tablist" aria-label="Filter projects" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
            {TABS.map((t) => {
              const on = t === filter;
              return (
                <Link
                  key={t}
                  to="/projects"
                  search={t === "all" ? {} : { filter: t }}
                  role="tab"
                  aria-selected={on}
                  resetScroll={false}
                  className={`eyebrow shrink-0 rounded-full border px-5 py-2.5 !text-[12px] transition ${on ? "border-navy bg-navy text-white" : "border-border bg-white text-navy hover:border-navy"}`}
                >
                  {t === "all" ? "All" : t[0]!.toUpperCase() + t.slice(1)} <span className="opacity-60">({count(t)})</span>
                </Link>
              );
            })}
          </div>

          {list.length ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p, i) => <Reveal key={p.id} delay={(i % 3) * 100} className="h-full"><ProjectCard p={p} /></Reveal>)}
            </div>
          ) : <p className="mt-10 text-muted-foreground">No projects in this category yet.</p>}
        </div>
      </section>

      <section className="section-pad bg-navy text-white">
        <Reveal className="container-x flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <h2 className="max-w-[24ch]">Looking for your next home? <em className="accent-dark">Register for our upcoming projects</em></h2>
          <a href={WA_UPCOMING} target="_blank" rel="noreferrer" className="btn btn-primary shrink-0"><WhatsAppIcon /> Register on WhatsApp</a>
        </Reveal>
      </section>
    </>
  );
}
