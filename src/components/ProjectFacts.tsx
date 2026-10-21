import { projectFacts, type ProjectWithMedia } from "@/lib/projects-data";

/** Units · Storeys · Flat size, shown at the top of project cards. Hides itself when there is no data. */
export function ProjectFacts({ p, tone = "light", className = "" }: { p: ProjectWithMedia; tone?: "light" | "dark" | "glass"; className?: string }) {
  const facts = projectFacts(p);
  if (!facts.length) return null;
  const box =
    tone === "glass" ? "bg-[rgba(4,26,56,0.78)] text-white ring-1 ring-white/15"
    : tone === "dark" ? "bg-white/10 text-white ring-1 ring-white/15"
    : "bg-ivory text-navy ring-1 ring-navy/10";
  const label = tone === "light" ? "text-navy/60" : "text-white/70";
  const rule = tone === "light" ? "divide-navy/10" : "divide-white/15";
  return (
    <dl
      className={`grid divide-x ${rule} overflow-hidden rounded-xl ${box} ${className}`}
      style={{ gridTemplateColumns: facts.map((f) => (f.label === "Flat size" ? "1.6fr" : "1fr")).join(" ") }}
      aria-label={`${p.name} key facts`}
    >
      {facts.map((f) => (
        <div key={f.label} className="min-w-0 px-3 py-2.5 text-center">
          <dt className={`eyebrow !text-[9px] !tracking-[0.14em] ${label}`}>{f.label}</dt>
          <dd className="num mt-0.5 truncate font-display text-[17px] leading-tight" title={f.value}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
