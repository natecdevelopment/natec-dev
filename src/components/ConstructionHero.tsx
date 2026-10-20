import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
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

// Building geometry in the SVG
const GROUND = 620;
const BX = 170;
const BW = 260;
const FH = 50;
const COLS = [0, 0.25, 0.5, 0.75, 1];

export function ConstructionHero() {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        setP(clamp(-r.top / total));
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

  const exc = seg(p, 0, 0.1);
  const fnd = seg(p, 0.1, 0.2);
  const built = seg(p, 0.2, 0.6) * FLOORS;
  const fac = seg(p, 0.6, 0.82) * FLOORS;
  const fin = seg(p, 0.84, 0.96);
  const floorCount = Math.min(FLOORS, Math.floor(built + 0.001));
  const stage = [...STAGES].reverse().find((s) => p >= s.at)!;
  const topY = GROUND - Math.max(built, 0.4) * FH;
  const active = p < 0.84;
  const jib = Math.sin(p * 18) * 6;

  return (
    <section ref={ref} className="relative bg-ink text-ink-foreground" style={{ height: "520vh" }}>
      <div className="sticky top-16 flex h-[calc(100vh-4rem)] items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(var(--ink-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--ink-foreground) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-6 px-5 md:grid-cols-[1fr_1.1fr]">
          {/* Copy + gauges */}
          <div className="order-2 md:order-1">
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

          {/* Construction scene */}
          <div className="relative order-1 mx-auto aspect-[6/7] w-full max-w-[min(520px,52vh)] md:order-2 md:max-w-[min(560px,76vh)]">
            <svg viewBox="0 0 600 700" className="absolute inset-0 h-full w-full" style={{ opacity: 1 - fin }}>
              {/* ground */}
              <rect x="0" y={GROUND} width="600" height="80" fill="var(--soil)" opacity="0.5" />
              <line x1="0" y1={GROUND} x2="600" y2={GROUND} stroke="var(--caution)" strokeWidth="2" strokeDasharray="10 6" />
              {/* excavation pit */}
              <rect x={BX - 10} y={GROUND} width={BW + 20} height={45 * exc} fill="var(--ink)" stroke="var(--soil)" />
              {/* dirt pile */}
              <path d={`M20 ${GROUND} Q 70 ${GROUND - 60 * exc} 130 ${GROUND} Z`} fill="var(--soil)" />
              {/* foundation */}
              <rect x={BX - 10} y={GROUND + 45 - 45 * fnd} width={BW + 20} height={45 * fnd} fill="var(--concrete)" />
              {fnd > 0 && fnd < 1 && <text x={BX + BW / 2} y={GROUND + 30} textAnchor="middle" fontSize="12" fill="var(--ink)">POURING CONCRETE</text>}

              {/* floors */}
              {Array.from({ length: FLOORS }).map((_, i) => {
                const local = clamp(built - i);
                if (local <= 0) return null;
                const base = GROUND - i * FH;
                const facade = clamp(fac - i);
                return (
                  <g key={i}>
                    {COLS.map((c) => (
                      <rect key={c} x={BX + c * (BW - 8)} y={base - FH * local} width="8" height={FH * local} fill="var(--concrete)" />
                    ))}
                    {local >= 1 && <rect x={BX - 14} y={base - FH - 4} width={BW + 28} height="6" fill="var(--concrete)" />}
                    {local < 1 && (
                      // rebar sticking up while pouring
                      COLS.map((c) => <line key={`r${c}`} x1={BX + c * (BW - 8) + 4} y1={base - FH * local} x2={BX + c * (BW - 8) + 4} y2={base - FH * local - 14} stroke="var(--caution)" strokeWidth="1.5" />)
                    )}
                    {facade > 0 && (
                      <g opacity={facade}>
                        <rect x={BX + 8} y={base - FH + 2} width={BW * 0.32} height={FH - 6} fill="var(--steel)" />
                        <rect x={BX + 8 + BW * 0.32} y={base - FH + 2} width={BW * 0.28} height={FH - 6} fill="var(--primary)" />
                        <rect x={BX + 8 + BW * 0.6} y={base - FH + 2} width={BW * 0.37} height={FH - 6} fill="var(--ink-foreground)" />
                        <rect x={BX + 30} y={base - FH + 14} width="14" height="16" fill="var(--ink-foreground)" />
                        <rect x={BX + BW * 0.4} y={base - FH + 14} width="12" height="14" fill="var(--ink-foreground)" />
                        <rect x={BX + BW * 0.52} y={base - FH + 14} width="12" height="14" fill="var(--ink-foreground)" />
                        <rect x={BX + BW * 0.72} y={base - FH + 10} width="22" height="26" fill="var(--primary)" opacity="0.7" />
                        <rect x={BX + BW * 0.84} y={base - FH + 10} width="22" height="26" fill="var(--primary)" opacity="0.7" />
                        <rect x={BX - 22} y={base - 12} width="30" height="4" fill="var(--ink-foreground)" />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* scaffolding while building */}
              {built > 0 && fac < FLOORS && (
                <g stroke="var(--caution)" strokeWidth="1" opacity="0.55">
                  <line x1={BX - 24} y1={GROUND} x2={BX - 24} y2={topY} />
                  <line x1={BX + BW + 24} y1={GROUND} x2={BX + BW + 24} y2={topY} />
                  {Array.from({ length: Math.ceil(built) }).map((_, i) => (
                    <g key={i}>
                      <line x1={BX - 30} y1={GROUND - i * FH} x2={BX - 18} y2={GROUND - i * FH} />
                      <line x1={BX + BW + 18} y1={GROUND - i * FH} x2={BX + BW + 30} y2={GROUND - i * FH} />
                    </g>
                  ))}
                </g>
              )}

              {/* tower crane */}
              <g opacity={active ? 1 : 0}>
                <rect x="486" y="70" width="14" height={GROUND - 70} fill="none" stroke="var(--caution)" strokeWidth="2" />
                {Array.from({ length: 22 }).map((_, i) => (
                  <line key={i} x1="486" y1={70 + i * 25} x2="500" y2={95 + i * 25} stroke="var(--caution)" strokeWidth="1" />
                ))}
                <g transform={`rotate(${jib} 493 70)`}>
                  <rect x="230" y="62" width="330" height="10" fill="var(--caution)" />
                  <rect x="520" y="72" width="34" height="22" fill="var(--steel)" />
                  <line x1="493" y1="30" x2="240" y2="62" stroke="var(--caution)" strokeWidth="1.5" />
                  <line x1="493" y1="30" x2="555" y2="62" stroke="var(--caution)" strokeWidth="1.5" />
                  <rect x="486" y="30" width="14" height="32" fill="var(--caution)" />
                  <line x1="330" y1="72" x2="330" y2={topY - 30} stroke="var(--ink-foreground)" strokeWidth="1" />
                  <rect x="318" y={topY - 30} width="24" height="12" fill="var(--accent)" className="animate-pulse" />
                </g>
                <circle cx="493" cy="28" r="4" fill="var(--accent)" className="animate-pulse" />
              </g>

              {/* workers */}
              {active && p > 0.02 && [0, 1, 2].map((w) => (
                <g key={w} transform={`translate(${BX + 40 + w * 80 + Math.sin(p * 60 + w) * 18}, ${(built > 0 ? topY : GROUND) - 16})`}>
                  <circle cx="0" cy="0" r="5" fill="var(--caution)" />
                  <rect x="-4" y="5" width="8" height="11" fill="var(--accent)" />
                </g>
              ))}

              {/* excavator on ground */}
              {p < 0.3 && (
                <g transform={`translate(${40 + exc * 40}, ${GROUND - 34})`}>
                  <rect x="0" y="12" width="60" height="16" rx="3" fill="var(--caution)" />
                  <rect x="8" y="0" width="22" height="14" fill="var(--caution)" />
                  <rect x="4" y="28" width="56" height="8" rx="4" fill="var(--ink-foreground)" opacity="0.6" />
                  <line x1="55" y1="14" x2={85} y2={-10 + Math.sin(p * 80) * 8} stroke="var(--caution)" strokeWidth="5" />
                </g>
              )}

              {/* floor tag */}
              {built > 0 && active && (
                <g>
                  <line x1={BX - 40} y1={topY} x2={BX - 70} y2={topY} stroke="var(--ink-foreground)" strokeWidth="1" />
                  <text x={BX - 74} y={topY + 4} textAnchor="end" fontSize="13" fill="var(--ink-foreground)" fontFamily="monospace">L{String(floorCount).padStart(2, "0")}</text>
                </g>
              )}
            </svg>

            <img
              src={front.url}
              alt="Shobuj Angon — completed residential building by Natec Development"
              className="absolute inset-0 h-full w-full object-cover shadow-2xl"
              style={{ opacity: fin, transform: `scale(${0.94 + fin * 0.06})` }}
            />
            {fin > 0.9 && (
              <div className="absolute bottom-3 left-3 bg-success px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink-foreground">Completed · Shobuj Angon</div>
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
