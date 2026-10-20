import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

const FRAMES = 144;
const FLOORS = 9;
const clamp = (v: number) => Math.max(0, Math.min(1, v));

const STAGES = [
  { name: "Site Excavation", short: "Excavation", note: "Clearing and digging the ground" },
  { name: "Foundation", short: "Foundation", note: "Pouring reinforced concrete footing" },
  { name: "Structural Frame", short: "Structural", note: "Columns and slabs rising floor by floor" },
  { name: "Facade Installation", short: "Facade", note: "Panels, windows and balconies" },
  { name: "Handover Ready", short: "Handover", note: "Shobuj Angon — completed" },
];

const stageAt = (p: number) => (p < 0.15 ? 0 : p < 0.3 ? 1 : p < 0.82 ? 2 : p < 0.9 ? 3 : 4);
const floorAt = (p: number) => (p < 0.3 ? 0 : p >= 0.82 ? FLOORS : Math.min(FLOORS, 1 + Math.floor(((p - 0.3) / 0.52) * FLOORS)));
const pctAt = (p: number) =>
  p < 0.3 ? p * 100 : p < 0.82 ? p * 100 : p < 0.9 ? 82 + ((p - 0.82) / 0.08) * 13 : 100;
const frameSrc = (dir: string, i: number) => `/hero/${dir}/${String(i).padStart(4, "0")}.webp`;

export function ConstructionHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dir = window.matchMedia("(max-width: 767px)").matches ? "m" : "d";
    const imgs: (HTMLImageElement | null)[] = new Array(FRAMES + 1).fill(null);
    const loaded: boolean[] = new Array(FRAMES + 1).fill(false);
    let raf = 0;
    let lastFrame = -1;
    let lastStage = -1;
    let lastW = 0;
    let lastH = 0;
    let alive = true;

    const load = (i: number) =>
      new Promise<void>((res) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => { loaded[i] = true; res(); };
        img.onerror = () => res();
        img.src = frameSrc(dir, i);
        imgs[i] = img;
      });

    const nearest = (i: number) => {
      for (let d = 0; d < FRAMES; d++) {
        if (i - d >= 1 && loaded[i - d]) return i - d;
        if (i + d <= FRAMES && loaded[i + d]) return i + d;
      }
      return -1;
    };

    const draw = (i: number) => {
      const img = imgs[i];
      if (!img) return;
      const w = canvas.width, h = canvas.height;
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (w !== lastW || h !== lastH) {
        canvas.width = lastW = w;
        canvas.height = lastH = h;
        lastFrame = -1;
      }
    };

    const updateUI = (p: number) => {
      const st = stageAt(p);
      floorRef.current!.textContent = `${String(floorAt(p)).padStart(2, "0")}/${FLOORS}`;
      pctRef.current!.textContent = `${Math.round(pctAt(p))}%`;
      phaseRef.current!.textContent = `${st + 1}/5`;
      barRef.current!.style.width = `${pctAt(p)}%`;
      const end = p >= 0.9;
      const cta = ctaRef.current!;
      cta.style.opacity = end ? "1" : "0.45";
      cta.style.pointerEvents = end ? "auto" : "none";
      if (st !== lastStage) {
        lastStage = st;
        setStage(st);
        Array.from(labelsRef.current!.children).forEach((c, i) =>
          (c as HTMLElement).classList.toggle("text-caution", i <= st));
      }
    };

    if (reduced) {
      load(FRAMES).then(() => { if (!alive) return; resize(); draw(FRAMES); });
      updateUI(1);
      const onR = () => { resize(); if (loaded[FRAMES]) draw(FRAMES); };
      window.addEventListener("resize", onR);
      return () => { alive = false; window.removeEventListener("resize", onR); };
    }

    load(1).then(() => {
      if (!alive) return;
      lastFrame = -1;
      for (let i = 2; i <= FRAMES; i++) load(i);
    });

    const tick = () => {
      const el = sectionRef.current;
      if (el) {
        resize();
        const total = el.offsetHeight - window.innerHeight;
        const p = clamp(-el.getBoundingClientRect().top / (total || 1));
        const target = Math.min(FRAMES, 1 + Math.floor(p * (FRAMES - 1) + 0.5));
        const f = loaded[target] ? target : nearest(target);
        if (f > 0 && f !== lastFrame) { draw(f); lastFrame = f; }
        updateUI(p);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

  const s = STAGES[stage] ?? STAGES[0]!;

  return (
    <section ref={sectionRef} className="relative bg-ink text-ink-foreground" style={{ height: "500vh" }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/40 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pt-16">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-caution">Natec Development Ltd. · Est. 2023</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] md:text-6xl">
              From bare land to <em className="text-caution">lasting homes</em>.
            </h1>
            <p className="mt-4 hidden max-w-md opacity-70 md:block">
              Scroll to watch a Natec building rise — the same careful, stage-by-stage process we follow on every project in Sreepur, Gazipur.
            </p>

            <div className="mt-6 grid grid-cols-3 border border-ink-foreground/15 bg-ink/40 backdrop-blur-sm">
              <Gauge label="Floor" valueRef={floorRef} initial={`00/${FLOORS}`} />
              <Gauge label="Progress" valueRef={pctRef} initial="0%" />
              <Gauge label="Phase" valueRef={phaseRef} initial="1/5" />
            </div>
            <div className="mt-4">
              <div key={stage} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className={`h-2 w-2 rounded-full ${stage < 4 ? "animate-pulse bg-caution" : "bg-success"}`} />
                  {s.name}
                </div>
                <p className="text-sm opacity-60">{s.note}</p>
              </div>
              <div className="mt-3 h-1.5 w-full bg-ink-foreground/10">
                <div ref={barRef} className="h-full bg-caution" style={{ width: "0%" }} />
              </div>
              <div ref={labelsRef} className="mt-2 flex justify-between gap-1 text-[10px] uppercase tracking-wider opacity-70">
                {STAGES.map((st, i) => <span key={st.name} className={i === 0 ? "text-caution" : ""}>{st.short}</span>)}
              </div>
            </div>
            <div ref={ctaRef} className="mt-6 flex flex-wrap gap-3 transition-opacity duration-500" style={{ opacity: 0.45, pointerEvents: "none" }}>
              <Link to="/projects" className="bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground">View projects</Link>
              <Link to="/contact" className="border border-ink-foreground/30 px-5 py-3 text-sm font-semibold">Contact us</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Gauge({ label, valueRef, initial }: { label: string; valueRef: React.RefObject<HTMLDivElement | null>; initial: string }) {
  return (
    <div className="border-r border-ink-foreground/15 p-3 last:border-r-0">
      <div className="text-[10px] uppercase tracking-widest opacity-50">{label}</div>
      <div ref={valueRef} className="font-mono text-xl font-semibold tabular-nums text-caution md:text-2xl">{initial}</div>
    </div>
  );
}
