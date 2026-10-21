import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { company } from "@/lib/site";
import { WhatsAppIcon } from "@/components/SiteChrome";
import { publicProjectsQuery, type ProjectWithMedia } from "@/lib/projects-data";
import { sanitizeHtml } from "@/lib/sanitize";

export const waMessage = (msg: string) => `${company.whatsappLink}?text=${encodeURIComponent(msg)}`;
export const WA_UPCOMING = waMessage("Hi Natec, I'm interested in your upcoming projects.");

export function usePublicProjects() {
  const { data } = useSuspenseQuery(publicProjectsQuery);
  return { current: data.filter((p) => p.kind === "current"), upcoming: data.filter((p) => p.kind === "upcoming") };
}

/** Availability badge (red, as before). */
export function AvailabilityBadge({ text, className = "" }: { text: string; className?: string }) {
  return <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white ${className}`} style={{ background: "#9B0707" }}>{text}</span>;
}

export function ProjectCta({ p, className = "btn btn-primary mt-6 w-fit" }: { p: ProjectWithMedia; className?: string }) {
  if (p.availability === "Sold out")
    return <a href={WA_UPCOMING} target="_blank" rel="noreferrer" className={className}><WhatsAppIcon /> Register interest for upcoming projects</a>;
  return <a href={waMessage(`Hi Natec, I'm interested in ${p.name} (${p.location_short || p.address}).`)} target="_blank" rel="noreferrer" className={className}><WhatsAppIcon /> Register interest</a>;
}

export function ProjectDetail({ p, full }: { p: ProjectWithMedia; full?: boolean }) {
  const [i, setI] = useState(0);
  const img = p.gallery[i];
  return (
    <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="relative">
          {img && <img loading="lazy" src={img.public_url} alt={img.alt_text || p.name} title={img.title || undefined} width={img.width ?? undefined} height={img.height ?? undefined} className="aspect-[4/3] w-full object-cover" />}
          <AvailabilityBadge text={p.availability} className="absolute right-4 top-4" />
        </div>
        {p.gallery.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-3">
            {p.gallery.map((g, n) => (
              <button key={g.id} onClick={() => setI(n)} className={`border-2 ${n === i ? "border-accent" : "border-transparent opacity-70"}`}>
                <img loading="lazy" src={g.public_url} alt={g.alt_text || `${p.name} view ${n + 1}`} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex flex-wrap gap-2">
          <span className={`w-fit px-3 py-1 text-xs font-bold uppercase tracking-wider ${p.status === "Completed" ? "bg-success text-ink-foreground" : "bg-caution text-ink"}`}>{p.status}</span>
          <AvailabilityBadge text={p.availability} />
        </div>
        {p.project_no && <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{p.project_no}</p>}
        {full ? <h1 className="mt-1 text-4xl font-semibold text-primary">{p.name}</h1> : (
          <h3 className="mt-1 text-4xl font-semibold text-primary"><Link to="/projects/$slug" params={{ slug: p.slug }} className="hover:underline">{p.name}</Link></h3>
        )}
        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-5 text-sm">
          <div className="col-span-2"><dt className="text-muted-foreground">Address</dt><dd className="font-semibold">{p.address}</dd></div>
          {p.building_type && <div><dt className="text-muted-foreground">Type</dt><dd className="font-semibold">Residential building, {p.building_type}</dd></div>}
          {p.total_flats != null && <div><dt className="text-muted-foreground">Total flats</dt><dd className="font-semibold">{p.total_flats}</dd></div>}
          {full && p.flat_sizes && <div><dt className="text-muted-foreground">Flat sizes</dt><dd className="font-semibold">{p.flat_sizes}</dd></div>}
          {full && p.handover_date && <div><dt className="text-muted-foreground">Handover</dt><dd className="font-semibold">{p.handover_date}</dd></div>}
        </dl>
        {p.kind === "current" && (
          <div className="mt-5">
            <div className="flex justify-between text-sm font-semibold"><span>Construction</span><span>{p.progress_pct}% complete</span></div>
            <div className="mt-2 h-2 bg-muted"><div className="h-full bg-accent" style={{ width: `${p.progress_pct}%` }} /></div>
          </div>
        )}
        <ProjectCta p={p} />
      </div>
      {full && (
        <div className="space-y-8 md:col-span-2">
          {p.description && <div className="prose-natec max-w-[64ch] text-foreground/85 [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.description) }} />}
          {p.features.length > 0 && (
            <ul className="flex flex-wrap gap-2">{p.features.map((f) => <li key={f} className="rounded-full border border-border px-3 py-1 text-sm">{f}</li>)}</ul>
          )}
          {p.kind === "current" && p.stages.length > 0 && (
            <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {p.stages.map((s) => (
                <li key={s.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                  <p className="eyebrow !text-[11px] text-navy">{s.stage}</p>
                  <p className={`mt-1 font-semibold ${s.status === "Done" ? "text-success" : s.status === "In progress" ? "text-brand-red" : "text-muted-foreground"}`}>{s.status}</p>
                  {s.completed_on && <p className="text-xs text-muted-foreground">{s.completed_on}</p>}
                  {s.note && <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>}
                </li>
              ))}
            </ol>
          )}
          {p.map_url && <iframe title={`Map of ${p.name}`} src={mapEmbed(p.map_url)} className="h-80 w-full rounded-xl border-0" loading="lazy" />}
        </div>
      )}
    </div>
  );
}

export function mapEmbed(url: string) {
  if (/output=embed|\/maps\/embed/.test(url)) return url;
  return `https://www.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
}

export function UpcomingCards({ dark }: { dark?: boolean }) {
  const { upcoming } = usePublicProjects();
  if (!upcoming.length) return null;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {upcoming.map((u) => (
        <article key={u.id} className={`overflow-hidden rounded-2xl ${dark ? "bg-white/5" : "border border-border bg-card"}`}>
          <div className="relative">
            {u.cover && <img loading="lazy" src={u.cover.public_url} alt={u.cover.alt_text || u.name} title={u.cover.title || undefined} className="aspect-[4/3] w-full object-cover" />}
            <span className="eyebrow absolute left-5 top-5 rounded-full bg-navy px-3 py-1.5 !text-[10px] text-white">Upcoming</span>
          </div>
          <div className="p-6">
            <h3 className={`!text-2xl ${dark ? "" : "text-primary"}`}>{u.name}</h3>
            <p className={`mt-1 text-sm ${dark ? "text-muted-dark" : "text-muted-foreground"}`}>{u.location_short || u.address}</p>
            <a href={waMessage(`Hi Natec, I'm interested in your upcoming project at ${u.location_short || u.address}.`)} target="_blank" rel="noreferrer" className="btn btn-primary mt-5"><WhatsAppIcon /> Register interest</a>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ProjectsList() {
  const { current } = usePublicProjects();
  const completed = current.filter((p) => p.status === "Completed");
  const ongoing = current.filter((p) => p.status !== "Completed");
  return (
    <>
      {completed.length > 0 && <h2 className="mb-8 text-sm font-bold uppercase tracking-[0.3em] text-accent">Completed</h2>}
      <div className="space-y-16">{completed.map((p) => <ProjectDetail key={p.id} p={p} />)}</div>
      {ongoing.length > 0 && <h2 className="mb-8 mt-20 text-sm font-bold uppercase tracking-[0.3em] text-accent">Ongoing</h2>}
      <div className="space-y-16">{ongoing.map((p) => <ProjectDetail key={p.id} p={p} />)}</div>
      <h2 className="mb-8 mt-20 text-sm font-bold uppercase tracking-[0.3em] text-accent">Upcoming projects</h2>
      <UpcomingCards />
    </>
  );
}
