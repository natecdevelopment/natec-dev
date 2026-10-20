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

export const stageForFrame = (f: number) => (f <= 12 ? 0 : f <= 30 ? 1 : f <= 120 ? 2 : f <= 132 ? 3 : 4);
export const floorForFrame = (f: number) =>
  f <= 30 ? 0 : f <= 120 ? Math.min(FLOORS, Math.floor((f - 31) / 10) + 1) : FLOORS;
export const progressForFrame = (f: number) => Math.round((f / FRAMES) * 100);
const frameSrc = (dir: string, i: number) => `/hero/${dir}/${String(i).padStart(4, "0")}.webp`;

const glass: React.CSSProperties = {
  background: "rgba(5,11,31,0.45)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 12,
};
const shadow = { textShadow: "0 2px 24px rgba(5,11,31,0.55)" };

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
    const mq = window.matchMedia("(max-width: 767px)");
    const dir = mq.matches ? "m" : "d";
    const imgs: (HTMLImageElement | null)[] = new Array(FRAMES + 1).fill(null);
    const loaded: boolean[] = new Array(FRAMES + 1).fill(false);
    let raf = 0, lastFrame = -1, lastStage = -1, lastFloor = -1, lastUIFrame = -1, lastW = 0, lastH = 0;
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
      // Desktop: anchor right / middle. Mobile: anchor center / bottom.
      const x = mq.matches ? (w - dw) / 2 : w - dw;
      const y = mq.matches ? h - dh : (h - dh) / 2;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, x, y, dw, dh);
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

    const updateUI = (f: number) => {
      if (f === lastUIFrame) return;
      lastUIFrame = f;
      const st = stageForFrame(f);
      const fl = floorForFrame(f);
      const pct = progressForFrame(f);
      const floorEl = floorRef.current!;
      floorEl.textContent = `${String(fl).padStart(2, "0")}/${FLOORS}`;
      if (fl !== lastFloor) {
        if (lastFloor !== -1) {
          floorEl.classList.remove("floor-tick");
          void floorEl.offsetWidth;
          floorEl.classList.add("floor-tick");
        }
        lastFloor = fl;
      }
      pctRef.current!.textContent = `${pct}%`;
      phaseRef.current!.textContent = `${st + 1}/5`;
      barRef.current!.style.width = `${pct}%`;
      const end = st === 4;
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
      updateUI(FRAMES);
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
        updateUI(target);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

  const s = STAGES[stage] ?? STAGES[0]!;

  return (
    <section ref={sectionRef} className="relative bg-ink text-ink-foreground" style={{ height: "500vh" }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden md:flex md:items-center">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
        <div className="absolute inset-0 mx-auto w-full max-w-7xl px-4 pt-20 md:relative md:inset-auto md:px-5 md:pt-16">
          <div className="max-w-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-caution md:text-xs" style={shadow}>Natec Development Ltd. · Est. 2023</p>
            <h1 className="mt-2 font-semibold leading-[1.05] md:mt-4 md:text-6xl" style={shadow}>
              <span className="block text-[clamp(2rem,9vw,2.75rem)] md:text-6xl">
                From bare land to <em className="text-caution">lasting homes</em>.
              </span>
            </h1>
            <p className="mt-2 max-w-md text-sm opacity-90 md:mt-4 md:text-base" style={shadow}>
              Scroll to watch a Natec building rise — the same careful, stage-by-stage process we follow on every project in Sreepur, Gazipur.
            </p>
            <div ref={ctaRef} className="mt-4 grid grid-cols-2 gap-2 transition-opacity duration-500 md:order-last md:mt-6 md:flex md:gap-3" style={{ opacity: 0.45, pointerEvents: "none" }}>
              <Link to="/projects" className="rounded-md bg-accent px-3 py-2.5 text-center text-sm font-semibold text-accent-foreground md:px-5 md:py-3">View projects</Link>
              <Link to="/contact" className="rounded-md border border-ink-foreground/40 bg-ink/20 px-3 py-2.5 text-center text-sm font-semibold md:px-5 md:py-3">Contact us</Link>
            </div>

            <div className="absolute inset-x-4 bottom-4 p-3 md:static md:mt-6 md:p-4" style={glass}>
              <div className="grid grid-cols-3">
                <Gauge label="Floor" valueRef={floorRef} initial={`00/${FLOORS}`} />
                <Gauge label="Progress" valueRef={pctRef} initial="0%" />
                <Gauge label="Phase" valueRef={phaseRef} initial="1/5" />
              </div>
              <div className="mt-2 md:mt-4">
                <div key={stage} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 text-xs font-semibold md:text-sm">
                    <span className={`h-2 w-2 rounded-full ${stage < 4 ? "animate-pulse bg-caution" : "bg-success"}`} />
                    {s.name}
                  </div>
                  <p className="hidden text-sm opacity-70 md:block">{s.note}</p>
                </div>
                <div className="mt-2 h-1 w-full bg-ink-foreground/15 md:mt-3 md:h-1.5">
                  <div ref={barRef} className="h-full bg-caution" style={{ width: "0%" }} />
                </div>
                <div ref={labelsRef} className="mt-1.5 flex justify-between gap-1 text-[9px] uppercase tracking-wider opacity-80 md:mt-2 md:text-[10px]">
                  {STAGES.map((st, i) => <span key={st.name} className={i === 0 ? "text-caution" : ""}>{st.short}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Gauge({ label, valueRef, initial }: { label: string; valueRef: React.RefObject<HTMLDivElement | null>; initial: string }) {
  return (
    <div className="overflow-hidden border-r border-ink-foreground/15 px-2 last:border-r-0 md:px-3">
      <div className="text-[9px] uppercase tracking-widest opacity-60 md:text-[10px]">{label}</div>
      <div ref={valueRef} className="font-mono text-base font-semibold tabular-nums text-caution md:text-2xl">{initial}</div>
    </div>
  );
}
