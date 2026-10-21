import { UnderConstruction } from "@/components/UnderConstruction";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";
import { PageHero } from "@/components/SiteChrome";
import { PersonFemaleIcon, PersonMaleIcon } from "@/components/PersonIcons";
import { directors } from "@/lib/site";

export const Route = createFileRoute("/directors")({
  head: () => ({
    meta: [
      { title: "Board of Directors — Natec Development Ltd." },
      { name: "description", content: "Meet the leadership of Natec Development Ltd., led by Chairman Md. Nazim Uddin." },
      { property: "og:title", content: "Natec Board of Directors" },
      { property: "og:description", content: "The people guiding Natec Development Ltd." },
    ],
  }),
  component: () => <UnderConstruction title="Directors" real={DirectorsPage} />,
});

export function DirectorsPage() {
  return (
    <>
      <PageHero eyebrow="Leadership" title="Board of Directors" />
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-20 sm:grid-cols-2 lg:grid-cols-3">
        {directors.map((d) => (
          <article key={d.name} className="flex flex-col border border-border bg-card p-7">
            <div className="flex h-16 w-16 items-center justify-center bg-primary text-primary-foreground">
              {d.gender === "female" ? <PersonFemaleIcon className="h-8 w-8" /> : <PersonMaleIcon className="h-8 w-8" />}
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-primary">{d.name}</h2>
            <p className="text-sm font-semibold text-accent">{d.role}</p>
            <p className="mt-4 flex-1 text-muted-foreground">{d.bio}</p>
            <div className="mt-6 space-y-1 border-t border-border pt-4 text-sm">
              <a href={`mailto:${d.email}`} className="flex items-center gap-2 hover:text-accent"><Mail className="h-4 w-4" />{d.email}</a>
              <a href={`tel:${d.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 hover:text-accent"><Phone className="h-4 w-4" />{d.phone}</a>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
