import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/SiteChrome";
import { values } from "@/lib/site";
import side from "@/assets/angon-side.jpg.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Natec Development Ltd." },
      { name: "description", content: "Established in 2023 in Sreepur, Gazipur. Our mission, vision and core values." },
      { property: "og:title", content: "About Natec Development Ltd." },
      { property: "og:description", content: "Our mission, vision and the values behind every Natec project." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <PageHero eyebrow="About us" title="A growing developer rooted in Sreepur, Gazipur." intro="Natec Development Ltd. was established in 2023 and works across every stage of property development." />
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-2">
        <img src={side.url} alt="Natec residential building" className="aspect-square w-full object-cover" />
        <div className="space-y-5 text-muted-foreground">
          <h2 className="text-3xl font-semibold text-primary">About Natec Development Ltd.</h2>
          <p>Natec Development Ltd. is a real estate development company established in 2023 and based in Sreepur, Gazipur. We work across several stages of property development, including land acquisition, project planning, building design, construction coordination, marketing, sales, and property management.</p>
          <p>We believe effective development starts with understanding the project's purpose and the needs of the people it is intended to serve. Our approach emphasizes thoughtful planning, professional coordination, and clear communication throughout the project.</p>
          <p>As a growing company, we aim to build lasting relationships with clients and partners through responsible service and careful attention to each project's requirements.</p>
        </div>
      </section>
      <section className="bg-ink py-20 text-ink-foreground">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-caution">Our mission</p>
            <p className="mt-4 font-display text-2xl leading-snug">To provide dependable real estate development services through thoughtful planning, practical design, and careful project coordination. We aim to understand our clients' needs, uphold professional standards, and support projects that create long-term value for clients, partners, and communities.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-caution">Our vision</p>
            <p className="mt-4 font-display text-2xl leading-snug">To grow as a trusted real estate development company in Bangladesh, recognized for responsible development, quality-focused service, and lasting relationships with clients and partners — contributing positively to the places where we work.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <h2 className="text-4xl font-semibold text-primary">Our values</h2>
        <div className="mt-10 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="bg-background p-8">
              <div className="h-1 w-10 bg-accent" />
              <h3 className="mt-5 text-2xl font-semibold text-primary">{v.title}</h3>
              <p className="mt-2 text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
