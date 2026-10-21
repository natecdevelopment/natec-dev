import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { company } from "@/lib/site";
import { WhatsAppIcon } from "@/components/SiteChrome";

const FRAMES = 200;
export const frameSrc = (dir: "d" | "m", i: number) => `/hero-natec/${dir}/${String(i).padStart(4, "0")}.webp`;

type Chapter = { range: [number, number]; eyebrow?: string; title: React.ReactNode; body?: string; cta?: "intro" | "end"; still?: number };
const CHAPTERS: Chapter[] = [
  { range: [1, 24], eyebrow: "Natec Development Ltd. · Est. 2023", title: <>From bare land <em className="accent-dark block">to lasting homes.</em></>, body: "Homes in Sreepur, Gazipur — built floor by floor.", cta: "intro" },
  { range: [25, 59], title: "Rise above the noise.", body: "Green surroundings, open rooftops, fresh morning air." },
  { range: [60, 82], eyebrow: "Project 03", title: "Meet Shobuj Digonto.", body: "Pepsi Gate, Rajendrapur Bazar, Sreepur, Gazipur · B+G+6 · 26 flats", still: 70 },
  { range: [83, 118], eyebrow: "Step inside", title: "Bright, airy living.", body: "Tiled floors, false ceilings and cross-ventilation in every home.", still: 100 },
  { range: [119, 141], title: "Made for family meals.", body: "An open dining area with a fitted kitchen.", still: 130 },
  { range: [142, 165], title: "Rest easy.", body: "Quiet bedrooms with built-in wardrobes and big windows.", still: 153 },
  { range: [166, 182], title: "Your own green view.", body: "Every home has a private balcony." },
  { range: [183, 200], title: "Your home in Sreepur starts here.", cta: "end", still: 197 },
];
const BRIGHT: [number, number][] = [[21, 29], [40, 47], [48, 66], [174, 187]];
const inRange = (f: number, [a, b]: [number, number]) => f >= a && f <= b;

const headShadow: React.CSSProperties = { textShadow: "0 2px 18px rgba(0,0,0,0.45)" };
const bodyShadow: React.CSSProperties = { textShadow: "0 1px 12px rgba(0,0,0,0.45)", color: "#E8ECF3" };
const SCRIM = "radial-gradient(ellipse at 20% 85%, rgba(4,26,56,0.62) 0%, rgba(4,26,56,0.35) 35%, transparent 65%)";
const M_BOTTOM = "linear-gradient(to top, rgba(4,26,56,0.88) 0%, rgba(4,26,56,0.55) 45%, transparent 100%)";

function Buttons({ kind }: { kind: "intro" | "end" }) {
  const wa = (
    <a href={company.whatsappLink} target="_blank" rel="noreferrer" className="btn btn-primary h-12 flex-1 !px-3 desk:h-auto desk:flex-none desk:!px-[26px]">
      <WhatsAppIcon /> Book a site visit
    </a>
  );
  const proj = <Link to="/projects" className="btn btn-ghost-dark h-12 flex-1 !px-3 desk:h-auto desk:flex-none desk:!px-[26px]">View projects</Link>;
  return <div className="mt-5 flex gap-3 desk:mt-7">{kind === "intro" ? <>{proj}{wa}</> : <>{wa}{proj}</>}</div>;
}

function ChapterBody({ c, first }: { c: Chapter; first?: boolean }) {
  // Only the first chapter is a heading (the page's single H1); the others are styled text.
  const H = first ? "h1" : "p";
  return (
    <>
      {c.eyebrow && <p className="eyebrow !text-[11px] text-white/85 desk:!text-[13px]" style={bodyShadow}>{c.eyebrow}</p>}
      <H className="mt-3 font-display font-medium leading-[1.05] tracking-[-0.015em] !text-[clamp(2rem,9vw,2.6rem)] text-white desk:!text-[clamp(2.6rem,6vw,5.2rem)]" style={headShadow}>{c.title}</H>
      {c.body && <p className="mt-3 max-w-[62ch] text-[15px] font-medium desk:mt-4 desk:text-[17px]" style={bodyShadow}>{c.body}</p>}
      {c.cta && <Buttons kind={c.cta} />}
    </>
  );
}

export function CinematicHero() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return reduced ? <StaticHero /> : <FlyHero />;
}

// Auto-play: on load the film plays itself to the last frame unless the visitor takes over.
const AUTOPLAY_SECONDS = { d: 16, m: 14 }; // time for the whole hero at full speed
const AUTOPLAY_DELAY_MS = 1200; // let the drifting clouds breathe first
const RAMP_SECONDS = 1.4; // ease in at the start
const CLOUD_FADE_FRAMES = 14; // drifting clouds fade out over the first frames

function FlyHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const brightRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);
  const [autoplaying, setAutoplaying] = useState(false);

  useEffect(() => {
    const dir = window.matchMedia("(max-width: 767px)").matches ? "m" : "d";
    const bitmaps: (ImageBitmap | undefined)[] = new Array(FRAMES + 1);
    let alive = true, raf = 0, lastDrawn = -1, lastChapter = 0, lastBright = false, dirty = true;
    let lastCloud = -1;
    let lenis: {
      raf: (t: number) => void;
      destroy: () => void;
      scroll: number;
      scrollTo: (target: number, opts?: { immediate?: boolean; force?: boolean }) => void;
    } | null = null;

    // ---- auto-play state ----
    // "idle" until conditions are met, "playing" while it runs, "done" once finished or stopped.
    let auto: "idle" | "playing" | "done" = "idle";
    let autoY = 0, autoStart = 0, lastT = 0, peek = -1, peekFinal = false;
    // How far past the hero to stop: the next section's top padding plus ~1.5 lines of its
    // heading (≈1–2 lines visible on phones and desktops). Its fade-in is triggered too,
    // because a sliver this small is below the reveal threshold.
    const peekPx = (hero: HTMLElement) => {
      const next = hero.nextElementSibling as HTMLElement | null;
      if (!next) return 0;
      const vh = window.innerHeight;
      const head = next.querySelector<HTMLElement>("h1, h2, h3, p");
      let px = Math.min(vh * 0.15, 120);
      if (head) {
        const cs = getComputedStyle(head);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.15 || 40;
        px = head.getBoundingClientRect().top - next.getBoundingClientRect().top + lh * 1.6;
      }
      next.querySelector(".reveal")?.setAttribute("data-in", "");
      return Math.round(Math.max(60, Math.min(px, vh * 0.38)));
    };
    const startedAt = performance.now();
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (window.location.hash || window.scrollY > 10 || conn?.saveData) auto = "done";
    const stopAuto = () => {
      if (auto === "done") return;
      auto = "done";
      if (alive) setAutoplaying(false);
      removeStopListeners();
    };
    const onKey = (e: KeyboardEvent) => { if (!e.metaKey && !e.ctrlKey) stopAuto(); };
    const stopEvents = ["wheel", "touchstart", "pointerdown", "mousedown"] as const;
    stopEvents.forEach((ev) => window.addEventListener(ev, stopAuto, { passive: true }));
    window.addEventListener("keydown", onKey);
    function removeStopListeners() {
      stopEvents.forEach((ev) => window.removeEventListener(ev, stopAuto));
      window.removeEventListener("keydown", onKey);
    }
    // highest frame such that every frame up to it is decoded (auto-play never outruns loading)
    const loadedUpTo = () => {
      let i = 1;
      while (i <= FRAMES && bitmaps[i]) i++;
      return i - 1;
    };
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      dirty = true;
    };
    sizeCanvas();

    const nearest = (i: number) => {
      for (let d = 0; d < FRAMES; d++) {
        if (i - d >= 1 && bitmaps[i - d]) return i - d;
        if (i + d <= FRAMES && bitmaps[i + d]) return i + d;
      }
      return -1;
    };
    const paint = (b: ImageBitmap) => {
      const cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / b.width, ch / b.height);
      const dw = b.width * s, dh = b.height * s;
      ctx.drawImage(b, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    // Load order: 1–24, then every 4th, then the rest. Max 6 in flight.
    const order: number[] = [];
    const seen = new Set<number>();
    const push = (i: number) => { if (!seen.has(i)) { seen.add(i); order.push(i); } };
    for (let i = 1; i <= 24; i++) push(i);
    for (let i = 28; i <= FRAMES; i += 4) push(i);
    for (let i = 1; i <= FRAMES; i++) push(i);
    let next = 0;
    const fetchOne = async (i: number) => {
      try {
        const blob = await (await fetch(frameSrc(dir, i))).blob();
        const bmp = await createImageBitmap(blob);
        if (!alive) return bmp.close();
        bitmaps[i] = bmp;
        dirty = true;
      } catch { /* skip */ }
    };
    const pump = async () => { while (alive && next < order.length) await fetchOne(order[next++]!); };
    for (let k = 0; k < 6; k++) pump();

    import("lenis").then(({ default: Lenis }) => {
      if (alive) lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false }) as never;
    });
    window.addEventListener("resize", sizeCanvas);

    const tick = (t: number) => {
      lenis?.raf(t);
      const el = sectionRef.current;
      if (el) {
        const total = el.offsetHeight - window.innerHeight;

        // ---- auto-play ----
        if (auto === "idle" && lenis && t - startedAt > AUTOPLAY_DELAY_MS && loadedUpTo() >= 12) {
          if (lenis.scroll > 10) stopAuto();
          else { auto = "playing"; autoY = lenis.scroll; autoStart = lastT = t; setAutoplaying(true); }
        }
        if (auto === "playing" && lenis) {
          const start = el.offsetTop, end = start + total;
          // Overshoot past the last frame so the next section peeks in (a cue that the page continues).
          // Measured close to the end so fonts and layout are settled.
          if (peek < 0 || (!peekFinal && autoY > end - total * 0.15)) {
            peek = peekPx(el);
            if (autoY > end - total * 0.15) peekFinal = true;
          }
          const finalY = end + peek;
          const dt = Math.min(0.05, (t - lastT) / 1000);
          lastT = t;
          const r = Math.min(1, (t - autoStart) / 1000 / RAMP_SECONDS);
          const rampIn = r * r * (3 - 2 * r);
          const slowOut = Math.min(1, Math.max(0.12, (finalY - autoY) / (total * 0.08)));
          let ny = autoY + (total / AUTOPLAY_SECONDS[dir]) * rampIn * slowOut * dt;
          const upTo = loadedUpTo(); // wait for frames; once all are in, allow the peek overshoot
          const limitY = upTo >= FRAMES ? finalY : start + ((upTo - 1) / (FRAMES - 1)) * total;
          ny = Math.min(ny, Math.max(autoY, limitY), finalY);
          autoY = ny;
          lenis.scrollTo(autoY, { immediate: true, force: true });
          if (autoY >= finalY - 0.5) stopAuto();
        }

        const y = lenis ? lenis.scroll : window.scrollY;
        const p = Math.max(0, Math.min(1, (y - el.offsetTop) / (total || 1)));
        const idx = Math.round(p * (FRAMES - 1));
        const frame = idx + 1;
        if (frame !== lastDrawn || dirty) {
          const f = bitmaps[frame] ? frame : nearest(frame);
          if (f > 0 && (f !== lastDrawn || dirty)) { paint(bitmaps[f]!); lastDrawn = f; dirty = false; }
        }
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
        const ch = CHAPTERS.findIndex((c) => inRange(frame, c.range));
        if (ch !== lastChapter) { lastChapter = ch; setChapter(ch); }
        const bright = BRIGHT.some((r) => inRange(frame, r));
        if (bright !== lastBright) {
          lastBright = bright;
          if (brightRef.current) brightRef.current.style.opacity = bright ? "0.2" : "0";
        }
        if (hintRef.current) hintRef.current.style.opacity = frame <= 20 || auto === "playing" ? "1" : "0";
        const cloud = Math.round(Math.max(0, 1 - (frame - 1) / CLOUD_FADE_FRAMES) * 100) / 100;
        if (cloud !== lastCloud && cloudsRef.current) {
          lastCloud = cloud;
          cloudsRef.current.style.opacity = String(cloud);
          cloudsRef.current.style.visibility = cloud > 0 ? "visible" : "hidden";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false; cancelAnimationFrame(raf); lenis?.destroy();
      removeStopListeners();
      window.removeEventListener("resize", sizeCanvas);
      bitmaps.forEach((b) => b?.close());
    };
  }, []);

  return (
    <section id="hero" ref={sectionRef} className="relative h-[400vh] bg-navy-deep md:h-[450vh]">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden text-white">
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block h-full w-full" style={{ contain: "strict" }} />

        {/* Drifting clouds over the opening frames (fade out as the film starts) */}
        <div ref={cloudsRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="cloud-layer cloud-far" style={{ backgroundImage: "url(/hero-natec/clouds-far.webp)" }} />
          <div className="cloud-layer cloud-near" style={{ backgroundImage: "url(/hero-natec/clouds-near.webp)" }} />
        </div>

        {/* Mobile gradients */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[120px] md:hidden" style={{ background: "linear-gradient(to bottom, rgba(4,26,56,0.45), transparent)" }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] md:hidden" style={{ background: M_BOTTOM }} />
        {/* Desktop scrims */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block" style={{ background: SCRIM }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[30%] md:block" style={{ background: "linear-gradient(to bottom, transparent, rgba(4,26,56,0.45))" }} />
        {/* Extra scrim on bright frames (+20%) */}
        <div ref={brightRef} aria-hidden className="pointer-events-none absolute inset-0 transition-opacity duration-500" style={{ background: "rgba(4,26,56,1)", opacity: 0 }} />

        {/* Progress */}
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
          <div ref={progressRef} className="absolute inset-0 origin-left bg-brand-red" style={{ transform: "scaleX(0)" }} />
        </div>

        {CHAPTERS.map((c, i) => (
          <div
            key={i}
            data-on={i === chapter ? "" : undefined}
            aria-hidden={i !== chapter}
            className="chapter absolute bottom-[calc(96px+env(safe-area-inset-bottom))] left-5 right-5 md:bottom-[12vh] md:left-[6vw] md:right-auto md:max-w-[620px]"
          >
            <ChapterBody c={c} first={i === 0} />
          </div>
        ))}

        <div
          ref={hintRef}
          className={`absolute left-1/2 -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-500 ${
            autoplaying ? "flex bottom-[calc(20px+env(safe-area-inset-bottom))]" : "hidden bottom-5 md:flex"
          }`}
        >
          <span className="eyebrow whitespace-nowrap !text-[10px] text-white/80">
            {autoplaying ? "Scroll or tap to take control" : "Scroll to explore"}
          </span>
          {!autoplaying && <span className="block h-10 w-px overflow-hidden bg-white/20"><span className="scroll-hint-line block h-full w-full bg-white" /></span>}
        </div>
      </div>
    </section>
  );
}

function StaticHero() {
  return (
    <section id="hero" className="bg-navy-deep text-white">
      <div className="relative h-[100svh]">
        <picture>
          <source media="(max-width: 767px)" srcSet={frameSrc("m", 1)} />
          <img src={frameSrc("d", 1)} alt="Natec Development homes in Sreepur, Gazipur" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        </picture>
        <div className="absolute inset-x-0 bottom-0 h-[55%] md:hidden" style={{ background: M_BOTTOM }} />
        <div className="absolute inset-0 hidden md:block" style={{ background: SCRIM }} />
        <div className="absolute bottom-[96px] left-5 right-5 md:bottom-[12vh] md:left-[6vw] md:right-auto md:max-w-[620px]"><ChapterBody c={CHAPTERS[0]!} first /></div>
      </div>
      <div className="container-x space-y-16 py-16">
        {CHAPTERS.slice(1).map((c, i) => (
          <div key={i} className="grid items-center gap-6 md:grid-cols-2">
            {c.still && <img src={frameSrc("d", c.still)} alt="" loading="lazy" width={1920} height={1080} className="aspect-video w-full rounded-2xl object-cover" />}
            <div><ChapterBody c={c} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
