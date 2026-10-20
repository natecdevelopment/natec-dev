import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import type { Prog } from "./ConstructionScene3D";

const Scene3D = lazy(() => import("./ConstructionScene3D"));
import front from "@/assets/angon-front.jpg.asset.json";

const FLOORS = 9;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

const STAGES = [
  { at: 0, name: "Site Excavation", note: "Clearing and digging the ground" },
  { at: 0.1, name: "Foundation", note: "Pouring reinforced concrete footing" },
  { at: 0.2, name: "Structural Frame", note: "Columns rising floor by floor" },
  { at: 0.6, name: "Facade Installation", note: "Panels, windows and balconies" },
  { at: 0.84, name: "Handover Ready", note: "Shobuj Angon — completed" },
];


export function ConstructionHero() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const prog = useRef<Prog>({ target: 0, value: 0 });

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const v = clamp(-r.top / total);
        prog.current.target = v;
        setP(v);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const built = seg(p, 0.2, 0.6) * FLOORS;
  const fin = seg(p, 0.84, 0.96);
  const floorCount = Math.min(FLOORS, Math.floor(built + 0.001));
  const stage = [...STAGES].reverse().find((s) => p >= s.at)!;
  const active = p < 0.84;

  return (
    <section ref={ref} className="relative bg-ink text-ink-foreground" style={{ height: "520vh" }}>
      <div className="sticky top-16 flex h-[calc(100vh-4rem)] items-center overflow-hidden">
        <div className="absolute inset-0">
          <ClientOnly fallback={<div className="h-full w-full bg-ink" />}>
            <Suspense fallback={<div className="h-full w-full bg-ink" />}>
              <Scene3D prog={prog.current} />
            </Suspense>
          </ClientOnly>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-transparent md:via-ink/50" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink/80 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-5">
          {/* Copy + gauges */}
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-caution">Natec Development Ltd. · Est. 2023</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] md:text-6xl">
              From bare land to <em className="text-caution">lasting homes</em>.
            </h1>
            <p className="mt-4 hidden max-w-md opacity-70 md:block">
              Scroll to watch a Natec building rise — the same careful, stage-by-stage process we follow on every project in Sreepur, Gazipur.
            </p>

            <div className="mt-6 grid max-w-md grid-cols-3 border border-ink-foreground/15">
              <Gauge label="Floor" value={`${String(floorCount).padStart(2, "0")}/${FLOORS}`} />
              <Gauge label="Progress" value={`${Math.round(p * 100)}%`} />
              <Gauge label="Phase" value={`${STAGES.indexOf(stage) + 1}/5`} />
            </div>
            <div className="mt-4 max-w-md">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className={`h-2 w-2 rounded-full ${active ? "animate-pulse bg-caution" : "bg-success"}`} />
                {stage.name}
              </div>
              <p className="text-sm opacity-60">{stage.note}</p>
              <div className="mt-3 h-1.5 w-full bg-ink-foreground/10">
                <div className="h-full bg-caution transition-[width] duration-150" style={{ width: `${p * 100}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider opacity-50">
                {STAGES.map((s) => <span key={s.name} className={p >= s.at ? "text-caution opacity-100" : ""}>{s.name.split(" ")[0]}</span>)}
              </div>
            </div>
            <div className={`mt-6 flex gap-3 transition-opacity duration-500 ${fin > 0.5 ? "opacity-100" : "opacity-0 md:opacity-40"}`}>
              <Link to="/projects" className="bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground">View projects</Link>
              <Link to="/contact" className="border border-ink-foreground/30 px-5 py-3 text-sm font-semibold">Contact us</Link>
            </div>
          </div>

          {fin > 0.9 && (
            <div className="absolute bottom-6 right-5 hidden w-56 border border-ink-foreground/20 bg-ink/80 p-2 backdrop-blur md:block">
              <img src={front.url} alt="Shobuj Angon completed building render" className="aspect-square w-full object-cover" />
              <div className="mt-2 text-xs font-bold uppercase tracking-wider text-success">Completed · Shobuj Angon</div>
            </div>
          )}
        </div>
      </div>
        {p < 0.03 && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-xs uppercase tracking-[0.3em] opacity-60">Scroll to build ↓</div>}
      </div>
    </section>
  );
}

function Gauge({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-ink-foreground/15 p-3 last:border-r-0">
      <div className="text-[10px] uppercase tracking-widest opacity-50">{label}</div>
      <div className="font-mono text-2xl font-semibold tabular-nums text-caution">{value}</div>
    </div>
  );
}
