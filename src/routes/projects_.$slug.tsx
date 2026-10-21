import { UnderConstruction } from "@/components/UnderConstruction";
import { useState } from "react";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpDown, Car, Check, Circle, Clock, Images, Phone, Shield, Sun, Zap, Building2, Home, Ruler, CalendarDays, BadgeCheck, Activity, MapPin, Droplets, Flame, Trees, Sparkles, Layers, LayoutGrid, BedDouble, Bath, DoorOpen, type LucideIcon } from "lucide-react";
import { PageHero, Reveal, WhatsAppIcon } from "@/components/SiteChrome";
import { InquiryForm } from "@/components/InquiryForm";
import { Lightbox } from "@/components/Lightbox";
import { ProjectCard, SoldOutBadge, StatusBadge } from "@/components/ProjectCard";
import { mapEmbed, waMessage } from "@/components/ProjectsGrid";
import { publicProjectsQuery } from "@/lib/projects-data";
import { sanitizeHtml } from "@/lib/sanitize";
import { company } from "@/lib/site";

const SITE = "https://natec-dev.lovable.app";
const abs = (u?: string | null) => (!u ? null : /^https?:/.test(u) ? u : `${SITE}${u.startsWith("/") ? "" : "/"}${u}`);
const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export const Route = createFileRoute("/projects_/$slug")({
  loader: async ({ context, params }) => {
    const all = await context.queryClient.ensureQueryData(publicProjectsQuery);
    const p = all.find((x) => x.slug === params.slug);
    if (!p) throw notFound();
    return { name: p.name, short: p.location_short || p.address, address: p.address, desc: plain(p.description), image: abs(p.cover?.public_url), flats: p.total_flats, kind: p.kind };
  },
  head: ({ loaderData: d, params }) => {
    if (!d) return { meta: [{ title: "Project unavailable | Natec Development" }, { name: "robots", content: "noindex" }] };
    const title = `${d.name} — ${d.short} | Natec Development`;
    const raw = d.desc || `${d.name}${d.flats ? `, ${d.flats} flats` : ""} at ${d.address}. A residential project by Natec Development Ltd.`;
    const desc = raw.length > 155 ? `${raw.slice(0, 152).trimEnd()}…` : raw;
    const url = `${SITE}/projects/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(d.image ? [{ property: "og:image", content: d.image }, { name: "twitter:image", content: d.image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["Residence", "ApartmentComplex"],
            name: d.name,
            url,
            description: desc,
            ...(d.image ? { image: d.image } : {}),
            ...(d.flats ? { numberOfAccommodationUnits: d.flats } : {}),
            address: { "@type": "PostalAddress", streetAddress: d.address, addressLocality: "Sreepur", addressRegion: "Gazipur", addressCountry: "BD" },
            containedInPlace: { "@type": "Place", name: "Rajendrapur, Sreepur, Gazipur" },
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
              { "@type": "ListItem", position: 3, name: d.name, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: () => <UnderConstruction title="Project" real={ProjectPage} />,
  errorComponent: () => <p className="p-10 pt-32 text-center">This project could not be loaded. Please refresh.</p>,
  notFoundComponent: () => (
    <section className="bg-ivory px-5 pb-24 pt-36 text-center">
      <p className="eyebrow text-brand-red">404</p>
      <h1 className="mt-3 text-primary">Project not found</h1>
      <p className="mx-auto mt-4 max-w-[46ch] text-muted-foreground">This project doesn't exist or isn't published yet.</p>
      <Link to="/projects" className="btn btn-primary mt-8">Back to all projects</Link>
    </section>
  ),
});

const FEATURE_ICONS: [RegExp, LucideIcon][] = [
  [/lift|elevator/i, ArrowUpDown], [/generator|power|electric/i, Zap], [/park|garage|car/i, Car],
  [/roof/i, Sun], [/secur|cctv|guard/i, Shield], [/water|reservoir/i, Droplets], [/gas|fire/i, Flame],
  [/garden|green|park/i, Trees],
];
const iconFor = (f: string) => FEATURE_ICONS.find(([r]) => r.test(f))?.[1] ?? Sparkles;

function ProgressRing({ pct }: { pct: number }) {
  const r = 70, c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-48 w-48">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-brand-red" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl text-navy">{pct}%</span>
        <span className="eyebrow mt-1 !text-[10px] text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}

function ProjectPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(publicProjectsQuery);
  const p = data.find((x) => x.slug === slug);
  const [lb, setLb] = useState<number | null>(null);
  if (!p) return null;
  const upcoming = p.kind === "upcoming";
  const others = data.filter((x) => x.id !== p.id);
  const visitWa = waMessage(`Hi Natec, I'd like to book a site visit for ${p.name}${p.location_short ? ` (${p.location_short})` : ""}.`);
  const mapSrc = mapEmbed(p.map_url || p.address);
  const directions = p.map_url && !/output=embed|\/maps\/embed/.test(p.map_url) && /^https?:/.test(p.map_url)
    ? p.map_url
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address)}`;

  const facts: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Building2, label: "Building type", value: p.building_type },
    { icon: Layers, label: "Floors", value: p.total_floors != null ? String(p.total_floors) : "" },
    { icon: LayoutGrid, label: "Units per floor", value: p.units_per_floor != null ? String(p.units_per_floor) : "" },
    { icon: Home, label: "Total flats", value: p.total_flats != null ? String(p.total_flats) : "" },
    { icon: Ruler, label: "Flat sizes", value: p.flat_sizes },
    { icon: Activity, label: "Status", value: upcoming ? "Upcoming" : p.status },
    { icon: CalendarDays, label: "Handover", value: p.handover_date },
    { icon: BadgeCheck, label: "Availability", value: p.availability },
  ].filter((f) => f.value);

  return (
    <div className="pb-20 lg:pb-0">
      <PageHero
        image={p.cover?.public_url ?? null}
        imageAlt={p.cover?.alt_text || `${p.name} by Natec Development`}
        crumbs={[{ label: "Home", to: "/" }, { label: "Projects", to: "/projects" }, { label: p.name }]}
        eyebrow={p.project_no || (upcoming ? "Upcoming project" : "Project")}
        title={p.name}
        intro={p.address}
      >
        <StatusBadge p={p} />
        <SoldOutBadge p={p} />
        {p.gallery.length > 0 && (
          <button onClick={() => setLb(0)} className="btn btn-ghost-dark ml-1"><Images className="h-4 w-4" /> View gallery</button>
        )}
      </PageHero>

      {facts.length > 0 && (
        <section aria-label="Key facts" className="border-b border-border bg-white">
          <dl className="container-x grid grid-cols-2 gap-x-6 gap-y-6 py-8 sm:grid-cols-3 lg:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="flex gap-3">
                <f.icon className="mt-1 h-5 w-5 shrink-0 text-brand-red" aria-hidden />
                <div><dt className="eyebrow !text-[10px] text-muted-foreground">{f.label}</dt><dd className="mt-1 font-semibold text-navy">{f.value}</dd></div>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="container-x grid gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-24">
        <div className="min-w-0 space-y-20">
          {p.gallery.length > 0 && (
            <Reveal as="section">
              <h2 className="text-primary">Gallery</h2>
              <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
                {p.gallery.map((g, i) => (
                  <button key={g.id} onClick={() => setLb(i)} className={`group overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2" : ""}`} aria-label={`Open photo ${i + 1}: ${g.alt_text || p.name}`}>
                    <img loading="lazy" src={g.public_url} alt={g.alt_text || `${p.name} photo ${i + 1}`} width={g.width ?? 800} height={g.height ?? 600} className="aspect-[4/3] h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </button>
                ))}
              </div>
            </Reveal>
          )}

          {p.units.length > 0 && (
            <Reveal as="section">
              <h2 className="text-primary">Unit types</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {p.units.map((u) => (
                  <div key={u.id} className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="!text-xl text-navy">{u.label}</h3>
                      {u.size_sqft != null && <span className="font-display text-2xl text-brand-red">{u.size_sqft.toLocaleString("en-US")} <span className="text-sm text-muted-foreground">sqft</span></span>}
                    </div>
                    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-navy">
                      {u.bedrooms != null && <li className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-brand-red" />{u.bedrooms} bed</li>}
                      {u.bathrooms != null && <li className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-brand-red" />{u.bathrooms} bath</li>}
                      {u.balconies != null && <li className="flex items-center gap-1.5"><DoorOpen className="h-4 w-4 text-brand-red" />{u.balconies} balcony</li>}
                    </ul>
                    {u.note && <p className="mt-3 text-sm text-muted-foreground">{u.note}</p>}
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {!upcoming && (
            <Reveal as="section">
              <h2 className="text-primary">Construction progress</h2>
              <div className="mt-8 grid items-start gap-10 md:grid-cols-[220px_1fr]">
                <ProgressRing pct={p.progress_pct} />
                {p.stages.length > 0 ? (
                  <ol className="relative space-y-6 border-l-2 border-border pl-8">
                    {p.stages.map((s) => {
                      const done = s.status === "Done", now = s.status === "In progress";
                      const Icon = done ? Check : now ? Clock : Circle;
                      return (
                        <li key={s.id} className="relative">
                          <span className={`absolute -left-[45px] flex h-8 w-8 items-center justify-center rounded-full border-2 ${done ? "border-navy bg-navy text-white" : now ? "border-brand-red bg-white text-brand-red" : "border-border bg-white text-muted-foreground"}`}><Icon className="h-4 w-4" /></span>
                          <div className="flex flex-wrap items-baseline gap-x-3">
                            <h3 className="!text-lg text-navy">{s.stage}</h3>
                            <span className={`eyebrow !text-[10px] ${done ? "text-navy" : now ? "text-brand-red" : "text-muted-foreground"}`}>{s.status}</span>
                            {s.completed_on && <span className="text-xs text-muted-foreground">{new Date(s.completed_on).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                          </div>
                          {s.note && <p className="mt-1 text-sm text-muted-foreground">{s.note}</p>}
                        </li>
                      );
                    })}
                  </ol>
                ) : <p className="text-muted-foreground">Stage-by-stage updates will be posted here.</p>}
              </div>
            </Reveal>
          )}

          {(p.description || p.features.length > 0) && (
            <Reveal as="section">
              <h2 className="text-primary">About {p.name}</h2>
              {p.description && <div className="mt-6 max-w-[66ch] space-y-4 text-foreground/85 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.description) }} />}
              {p.features.length > 0 && (
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {p.features.map((f) => { const I = iconFor(f); return (
                    <li key={f} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"><I className="h-5 w-5 shrink-0 text-brand-red" aria-hidden /><span className="font-medium text-navy">{f}</span></li>
                  ); })}
                </ul>
              )}
            </Reveal>
          )}

          <Reveal as="section">
            <h2 className="text-primary">Location</h2>
            <p className="mt-3 flex gap-2 text-muted-foreground"><MapPin className="mt-1 h-4 w-4 shrink-0 text-navy" />{p.address}</p>
            <iframe title={`Map showing ${p.name}`} src={mapSrc} className="mt-6 h-80 w-full rounded-2xl border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            <a href={directions} target="_blank" rel="noreferrer" className="btn btn-primary mt-6">Get directions</a>
          </Reveal>

          <section id="enquire">
            <InquiryForm title={`Enquire about ${p.name}`} defaultProject={p.name} />
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28 rounded-2xl border border-border bg-card p-7 shadow-lg">
            <p className="eyebrow !text-[11px] text-brand-red">{p.project_no || "Upcoming"}</p>
            <h2 className="mt-1 !text-2xl text-primary">{p.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2"><StatusBadge p={p} className="!bg-ivory !text-navy" /><SoldOutBadge p={p} /></div>
            <p className="mt-4 text-sm text-muted-foreground">Visit the site at Rajendrapur Bazar or talk to our team.</p>
            <a href={visitWa} target="_blank" rel="noreferrer" className="btn btn-primary mt-6 w-full"><WhatsAppIcon /> Book a site visit</a>
            <a href={company.phoneLink} className="btn mt-3 w-full border border-navy text-navy"><Phone className="h-4 w-4" /> Call {company.phone}</a>
            <a href="#enquire" className="mt-4 block text-center text-sm text-navy underline">Send an enquiry</a>
          </div>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="section-pad bg-ivory" aria-label="Other projects">
          <div className="container-x">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-primary">Other projects</h2>
              <Link to="/projects" className="eyebrow !text-[12px] text-brand-red">All projects →</Link>
            </div>
            <div className="-mx-5 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4">
              {others.map((o) => <div key={o.id} className="w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"><ProjectCard p={o} /></div>)}
            </div>
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-border bg-white/95 p-3 backdrop-blur lg:hidden">
        <a href={visitWa} target="_blank" rel="noreferrer" className="btn btn-primary flex-1 !px-3"><WhatsAppIcon /> Book a site visit</a>
        <a href={company.phoneLink} className="btn flex-none border border-navy !px-4 text-navy" aria-label={`Call ${company.phone}`}><Phone className="h-4 w-4" /> Call</a>
      </div>

      {lb != null && <Lightbox items={p.gallery} index={lb} onIndex={setLb} onClose={() => setLb(null)} label={p.name} />}
    </div>
  );
}

