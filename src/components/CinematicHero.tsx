import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { company } from "@/lib/site";

const FRAMES = 160;
const frameSrc = (dir: string, i: number) => `/hero-fly/${dir}/${String(i).padStart(4, "0")}.webp`;
const GOLD = "#F5B700";
const shadow: React.CSSProperties = { textShadow: "0 2px 30px rgba(0,0,0,0.45)" };
const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.10)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 14,
  color: "#fff",
};

// [start, end] frame ranges for each chapter / card.
const RANGES: [number, number][] = [
  [1, 25], [26, 64], [65, 100], [76, 100], [87, 100], [101, 136], [137, 160],
];
const FADE = 5;
const visibility = (f: number, [a, b]: [number, number]) => {
  const inn = a <= 1 ? 1 : Math.max(0, Math.min(1, (f - a + 1) / FADE));
  const out = b >= FRAMES ? 1 : Math.max(0, Math.min(1, (b + 1 - f) / FADE));
  return Math.min(inn, out);
};

const CARDS = [
  { t: "Design", b: "Plans drawn around light, air and family life." },
  { t: "Structure", b: "RCC frame, tested materials, checked at every floor." },
  { t: "Finish", b: "Facade, fittings and handover, on schedule." },
];

const btnGold = "rounded-md px-4 py-2.5 text-center text-sm font-semibold md:px-5 md:py-3";
const btnGhost = "rounded-md border border-white/40 bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white md:px-5 md:py-3";

function Gold({ children }: { children: React.ReactNode }) {
  return <em className="block italic" style={{ color: GOLD }}>{children}</em>;
}

function ChapterContent({ i }: { i: number }) {
  if (i === 0)
    return (
      <>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] md:text-xs" style={{ color: GOLD }}>Natec Development Ltd. · Est. 2023</p>
        <h1 className="mt-2 text-[clamp(1.9rem,8.5vw,2.6rem)] font-semibold leading-[1.05] md:mt-4 md:text-7xl">
          From bare land <Gold>to lasting homes.</Gold>
        </h1>
        <p className="mt-2 text-sm opacity-90 md:mt-4 md:text-lg">Homes in Sreepur, Gazipur, built floor by floor.</p>
        <div className="mt-4 flex gap-2 md:mt-6 md:gap-3">
          <Link to="/projects" className={btnGold} style={{ background: GOLD, color: "#0b1530" }}>View projects</Link>
          <Link to="/contact" className={btnGhost}>Contact us</Link>
        </div>
      </>
    );
  if (i === 1)
    return (
      <>
        <h2 className="text-[clamp(1.8rem,8vw,2.5rem)] font-semibold leading-[1.05] md:text-6xl">Every floor, built with care.</h2>
        <p className="mt-2 text-sm opacity-90 md:mt-4 md:text-lg">Designed, engineered and supervised by one team.</p>
      </>
    );
  if (i === 5)
    return (
      <h2 className="text-[clamp(1.8rem,8vw,2.5rem)] font-semibold leading-[1.05] md:text-6xl">
        Built for the way you live. <Gold>Rooftop to ground floor.</Gold>
      </h2>
    );
  return (
    <>
      <h2 className="text-[clamp(1.8rem,8vw,2.5rem)] font-semibold leading-[1.05] md:text-6xl">Your home in Sreepur starts here.</h2>
      <div className="mt-4 flex gap-2 md:mt-6 md:gap-3">
        <a href={company.whatsappLink} target="_blank" rel="noreferrer" className={btnGold} style={{ background: GOLD, color: "#0b1530" }}>Book a site visit</a>
        <Link to="/projects" className={btnGhost}>View projects</Link>
      </div>
    </>
  );
}

function Card({ i }: { i: number }) {
  const c = CARDS[i]!;
  return (
    <div className="p-3 md:w-72 md:p-5" style={glass}>
      <div className="font-display text-base font-semibold md:text-xl" style={{ color: GOLD }}>{c.t}</div>
      <p className="text-xs opacity-90 md:mt-1 md:text-sm">{c.b}</p>
    </div>
  );
}

// Desktop card positions: floating left/right of center.
const CARD_POS = ["md:left-[8%] md:top-[22%]", "md:right-[8%] md:top-[38%]", "md:left-[14%] md:top-[58%]"];

export function CinematicHero() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return reduced ? <StaticHero /> : <FlyHero />;
}

function FlyHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const dir = mq.matches ? "m" : "d";
    const imgs: HTMLImageElement[] = [];
    const loaded: boolean[] = new Array(FRAMES + 1).fill(false);
    let alive = true, raf = 0, current = 1, lastDrawn = -1;
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
    const fit = (c: HTMLCanvasElement) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; lastDrawn = -1; }
    };
    const paint = (c: HTMLCanvasElement | null, img: HTMLImageElement, cover: boolean) => {
      if (!c || !c.clientWidth) return;
      const ctx = c.getContext("2d")!;
      const w = c.width, h = c.height;
      const s = cover ? Math.max(w / img.naturalWidth, h / img.naturalHeight) : Math.min(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    };

    import("lenis").then(({ default: Lenis }) => {
      if (!alive) return;
      lenis = new Lenis({ lerp: 0.08, autoRaf: false });
    });

    load(1).then(() => {
      if (!alive) return;
      lastDrawn = -1;
      for (let i = 2; i <= FRAMES; i++) load(i);
    });

    const tick = (t: number) => {
      lenis?.raf(t);
      const el = sectionRef.current;
      if (el) {
        const mobile = mq.matches;
        if (mainRef.current) fit(mainRef.current);
        if (mobile && bgRef.current) fit(bgRef.current);
        const total = el.offsetHeight - window.innerHeight;
        const p = Math.max(0, Math.min(1, -el.getBoundingClientRect().top / (total || 1)));
        const target = 1 + p * (FRAMES - 1);
        current += (target - current) * 0.12;
        const want = Math.round(current);
        const f = loaded[want] ? want : nearest(want);
        if (f > 0 && f !== lastDrawn) {
          const img = imgs[f]!;
          paint(mainRef.current, img, !mobile);
          if (mobile) paint(bgRef.current, img, true);
          lastDrawn = f;
        }
        layerRefs.current.forEach((node, i) => {
          if (!node) return;
          const v = visibility(want, RANGES[i]!);
          node.style.opacity = String(v);
          node.style.transform = `translateY(${(1 - v) * 16}px)`;
          node.style.pointerEvents = v > 0.6 ? "auto" : "none";
          node.style.visibility = v <= 0.01 ? "hidden" : "visible";
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); lenis?.destroy(); };
  }, []);

  const setRef = (i: number) => (n: HTMLDivElement | null) => { layerRefs.current[i] = n; };
  const layer = "absolute will-change-transform";
  const style: React.CSSProperties = { opacity: 0, visibility: "hidden", ...shadow };

  return (
    <section ref={sectionRef} className="relative bg-ink" style={{ height: "700vh" }}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden text-white">
        {/* Mobile blurred background */}
        <canvas ref={bgRef} aria-hidden className="absolute inset-0 h-full w-full md:hidden" style={{ filter: "blur(28px) brightness(0.55)", transform: "scale(1.1)" }} />
        {/* Main frame: full cover on desktop, 16:9 band on mobile */}
        <canvas
          ref={mainRef}
          aria-hidden
          className="absolute left-0 w-full rounded-[14px] shadow-2xl [aspect-ratio:16/9] [top:calc(38svh-28.125vw)] md:inset-0 md:h-full md:rounded-none md:shadow-none md:[aspect-ratio:auto]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[35%] md:block" style={{ background: "linear-gradient(to bottom, transparent, rgba(5,11,31,0.55))" }} />

        {/* Text area: below the band on mobile, bottom-left on desktop */}
        <div className="absolute inset-x-0 bottom-0 [top:calc(38svh+28.125vw+18px)] md:top-0">
          <div className="relative mx-auto h-full w-full max-w-7xl px-4 md:px-8">
            {[0, 1, 5, 6].map((i) => (
              <div key={i} ref={setRef(i)} className={`${layer} inset-x-4 top-0 max-w-2xl md:inset-x-8 md:top-auto md:bottom-[12%]`} style={style}>
                <ChapterContent i={i} />
              </div>
            ))}
            <div className="absolute inset-x-4 top-0 flex flex-col gap-2 md:inset-0 md:block">
              {[0, 1, 2].map((c) => (
                <div key={c} ref={setRef(c + 2)} className={`relative md:absolute ${CARD_POS[c]}`} style={style}>
                  <Card i={c} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StaticHero() {
  return (
    <section className="bg-ink text-white">
      <div className="relative">
        <img src={frameSrc("d", 1)} alt="Natec Development building in Sreepur, Gazipur" className="aspect-video w-full object-cover md:h-[100svh] md:aspect-auto" />
      </div>
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 md:px-8">
        {[0, 1].map((i) => <div key={i}><ChapterContent i={i} /></div>)}
        <div className="grid gap-3 md:grid-cols-3">{[0, 1, 2].map((c) => <Card key={c} i={c} />)}</div>
        {[5, 6].map((i) => <div key={i}><ChapterContent i={i} /></div>)}
      </div>
    </section>
  );
}
