import { UnderConstruction } from "@/components/UnderConstruction";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/SiteChrome";
import { services } from "@/lib/site";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Natec Development Ltd." },
      { name: "description", content: "Land acquisition, planning, financing, permits, design, construction management, sales, property management and sustainable development." },
      { property: "og:title", content: "Natec Development Services" },
      { property: "og:description", content: "Nine services covering every stage of real estate development." },
    ],
  }),
  component: () => <UnderConstruction title="Services" real={ServicesPage} />,
});

export function ServicesPage() {
  return (
    <>
      <PageHero eyebrow="Our services" title="Support at every stage of development." intro="From the first look at a plot of land to managing the finished property." />
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-px bg-border md:grid-cols-3">
          {services.map((s, i) => (
            <article key={s.title} className="group bg-background p-8 transition hover:bg-secondary">
              <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-3 text-2xl font-semibold text-primary">{s.title}</h2>
              <p className="mt-3 text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/contact" className="inline-block bg-accent px-6 py-3 font-semibold text-accent-foreground">Discuss your requirements</Link>
        </div>
      </section>
    </>
  );
}
