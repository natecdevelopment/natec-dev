import { Link } from "@tanstack/react-router";
import { Building2, Home, MapPin } from "lucide-react";
import { WhatsAppIcon } from "@/components/SiteChrome";
import { waMessage } from "@/components/ProjectsGrid";
import type { ProjectWithMedia } from "@/lib/projects-data";
import { isListed } from "@/lib/construction-data";

export function StatusBadge({ p, className = "" }: { p: ProjectWithMedia; className?: string }) {
  const upcoming = p.kind === "upcoming";
  const label = upcoming ? "Coming soon" : p.status;
  const tone = upcoming ? "bg-navy text-white" : p.status === "Completed" ? "bg-white text-navy" : "bg-ivory text-navy";
  return <span className={`eyebrow rounded-full px-3 py-1.5 !text-[10px] ${tone} ${className}`}>{label}</span>;
}
export function SoldOutBadge({ p, className = "" }: { p: ProjectWithMedia; className?: string }) {
  if (p.availability !== "Sold out") return null;
  return <span className={`eyebrow rounded-full bg-brand-red px-3 py-1.5 !text-[10px] text-white ${className}`}>Sold out</span>;
}

export const registerMsg = (p: ProjectWithMedia) =>
  waMessage(`Hi Natec, I'd like to register interest in ${p.name}${p.location_short ? ` (${p.location_short})` : ""}.`);

export function ProjectCard({ p }: { p: ProjectWithMedia }) {
  const upcoming = p.kind === "upcoming";
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative overflow-hidden">
        {p.cover ? (
          <img loading="lazy" src={p.cover.public_url} alt={p.cover.alt_text || `${p.name} by Natec Development`} width={p.cover.width ?? 800} height={p.cover.height ?? 600} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" />
        ) : <div className="aspect-[4/3] w-full bg-navy" />}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2"><StatusBadge p={p} /><SoldOutBadge p={p} /></div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        {p.project_no && <p className="eyebrow !text-[11px] text-brand-red">{p.project_no}</p>}
        <h3 className="mt-1 !text-2xl text-primary">{p.name}</h3>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {(p.location_short || p.address) && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-navy" />{p.location_short || p.address}</li>}
          {p.building_type && <li className="flex gap-2"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-navy" />{p.building_type}</li>}
          {p.total_flats != null && <li className="flex gap-2"><Home className="mt-0.5 h-4 w-4 shrink-0 text-navy" />{p.total_flats} flats</li>}
        </ul>
        {!upcoming && (
          <div className="mt-5">
            <div className="flex justify-between text-xs font-semibold text-navy"><span>Construction</span><span>{p.progress_pct}%</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={p.progress_pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} construction progress`}>
              <div className="h-full rounded-full bg-brand-red" style={{ width: `${p.progress_pct}%` }} />
            </div>
          </div>
        )}
        <div className="mt-auto flex flex-wrap gap-3 pt-6">
          {upcoming ? (
            <a href={registerMsg(p)} target="_blank" rel="noreferrer" className="btn btn-primary"><WhatsAppIcon /> Register interest</a>
          ) : (
            <Link to="/projects/$slug" params={{ slug: p.slug }} className="btn btn-primary">View details</Link>
          )}
        </div>
        {isListed(p) && (
          <Link to="/construction-status/$slug" params={{ slug: p.slug }} className="eyebrow mt-4 inline-flex min-h-[44px] items-center !text-[11px] text-brand-red hover:text-navy">Construction status →</Link>
        )}
      </div>
    </article>
  );
}
