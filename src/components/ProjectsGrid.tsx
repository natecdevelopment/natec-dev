import { useState } from "react";
import { company } from "@/lib/site";
import { WhatsAppIcon } from "@/components/SiteChrome";

export const waMessage = (msg: string) => `${company.whatsappLink}?text=${encodeURIComponent(msg)}`;
export const WA_UPCOMING = waMessage("Hi Natec, I'm interested in your upcoming projects.");

export type Project = { name: string; no: string; address: string; type: string; flats: number; status: "Completed" | "Ongoing"; pct: number; gallery: string[] };
export const PROJECTS: Project[] = [
  { name: "Shobuj Angon", no: "Project 01", address: "Padma Gate, Rajendrapur Bazar, Sreepur, Gazipur", type: "Residential building, B+G+7 (8-storey)", flats: 28, status: "Completed", pct: 100, gallery: ["front", "side", "corner", "aerial"].map((n) => `/projects/shobuj-angon/${n}.webp`) },
  { name: "Shobuj Aloy", no: "Project 02", address: "Padma Gate, Rajendrapur Bazar, Sreepur, Gazipur", type: "Residential building, G+7 (8-storey)", flats: 21, status: "Ongoing", pct: 50, gallery: ["/projects/shobuj-aloy/front.webp"] },
  { name: "Shobuj Digonto", no: "Project 03", address: "Pepsi Gate, Rajendrapur Bazar, Sreepur, Gazipur", type: "Residential building, B+G+6 (7-storey)", flats: 26, status: "Ongoing", pct: 20, gallery: ["front", "aerial"].map((n) => `/projects/shobuj-digonto/${n}.webp`) },
];

// Names are placeholders — edit freely.
export const UPCOMING = [
  { name: "Upcoming Project — Rajendrapur Bazar", location: "Rajendrapur Bazar, Sreepur, Gazipur", img: "/projects/upcoming/rajendrapur-bazar.webp" },
  { name: "Upcoming Project — Gazipur", location: "Gazipur", img: "/projects/upcoming/gazipur.webp" },
];

export function SoldOut({ className = "" }: { className?: string }) {
  return <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white ${className}`} style={{ background: "#9B0707" }}>Sold out</span>;
}

function ProjectDetail({ p }: { p: Project }) {
  const [i, setI] = useState(0);
  return (
    <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="relative">
          <img loading="lazy" src={p.gallery[i]} alt={`${p.name} render`} className="aspect-[4/3] w-full object-cover" />
          <SoldOut className="absolute right-4 top-4" />
        </div>
        {p.gallery.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-3">
            {p.gallery.map((g, n) => (
              <button key={g} onClick={() => setI(n)} className={`border-2 ${n === i ? "border-accent" : "border-transparent opacity-70"}`}>
                <img loading="lazy" src={g} alt={`${p.name} view ${n + 1}`} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex flex-wrap gap-2">
          <span className={`w-fit px-3 py-1 text-xs font-bold uppercase tracking-wider ${p.status === "Completed" ? "bg-success text-ink-foreground" : "bg-caution text-ink"}`}>{p.status}</span>
          <SoldOut />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{p.no}</p>
        <h3 className="mt-1 text-4xl font-semibold text-primary">{p.name}</h3>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-5 text-sm">
          <div className="col-span-2"><dt className="text-muted-foreground">Address</dt><dd className="font-semibold">{p.address}</dd></div>
          <div><dt className="text-muted-foreground">Type</dt><dd className="font-semibold">{p.type}</dd></div>
          <div><dt className="text-muted-foreground">Total flats</dt><dd className="font-semibold">{p.flats}</dd></div>
        </dl>
        <div className="mt-5">
          <div className="flex justify-between text-sm font-semibold"><span>Construction</span><span>{p.pct}% complete</span></div>
          <div className="mt-2 h-2 bg-muted"><div className="h-full bg-accent" style={{ width: `${p.pct}%` }} /></div>
        </div>
        <a href={WA_UPCOMING} target="_blank" rel="noreferrer" className="btn btn-primary mt-6 w-fit"><WhatsAppIcon /> Register interest for upcoming projects</a>
      </div>
    </div>
  );
}

export function FeaturedProject() {
  return <ProjectDetail p={PROJECTS[0]!} />;
}

export function UpcomingCards({ dark }: { dark?: boolean }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {UPCOMING.map((u) => (
        <article key={u.name} className={`overflow-hidden rounded-2xl ${dark ? "bg-white/5" : "border border-border bg-card"}`}>
          <div className="relative">
            <img loading="lazy" src={u.img} alt={u.name} className="aspect-[4/3] w-full object-cover" />
            <span className="eyebrow absolute left-5 top-5 rounded-full bg-navy px-3 py-1.5 !text-[10px] text-white">Upcoming</span>
          </div>
          <div className="p-6">
            <h3 className={`!text-2xl ${dark ? "" : "text-primary"}`}>{u.name}</h3>
            <p className={`mt-1 text-sm ${dark ? "text-muted-dark" : "text-muted-foreground"}`}>{u.location}</p>
            <a href={waMessage(`Hi Natec, I'm interested in your upcoming project at ${u.location}.`)} target="_blank" rel="noreferrer" className="btn btn-primary mt-5"><WhatsAppIcon /> Register interest</a>
          </div>
        </article>
      ))}
    </div>
  );
}

export function OngoingProjects() {
  return (
    <>
      <div className="space-y-16">
        {PROJECTS.slice(1).map((p) => <ProjectDetail key={p.name} p={p} />)}
      </div>
      <h2 className="mb-8 mt-20 text-sm font-bold uppercase tracking-[0.3em] text-accent">Upcoming projects</h2>
      <UpcomingCards />
    </>
  );
}
