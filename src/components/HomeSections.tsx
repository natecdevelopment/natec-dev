import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, ShieldCheck, ArrowUpDown, Trees, Car, Lock, Phone, Mail, BedDouble, Bath, Sofa, UtensilsCrossed, CookingPot, Fence, Ruler } from "lucide-react";
import { company, directors } from "@/lib/site";
import { PersonFemaleIcon, PersonMaleIcon } from "@/components/PersonIcons";
import { Reveal, WhatsAppIcon } from "@/components/SiteChrome";
import { InquiryForm } from "@/components/InquiryForm";
import { frameSrc } from "@/components/CinematicHero";
import { PROJECTS, SoldOut, UpcomingCards, WA_UPCOMING } from "@/components/ProjectsGrid";
import { VintageKeyIcon } from "@/components/VintageKeyIcon";
import homeSketch from "@/assets/home-sketch.png";

function Eyebrow({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`eyebrow ${dark ? "text-muted-dark" : "text-brand-red"}`}>{children}</p>;
}

/* ---------- 1. Intro + numbers ---------- */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string | undefined }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = to > 1000 ? to - 40 : 0;
    el.textContent = `${reduce ? to : start}${suffix}`;
    if (reduce) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1400);
        el.textContent = `${Math.round(start + (to - start) * (1 - Math.pow(1 - k, 3)))}${suffix}`;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [to, suffix]);
  return <span ref={ref}>{to}{suffix}</span>;
}

export function Intro() {
  const stats = [
    { n: 2023, l: "Established" },
    { n: 3, l: "Projects" },
    { n: 5, l: "Directors" },
    { n: 100, s: "%", l: "On-site supervision" },
  ];
  return (
    <section className="section-pad bg-ivory">
      <div className="container-x">
        <Reveal className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:gap-16">
          <div>
            <h2 className="text-navy">
              We build homes the careful way — <em className="accent-light">so families can live in them for generations.</em>
            </h2>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-5 md:mt-11">
              <img src={homeSketch} alt="Hand-drawn sketch of a modern family home surrounded by trees" loading="lazy" width={973} height={509} className="w-[168px] shrink-0 md:w-[232px]" />
              <div className="min-w-0 md:border-l md:border-border md:pl-6">
                <p className="font-label text-[10px] font-medium uppercase leading-[1.9] tracking-[0.3em] text-navy md:text-[11px]">
                  Building trust,<br /> generation after generation
                </p>
                <VintageKeyIcon className="mt-3 h-[15px] w-[30px] text-brand-red" />
              </div>
            </div>
          </div>
          <div className="max-w-[62ch] space-y-4 text-muted-foreground">
            <Eyebrow>About Natec</Eyebrow>
            <p>Established in 2023, Natec Development Ltd. is a real estate development company based in Sreepur, Gazipur. We support clients through every key stage — land acquisition, project planning, building design, construction management, marketing, sales and property management.</p>
            <p>We approach each project with careful planning, clear communication and close attention to what our clients need.</p>
            <Link to="/about" className="inline-flex items-center gap-2 font-semibold text-navy hover:text-brand-red">More about us <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </Reveal>
        <Reveal className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border md:mt-20 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="bg-ivory p-6 md:p-8">
              <div className="num text-5xl text-navy md:text-6xl"><CountUp to={s.n} suffix={s.s} /></div>
              <div className="eyebrow mt-2 !text-[11px] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 2. Projects ---------- */
export function ProjectsShowcase() {
  return (
    <section className="section-pad bg-navy-deep text-white">
      <div className="container-x">
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow dark>Our projects</Eyebrow>
            <h2 className="mt-3">Homes taking shape <em className="accent-dark">across Gazipur.</em></h2>
            <p className="mt-4 text-lg text-muted-dark">75 homes delivered or under construction — all sold.</p>
          </div>
          <Link to="/projects" className="btn btn-ghost-dark">All projects</Link>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {PROJECTS.map((p) => (
            <Reveal key={p.name}>
              <div className="group relative block overflow-hidden rounded-2xl">
                <img src={p.gallery[0]} alt={`${p.name} by Natec Development`} loading="lazy" width={1200} height={900} className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(4,26,56,0.92) 0%, rgba(4,26,56,0.35) 45%, transparent 70%)" }} />
                <span className={`eyebrow absolute left-5 top-5 rounded-full px-3 py-1.5 !text-[10px] ${p.status === "Completed" ? "bg-success text-white" : "bg-white text-navy"}`}>{p.status}</span>
                <SoldOut className="absolute right-5 top-5" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="eyebrow !text-[10px] text-white/70">{p.no}</p>
                  <h3 className="!text-3xl">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-dark">{p.address}</p>
                  <p className="text-sm text-muted-dark">{p.type} · {p.flats} flats</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs"><span className="eyebrow !text-[10px]">Construction</span><span className="num">{p.pct}%</span></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-brand-red" style={{ width: `${p.pct}%` }} /></div>
                  </div>
                  <a href={WA_UPCOMING} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline">Register interest for upcoming projects <ArrowRight className="h-4 w-4" /></a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <h3 className="eyebrow mb-6 mt-16 !text-[13px] text-muted-dark">Upcoming projects</h3>
        <UpcomingCards dark />
      </div>
    </section>
  );
}

/* ---------- 3. Floor plan ---------- */
const SPECS = [
  { i: Ruler, t: "Approx. 1,250 sq ft" },
  { i: BedDouble, t: "3 bedrooms" },
  { i: Bath, t: "3 bathrooms" },
  { i: Sofa, t: "Living room" },
  { i: UtensilsCrossed, t: "Dining area" },
  { i: CookingPot, t: "Fitted kitchen" },
  { i: Fence, t: "2 balconies" },
];

export function FloorPlan() {
  const [tab, setTab] = useState<"3d" | "top">("3d");
  return (
    <section className="section-pad bg-ivory">
      <div className="container-x grid items-center gap-12 md:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <div className="mb-5 inline-flex rounded-full border border-input p-1">
            {(["3d", "top"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`eyebrow rounded-full px-5 py-2 !text-[11px] transition ${tab === k ? "bg-navy text-white" : "text-navy"}`}>
                {k === "3d" ? "3D view" : "Plan"}
              </button>
            ))}
          </div>
          <img src={`/floorplan/floorplan-${tab}.webp`} alt={tab === "3d" ? "3D floor plan of a sample Natec home" : "Top-down floor plan of a sample Natec home"} loading="lazy" width={1600} height={1200} className="w-full rounded-2xl bg-white object-contain shadow-xl" />
        </Reveal>
        <Reveal>
          <Eyebrow>Floor plan</Eyebrow>
          <h2 className="mt-3 text-navy">A home planned around <em className="accent-light">family life.</em></h2>
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {SPECS.map(({ i: I, t }) => (
              <li key={t} className="flex items-center gap-4 py-3.5 text-foreground"><I className="h-5 w-5 text-navy" strokeWidth={1.4} /> {t}</li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-muted-foreground">Sample layout — actual plans vary by project.</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 4. Why Natec ---------- */
const WHY = [
  { i: MapPin, t: "Prime location", b: "Minutes from Rajendrapur Bazar and the Dhaka–Mymensingh Highway." },
  { i: ShieldCheck, t: "Earthquake-resistant RCC structure", b: "Engineered frame, tested materials, checked at every floor." },
  { i: ArrowUpDown, t: "Lift & generator backup", b: "Daily comfort, even during power cuts." },
  { i: Trees, t: "Rooftop garden", b: "Open green space above the city." },
  { i: Car, t: "Car parking", b: "Secure parking on the ground floor." },
  { i: Lock, t: "24/7 security", b: "Guarded entry and CCTV for peace of mind." },
];

export function WhyNatec() {
  const Tile = ({ w, className = "" }: { w: (typeof WHY)[number]; className?: string }) => (
    <Reveal className={`relative rounded-2xl border border-border bg-white p-7 ${className}`}>
      <span className="absolute right-6 top-6 h-2 w-2 rounded-full bg-brand-red" />
      <w.i className="h-8 w-8 text-navy" strokeWidth={1.2} />
      <h3 className="mt-6 text-navy">{w.t}</h3>
      <p className="mt-2 text-[15px] text-muted-foreground">{w.b}</p>
    </Reveal>
  );
  return (
    <section className="section-pad bg-white">
      <div className="container-x">
        <Reveal className="mb-12 max-w-2xl">
          <Eyebrow>Why Natec</Eyebrow>
          <h2 className="mt-3 text-navy">Everything a family <em className="accent-light">needs, built in.</em></h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          <Reveal className="relative min-h-[420px] overflow-hidden rounded-2xl md:row-span-2">
            <img src={frameSrc("d", 53)} alt="Rooftop garden view of a Natec building" loading="lazy" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(4,26,56,0.85), transparent 60%)" }} />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white">
              <span className="mb-4 block h-2 w-2 rounded-full bg-brand-red" />
              <h3>{WHY[3]!.t}</h3>
              <p className="mt-2 text-[15px] text-white/85">{WHY[3]!.b}</p>
            </div>
          </Reveal>
          {WHY.filter((_, i) => i !== 3).map((w) => <Tile key={w.t} w={w} />)}
        </div>
      </div>
    </section>
  );
}

/* ---------- 5. How we build ---------- */
const STEPS = [
  { t: "Excavation", b: "Soil testing, survey and a clean, level site." },
  { t: "Foundation", b: "Deep piles and a reinforced raft, inspected before pour." },
  { t: "Structure", b: "RCC columns and slabs, floor by floor." },
  { t: "Facade", b: "Brickwork, plaster, windows and exterior finish." },
  { t: "Handover", b: "Final checks, documents and your keys." },
];

export function HowWeBuild() {
  const ref = useRef<HTMLOListElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => {
      const el = ref.current, f = fill.current;
      if (!el || !f) return;
      const r = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (window.innerHeight * 0.7 - r.top) / r.height));
      f.style.transform = window.innerWidth >= 768 ? `scaleX(${p})` : `scaleY(${p})`;
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return (
    <section className="section-pad bg-navy text-white">
      <div className="container-x">
        <Reveal className="mb-14 max-w-2xl">
          <Eyebrow dark>How we build</Eyebrow>
          <h2 className="mt-3">Five stages. <em className="accent-dark">One team.</em></h2>
        </Reveal>
        <ol ref={ref} className="relative grid gap-10 pl-10 md:grid-cols-5 md:gap-6 md:pl-0 md:pt-12">
          <div aria-hidden className="absolute bottom-0 left-[11px] top-0 w-px bg-line-dark md:left-0 md:right-0 md:top-[11px] md:h-px md:w-auto" />
          <div ref={fill} aria-hidden className="absolute bottom-0 left-[11px] top-0 w-px origin-top bg-brand-red md:left-0 md:right-0 md:top-[11px] md:h-[2px] md:w-auto md:origin-left" style={{ transform: "scaleY(0)" }} />
          {STEPS.map((s, i) => (
            <li key={s.t} className="relative">
              <span className="absolute -left-10 top-0 flex h-[23px] w-[23px] items-center justify-center rounded-full border border-white/40 bg-navy md:-top-12 md:left-0"><span className="h-2 w-2 rounded-full bg-brand-red" /></span>
              <span className="num text-sm text-muted-dark">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-1">{s.t}</h3>
              <p className="mt-2 text-[15px] text-muted-dark">{s.b}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- 6. Location ---------- */
const NEARBY = [
  { t: "Rajendrapur Bazar", d: "2 min" },
  { t: "Dhaka–Mymensingh Highway", d: "10 min" },
  { t: "Schools & colleges", d: "5 min" },
  { t: "Hospital", d: "10 min" },
  { t: "Market & shopping", d: "3 min" },
];

export function Location() {
  return (
    <section className="section-pad bg-ivory">
      <div className="container-x grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <Eyebrow>Location</Eyebrow>
          <h2 className="mt-3 text-navy">Close to everything <em className="accent-light">that matters.</em></h2>
          <p className="mt-4 max-w-[62ch] text-muted-foreground">{company.address}</p>
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {NEARBY.map((n) => (
              <li key={n.t} className="flex items-center justify-between py-3.5"><span className="flex items-center gap-3"><MapPin className="h-4 w-4 text-brand-red" strokeWidth={1.6} />{n.t}</span><span className="num text-navy">{n.d}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Approximate travel times by road.</p>
        </Reveal>
        <Reveal className="overflow-hidden rounded-2xl shadow-xl">
          <iframe title="Natec Development office location" src="https://www.google.com/maps?q=Rajendrapur+Bazar,+Sreepur,+Gazipur,+Bangladesh&output=embed" className="block h-[380px] w-full border-0 md:h-full md:min-h-[480px]" loading="lazy" />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 7. Board ---------- */
export function Board() {
  return (
    <section className="section-pad bg-white">
      <div className="container-x">
        <Reveal className="mb-12 max-w-2xl">
          <Eyebrow>Board of directors</Eyebrow>
          <h2 className="mt-3 text-navy">The people <em className="accent-light">behind every floor.</em></h2>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {directors.map((d) => (
            <Reveal key={d.name} className="flex flex-col rounded-2xl border border-border bg-ivory p-7">
              <div className="flex aspect-square w-20 items-center justify-center rounded-full bg-navy text-white">
                {d.gender === "female" ? <PersonFemaleIcon className="h-16 w-16" /> : <PersonMaleIcon className="h-16 w-16" />}
              </div>
              <h3 className="mt-5 text-navy">{d.name}</h3>
              <p className="eyebrow mt-1 !text-[11px] text-brand-red">{d.role}</p>
              <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
                <a href={`mailto:${d.email}`} className="flex items-center gap-2 break-all text-foreground hover:text-brand-red"><Mail className="h-4 w-4 shrink-0 text-navy" />{d.email}</a>
                <a href={`tel:${d.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 text-foreground hover:text-brand-red"><Phone className="h-4 w-4 shrink-0 text-navy" />{d.phone}</a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 8. CTA + contact ---------- */
export function ContactCTA() {
  return (
    <section className="relative overflow-hidden text-white">
      <img src={frameSrc("d", 197)} alt="" aria-hidden loading="lazy" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-navy-deep/65" />
      <div className="section-pad relative">
        <div className="container-x grid items-center gap-12 md:grid-cols-[1fr_1.15fr]">
          <Reveal>
            <Eyebrow dark>Contact</Eyebrow>
            <h2 className="mt-3">Visit the site. <em className="accent-dark">Meet the team.</em></h2>
            <div className="mt-8 space-y-4">
              <a href={company.whatsappLink} target="_blank" rel="noreferrer" className="btn btn-primary"><WhatsAppIcon /> {company.whatsapp}</a>
              <a href={company.phoneLink} className="flex items-center gap-3 text-white/90 hover:text-white"><Phone className="h-5 w-5" /> {company.phone}</a>
              <a href={`mailto:${company.email}`} className="flex items-center gap-3 text-white/90 hover:text-white"><Mail className="h-5 w-5" /> {company.email}</a>
              <p className="flex max-w-md gap-3 text-white/90"><MapPin className="h-5 w-5 shrink-0" /> {company.address}</p>
            </div>
          </Reveal>
          <Reveal><InquiryForm /></Reveal>
        </div>
      </div>
    </section>
  );
}
