import front from "@/assets/angon-front.jpg.asset.json";
import side from "@/assets/angon-side.jpg.asset.json";
import aerial from "@/assets/angon-aerial.jpg.asset.json";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

const gallery = [front.url, side.url, aerial.url];

export function FeaturedProject() {
  const [i, setI] = useState(0);
  return (
    <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
      <div>
        <img src={gallery[i]} alt="Shobuj Angon 3D render" className="aspect-square w-full object-cover" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          {gallery.map((g, n) => (
            <button key={g} onClick={() => setI(n)} className={`border-2 ${n === i ? "border-accent" : "border-transparent opacity-70"}`}>
              <img src={g} alt={`Shobuj Angon view ${n + 1}`} className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col justify-center">
        <span className="w-fit bg-success px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink-foreground">Completed</span>
        <h3 className="mt-4 text-4xl font-semibold text-primary">Shobuj Angon</h3>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-5 text-sm">
          <div><dt className="text-muted-foreground">Project period</dt><dd className="font-semibold">2023 – 2026</dd></div>
          <div><dt className="text-muted-foreground">Location</dt><dd className="font-semibold">Gazipur</dd></div>
          <div><dt className="text-muted-foreground">Type</dt><dd className="font-semibold">Residential</dd></div>
          <div><dt className="text-muted-foreground">Progress</dt><dd className="font-semibold">100%</dd></div>
        </dl>
        <p className="mt-5 text-muted-foreground">Shobuj Angon is a completed project by Natec Development Ltd., carried out between 2023 and 2026 — a modern residential building with private balconies and a landscaped rooftop.</p>
      </div>
    </div>
  );
}

const ongoing = [
  { name: "Shobuj Aloy", pct: 50, location: "Gazipur", body: "Currently under development and approximately 50% complete. Contact our team for details about its location, project features, and availability." },
  { name: "Shobuj Digonto", pct: 20, location: "Gazipur, near Pepsi Gate", body: "An ongoing Natec project, approximately 20% complete. Contact us for project updates and further information." },
];

export function OngoingProjects() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {ongoing.map((o) => (
        <article key={o.name} className="flex flex-col border border-border bg-card p-7">
          <span className="w-fit bg-caution px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">Ongoing</span>
          <h3 className="mt-4 text-2xl font-semibold text-primary">{o.name}</h3>
          <p className="text-sm text-muted-foreground">{o.location}</p>
          <div className="mt-6">
            <div className="flex justify-between text-sm font-semibold"><span>Construction</span><span>{o.pct}% complete</span></div>
            <div className="mt-2 h-2 bg-muted"><div className="h-full bg-accent" style={{ width: `${o.pct}%` }} /></div>
          </div>
          <p className="mt-5 flex-1 text-sm text-muted-foreground">{o.body}</p>
          <Link to="/contact" className="mt-6 text-sm font-semibold text-accent">Ask for updates →</Link>
        </article>
      ))}
      <article className="flex flex-col border border-dashed border-primary/40 bg-secondary p-7">
        <span className="w-fit bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">Upcoming · 2027</span>
        <h3 className="mt-4 text-2xl font-semibold text-primary">Two new projects</h3>
        <p className="mt-5 flex-1 text-sm text-muted-foreground">Natec Development Ltd. has two upcoming projects planned to begin in 2027. Further information will be announced as project details become available.</p>
        <Link to="/contact" className="mt-6 text-sm font-semibold text-accent">Register interest →</Link>
      </article>
    </div>
  );
}
