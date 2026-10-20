import { createFileRoute, Link } from "@tanstack/react-router";
import { ConstructionHero } from "@/components/ConstructionHero";
import { FeaturedProject, OngoingProjects } from "@/components/ProjectsGrid";
import { services } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Natec Development Ltd. — Real Estate Developer in Gazipur" },
      { name: "description", content: "Natec Development Ltd. builds well-planned residential projects in Sreepur, Gazipur — from land acquisition to construction and sales." },
      { property: "og:title", content: "Natec Development Ltd. — Real Estate Developer in Gazipur" },
      { property: "og:description", content: "Well-planned residential developments in Sreepur, Gazipur, Bangladesh." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <ConstructionHero />
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Welcome</p>
            <h2 className="mt-3 text-4xl font-semibold text-primary md:text-5xl">Careful planning. Clear communication. Lasting value.</h2>
          </div>
          <div className="space-y-4 text-muted-foreground">
            <p>Established in 2023, Natec Development Ltd. is a real estate development company based in Sreepur, Gazipur, Bangladesh. We support clients through key stages of property development, from land acquisition and project planning to building design, construction management, marketing, sales, and property management.</p>
            <p>We approach each project with careful planning, clear communication, and attention to the client's requirements.</p>
            <Link to="/about" className="inline-block font-semibold text-accent">More about us →</Link>
          </div>
        </div>
        <div className="mt-14 grid grid-cols-2 border-t border-l border-border md:grid-cols-4">
          {[["2023", "Established"], ["1", "Project completed"], ["2", "Projects ongoing"], ["2", "Launching in 2027"]].map(([n, l]) => (
            <div key={l} className="border-r border-b border-border p-6">
              <div className="font-display text-5xl font-semibold text-primary">{n}</div>
              <div className="mt-1 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-10 flex items-end justify-between">
            <h2 className="text-4xl font-semibold text-primary">Our projects</h2>
            <Link to="/projects" className="font-semibold text-accent">All projects →</Link>
          </div>
          <FeaturedProject />
          <div className="mt-12"><OngoingProjects /></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="mb-10 flex items-end justify-between">
          <h2 className="text-4xl font-semibold text-primary">What we do</h2>
          <Link to="/services" className="font-semibold text-accent">All services →</Link>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-3">
          {services.map((s, i) => (
            <div key={s.title} className="bg-background p-6">
              <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-xl font-semibold text-primary">{s.title}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 md:flex-row md:items-center">
          <h2 className="text-3xl font-semibold md:text-4xl">Let's discuss your project.</h2>
          <Link to="/contact" className="bg-accent px-6 py-3 font-semibold text-accent-foreground">Get in touch</Link>
        </div>
      </section>
    </>
  );
}
