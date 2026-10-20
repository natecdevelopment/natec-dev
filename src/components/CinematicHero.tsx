import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { company } from "@/lib/site";
import { WhatsAppIcon } from "@/components/SiteChrome";

const FRAMES = 340;
export const frameSrc = (dir: "d" | "m", i: number) => `/hero-natec/${dir}/${String(i).padStart(4, "0")}.webp`;

type Chapter = { range: [number, number]; eyebrow?: string; title: React.ReactNode; body?: string; cta?: "intro" | "end"; still?: number };
const CHAPTERS: Chapter[] = [
  { range: [1, 40], eyebrow: "Natec Development Ltd. · Est. 2023", title: <>From bare land <em className="accent-dark block">to lasting homes.</em></>, body: "Homes in Sreepur, Gazipur — built floor by floor.", cta: "intro" },
  { range: [41, 100], title: "Rise above the noise.", body: "Green surroundings, open rooftops, fresh morning air." },
  { range: [101, 140], title: "Meet your next address.", body: "Rajendrapur Bazar, Sreepur, Gazipur.", still: 120 },
  { range: [141, 200], eyebrow: "Step inside", title: "Bright, airy living.", body: "Tiled floors, false ceilings and cross-ventilation in every home.", still: 170 },
  { range: [201, 240], title: "Made for family meals.", body: "An open dining area with a fitted kitchen.", still: 220 },
  { range: [241, 280], title: "Rest easy.", body: "Quiet bedrooms with built-in wardrobes and big windows.", still: 260 },
  { range: [281, 310], title: "Your own green view.", body: "Every home has a private balcony." },
  { range: [311, 340], title: "Your home in Sreepur starts here.", cta: "end", still: 335 },
];
const BRIGHT: [number, number][] = [[36, 48], [68, 80], [82, 112], [296, 318]];
const inRange = (f: number, [a, b]: [number, number]) => f >= a && f <= b;

const headShadow: React.CSSProperties = { textShadow: "0 2px 4px rgba(0,0,0,0.25), 0 8px 40px rgba(0,0,0,0.35)" };
const bodyShadow: React.CSSProperties = { textShadow: "0 1px 12px rgba(0,0,0,0.45)", color: "#E8ECF3" };
const SCRIM = "radial-gradient(ellipse at 20% 85%, rgba(4,26,56,0.62) 0%, rgba(4,26,56,0.35) 35%, transparent 65%)";

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
  const H = first ? "h1" : "h2";
  return (
    <>
      {c.eyebrow && <p className="eyebrow !text-[11px] text-white/85 desk:!text-[13px]" style={bodyShadow}>{c.eyebrow}</p>}
      <H className="mt-3 !text-[clamp(1.9rem,8vw,2.4rem)] text-white desk:!text-[clamp(2.6rem,6vw,5.2rem)]" style={headShadow}>{c.title}</H>
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

function FlyHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  const brightRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px) and (orientation: portrait)");
    const dir = mq.matches ? "m" : "d";
    const imgs: HTMLImageElement[] = [];
    const loaded: boolean[] = new Array(FRAMES + 1).fill(false);
    let alive = true, raf = 0, current = 1, lastDrawn = -1, lastChapter = -1;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;

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
    const paint = (img: HTMLImageElement) => {
      const c = canvasRef.current;
      if (!c || !c.clientWidth) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const ctx = c.getContext("2d")!;
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    };

    import("lenis").then(({ default: Lenis }) => {
      if (alive) lenis = new Lenis({ lerp: 0.08, autoRaf: false });
    });
    load(1).then(() => {
      if (!alive) return;
      lastDrawn = -1;
      // Preload in small batches so early frames arrive first.
      let next = 2;
      const pump = () => { if (alive && next <= FRAMES) load(next++).then(pump); };
      for (let k = 0; k < 6; k++) pump();
    });
    const onResize = () => { lastDrawn = -1; };
    window.addEventListener("resize", onResize);

    const tick = (t: number) => {
      lenis?.raf(t);
      const el = sectionRef.current;
      if (el) {
        const total = el.offsetHeight - window.innerHeight;
        const p = Math.max(0, Math.min(1, -el.getBoundingClientRect().top / (total || 1)));
        current += (1 + p * (FRAMES - 1) - current) * 0.12;
        const want = Math.round(current);
        const f = loaded[want] ? want : nearest(want);
        if (f > 0 && f !== lastDrawn) { paint(imgs[f]!); lastDrawn = f; }
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
        const ch = CHAPTERS.findIndex((c) => inRange(want, c.range));
        if (ch !== lastChapter) {
          chapterRefs.current.forEach((n, i) => n?.toggleAttribute("data-on", i === ch));
          lastChapter = ch;
        }
        if (brightRef.current) brightRef.current.style.opacity = BRIGHT.some((r) => inRange(want, r)) ? "0.2" : "0";
        if (captionRef.current) captionRef.current.toggleAttribute("data-on", inRange(want, [141, 310]));
        if (hintRef.current) hintRef.current.style.opacity = want < 20 ? "1" : "0";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); lenis?.destroy(); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <section id="hero" ref={sectionRef} className="relative bg-navy-deep" style={{ height: "1000vh" }}>
      <div className="sticky top-0 flex h-[100svh] w-full flex-col overflow-hidden pt-16 text-white desk:block desk:pt-0">
        <canvas ref={canvasRef} aria-hidden className="block aspect-[4/3] w-full shrink-0 desk:absolute desk:inset-0 desk:aspect-auto desk:h-full" />

        {/* Desktop scrims */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden desk:block" style={{ background: SCRIM }} />
        <div ref={brightRef} aria-hidden className="pointer-events-none absolute inset-0 hidden transition-opacity duration-500 desk:block" style={{ background: SCRIM, opacity: 0 }} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[30%] desk:block" style={{ background: "linear-gradient(to bottom, transparent, rgba(4,26,56,0.45))" }} />

        {/* Red rule + progress (sits on the image edge on mobile, at the bottom on desktop) */}
        <div className="relative h-px w-full shrink-0 bg-brand-red/50 desk:absolute desk:bottom-0 desk:h-[3px] desk:bg-white/10">
          <div ref={progressRef} className="absolute inset-0 origin-left bg-brand-red" style={{ transform: "scaleX(0)" }} />
        </div>

        {/* Chapters: navy panel on mobile, bottom-left on desktop */}
        <div className="relative flex-1 bg-navy-deep desk:absolute desk:inset-0 desk:bg-transparent">
          {CHAPTERS.map((c, i) => (
            <div
              key={i}
              ref={(n) => { chapterRefs.current[i] = n; }}
              data-on={i === 0 ? "" : undefined}
              className="chapter absolute inset-x-0 top-0 px-5 pt-6 desk:inset-x-auto desk:top-auto desk:bottom-[12vh] desk:left-[6vw] desk:max-w-[620px] desk:px-0 desk:pt-0"
            >
              <ChapterBody c={c} first={i === 0} />
            </div>
          ))}
        </div>

        <div ref={hintRef} className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-500 desk:flex">
          <span className="eyebrow !text-[10px] text-white/80">Scroll to explore</span>
          <span className="block h-10 w-px overflow-hidden bg-white/20"><span className="scroll-hint-line block h-full w-full bg-white" /></span>
        </div>
        <p ref={captionRef} className="chapter absolute bottom-3 right-5 text-[12px] text-white/70 desk:bottom-6 desk:right-8">Interior images are illustrative.</p>
      </div>
    </section>
  );
}

function StaticHero() {
  return (
    <section id="hero" className="bg-navy-deep pt-16 text-white desk:pt-0">
      <div className="relative">
        <img src={frameSrc("d", 1)} alt="Natec Development homes in Sreepur, Gazipur" width={1920} height={1080} className="aspect-[4/3] w-full object-cover desk:aspect-auto desk:h-[100svh]" />
        <div className="hidden desk:absolute desk:inset-0 desk:block" style={{ background: SCRIM }} />
        <div className="px-5 py-8 desk:absolute desk:bottom-[12vh] desk:left-[6vw] desk:max-w-[620px] desk:p-0"><ChapterBody c={CHAPTERS[0]!} first /></div>
      </div>
      <div className="container-x space-y-16 py-16">
        {CHAPTERS.slice(1).map((c, i) => (
          <div key={i} className="grid items-center gap-6 md:grid-cols-2">
            {c.still && <img src={frameSrc("d", c.still)} alt="" loading="lazy" width={1920} height={1080} className="aspect-video w-full rounded-2xl object-cover" />}
            <div><ChapterBody c={c} /></div>
          </div>
        ))}
        <p className="text-[12px] text-white/70">Interior images are illustrative.</p>
      </div>
    </section>
  );
}
