import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck, Award, Lightbulb, Leaf, HeartHandshake, Briefcase,
  MapPinned, ClipboardList, Banknote, FileCheck2, PencilRuler, HardHat, Megaphone, Building2,
  Users, Eye, FileText, BadgeCheck, Mail, Phone, MapPin, ArrowRight,
} from "lucide-react";
import { Reveal, WhatsAppIcon } from "@/components/SiteChrome";
import { company, values, services, directors } from "@/lib/site";

const URL = "https://natec-dev.lovable.app/about";
const TITLE = "About Natec Development Ltd. | Real Estate Developer in Gazipur";
const DESC = "Natec Development Ltd., established 2023 in Rajendrapur, Sreepur, Gazipur. Our story, mission, values, leadership and the 75 homes we have built and sold.";
const WA_VISIT = `${company.whatsappLink}?text=${encodeURIComponent("Hi Natec, I'd like to book a site visit.")}`;

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://natec-dev.lovable.app/" },
            { "@type": "ListItem", position: 2, name: "About", item: URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: company.name,
          url: "https://natec-dev.lovable.app/",
          logo: "https://natec-dev.lovable.app/brand/natec-logo-transparent.png",
          foundingDate: "2023",
          founders: directors.map((d) => ({ "@type": "Person", name: d.name, jobTitle: d.role })),
          address: {
            "@type": "PostalAddress",
            streetAddress: "1st Floor, Vai Vai Market, opposite Walton showroom, Dhaka–Kapasia Road, Rajendrapur Bazar",
            addressLocality: "Sreepur, Gazipur",
            postalCode: "1741",
            addressCountry: "BD",
          },
          telephone: "+8801354252400",
          email: company.email,
          sameAs: [company.facebook],
        }),
      },
    ],
  }),
  component: AboutPage,
});

const valueIcons = [ShieldCheck, Award, Lightbulb, Leaf, HeartHandshake, Briefcase];
const serviceIcons = [MapPinned, ClipboardList, Banknote, FileCheck2, PencilRuler, HardHat, Megaphone, Building2];

function CountUp({ to, suffix = "", plain = false }: { to: number; suffix?: string; plain?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(plain ? to : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || plain) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(to); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, plain]);
  return <span ref={ref} className="num">{n}{suffix}</span>;
}

function initials(name: string) {
  return name.replace(/^Md\.\s*/, "").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function AboutHero() {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const write = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / (el.offsetHeight || 1)));
      el.style.setProperty("--hp", p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(write); };
    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={ref} className="relative isolate flex min-h-[88svh] items-end overflow-hidden bg-navy text-white md:min-h-[84svh]">
      <img src="/projects/shobuj-angon/side.webp" alt="Shobuj Angon residential building by Natec Development at Rajendrapur Bazar, Sreepur" width={1200} height={900} className="about-hero-img absolute inset-0 h-full w-full object-cover" />
      <div className="about-hero-veil absolute inset-0" aria-hidden />
      <div className="about-hero-copy container-x relative z-10 pb-14 pt-10 md:pb-20">
        <nav aria-label="Breadcrumb" className="eyebrow hero-in !text-[11px] text-white/55">
          <Link to="/" className="hover:text-white">Home</Link> <span aria-hidden>›</span> <span aria-current="page" className="text-white/80">About</span>
        </nav>
        <p className="eyebrow hero-in mt-8 text-white/70 md:mt-10" style={{ animationDelay: "120ms" }}>About us</p>
        <h1 className="hero-in mt-4 max-w-[20ch]" style={{ animationDelay: "220ms" }}>Building lasting homes in <em className="accent-dark">Sreepur, Gazipur</em></h1>
        <p className="hero-in mt-6 max-w-[54ch] text-lg text-white/85" style={{ animationDelay: "340ms" }}>
          Natec Development Ltd. is a real estate developer founded in 2023 at Rajendrapur Bazar. We plan, build and hand over residential buildings for families who want a well-built home close to Dhaka.
        </p>
        <div className="hero-in mt-9 flex flex-wrap gap-3" style={{ animationDelay: "460ms" }}>
          <Link to="/projects" className="btn btn-primary">View projects</Link>
          <a href={WA_VISIT} target="_blank" rel="noreferrer" className="btn btn-ghost-dark">Book a site visit</a>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-5 right-5 z-10 hidden items-center gap-3 md:flex" aria-hidden>
        <span className="eyebrow !text-[10px] text-white/50">Scroll</span>
        <span className="block h-10 w-px overflow-hidden bg-white/20"><span className="scroll-hint-line block h-full w-full bg-white/70" /></span>
      </div>
    </section>
  );
}

export function AboutPage() {
  return (
    <>
      {/* 1. Hero */}
      <AboutHero />

      {/* 2. Story */}
      <section className="section-pad bg-ivory">
        <div className="container-x grid items-center gap-12 md:grid-cols-2 md:gap-16">
          <Reveal className="space-y-5 text-muted-foreground">
            <p className="eyebrow text-brand-red">Since 2023</p>
            <h2 className="text-primary">Our story</h2>
            <p>Natec Development Ltd. started in 2023 with a simple idea: families in Sreepur and Gazipur deserve homes that are planned carefully, built honestly and handed over as promised.</p>
            <p>Our first project, Shobuj Angon at Padma Gate, Rajendrapur Bazar, is complete and every one of its 28 flats is sold. Shobuj Aloy and Shobuj Digonto are rising now, and they are fully sold too. Together that is 75 homes, delivered or under construction.</p>
            <p>We work across the whole development journey — finding and acquiring land, planning and design, permits, construction and sales — so our clients deal with one accountable team from the first meeting to handover.</p>
          </Reveal>
          <Reveal className="grid grid-cols-2 gap-3 sm:gap-4">
            <img src="/projects/shobuj-angon/front.webp" alt="Front view of Shobuj Angon, completed by Natec" loading="lazy" width={800} height={1000} className="row-span-2 h-full w-full rounded-2xl object-cover" />
            <img src="/projects/shobuj-aloy/front.webp" alt="Shobuj Aloy residential building under construction" loading="lazy" width={800} height={600} className="aspect-[4/3] w-full rounded-2xl object-cover" />
            <img src="/projects/shobuj-digonto/front.webp" alt="Shobuj Digonto residential building under construction" loading="lazy" width={800} height={600} className="aspect-[4/3] w-full rounded-2xl object-cover" />
          </Reveal>
        </div>
      </section>

      {/* 3. Numbers */}
      <section className="bg-navy-deep py-14 text-white md:py-20" aria-label="Natec in numbers">
        <div className="container-x grid grid-cols-2 gap-y-10 text-center sm:grid-cols-3 lg:grid-cols-5">
          {[
            { v: <CountUp to={2023} plain />, l: "Founded" },
            { v: <CountUp to={3} />, l: "Projects" },
            { v: <CountUp to={75} />, l: "Homes" },
            { v: <CountUp to={100} suffix="%" />, l: "Sold" },
            { v: <CountUp to={2} />, l: "Upcoming projects" },
          ].map((s, i) => (
            <div key={i} className={i === 4 ? "col-span-2 sm:col-span-1" : ""}>
              <div className="font-display text-4xl md:text-5xl">{s.v}</div>
              <div className="eyebrow mt-2 !text-[11px] text-muted-dark">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Mission & vision */}
      <section className="section-pad bg-white">
        <div className="container-x">
          <Reveal><h2 className="text-primary">Mission and vision</h2></Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[
              { k: "Our mission", t: "To provide dependable real estate development services through thoughtful planning, practical design, and careful project coordination. We aim to understand our clients' needs, uphold professional standards, and support projects that create long-term value for clients, partners, and communities." },
              { k: "Our vision", t: "To grow as a trusted real estate development company in Bangladesh, recognized for responsible development, quality-focused service, and lasting relationships with clients and partners — contributing positively to the places where we work." },
            ].map((c) => (
              <Reveal key={c.k} className="rounded-2xl bg-ivory p-8 md:p-12">
                <p className="eyebrow text-brand-red">{c.k}</p>
                <p className="mt-5 font-display text-xl leading-snug text-primary md:text-2xl">{c.t}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Values */}
      <section className="section-pad bg-ivory">
        <div className="container-x">
          <Reveal><p className="eyebrow text-brand-red">What guides us</p><h2 className="mt-3 text-primary">Our values</h2></Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => {
              const Icon = valueIcons[i] ?? ShieldCheck;
              return (
                <Reveal key={v.title} className="relative overflow-hidden rounded-2xl bg-white p-7">
                  <span className="absolute left-0 top-0 h-1 w-full bg-brand-red" aria-hidden />
                  <Icon className="h-8 w-8 text-primary" strokeWidth={1.4} aria-hidden />
                  <h3 className="mt-5 text-primary">{v.title}</h3>
                  <p className="mt-2 text-muted-foreground">{v.body}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. What we do */}
      <section className="section-pad bg-white">
        <div className="container-x">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div><p className="eyebrow text-brand-red">Services</p><h2 className="mt-3 text-primary">What we do</h2></div>
            <Link to="/services" className="btn btn-ghost-light">All services</Link>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.slice(0, 8).map((s, i) => {
              const Icon = serviceIcons[i] ?? Building2;
              return (
                <Link key={s.title} to="/services" className="group flex min-h-[44px] items-center gap-4 rounded-2xl border border-border p-5 transition-colors hover:border-primary">
                  <Icon className="h-6 w-6 shrink-0 text-brand-red" strokeWidth={1.5} aria-hidden />
                  <span className="font-medium text-primary">{s.title}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Journey */}
      <section className="section-pad bg-ivory">
        <div className="container-x">
          <Reveal><p className="eyebrow text-brand-red">Milestones</p><h2 className="mt-3 text-primary">Our journey</h2></Reveal>
          <ol className="relative mt-12 grid gap-8 border-l border-primary/25 pl-6 md:grid-cols-5 md:gap-6 md:border-l-0 md:border-t md:pl-0 md:pt-8">
            {[
              { y: "2023", t: "Natec Development Ltd. founded" },
              { y: "[year]", t: "Shobuj Angon (Project 01) completed and sold out" },
              { y: "Now", t: "Shobuj Aloy (Project 02) under construction, sold out" },
              { y: "Now", t: "Shobuj Digonto (Project 03) under construction, sold out" },
              { y: "Next", t: "Upcoming projects at Rajendrapur Bazar and Gazipur" },
            ].map((m, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-brand-red md:-top-[38px] md:left-0" aria-hidden />
                <p className="font-display text-2xl text-primary">{m.y}</p>
                <p className="mt-1 text-muted-foreground">{m.t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 8. Leadership */}
      <section className="section-pad bg-white">
        <div className="container-x">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div><p className="eyebrow text-brand-red">Leadership</p><h2 className="mt-3 text-primary">The people behind Natec</h2></div>
            <Link to="/directors" className="btn btn-ghost-light">Meet the board</Link>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {directors.map((d) => (
              <Reveal key={d.name} className="rounded-2xl border border-border p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy font-display text-xl text-white" aria-hidden>{initials(d.name)}</div>
                <h3 className="mt-5 text-primary">{d.name}</h3>
                <p className="eyebrow mt-1 !text-[11px] text-brand-red">{d.role}</p>
                <p className="mt-3 text-muted-foreground">{d.bio}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <a href={`mailto:${d.email}`} className="flex min-h-[44px] items-center gap-2 break-all text-primary hover:underline"><Mail className="h-4 w-4 shrink-0" />{d.email}</a>
                  <a href={`tel:${d.phone.replace(/[\s-]/g, "")}`} className="flex min-h-[44px] items-center gap-2 text-primary hover:underline"><Phone className="h-4 w-4 shrink-0" />{d.phone}</a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Trust */}
      <section className="section-pad bg-navy text-white">
        <div className="container-x">
          <Reveal><p className="eyebrow text-muted-dark">Why buyers trust us</p><h2 className="mt-3">Built on <em className="accent-dark">accountability</em></h2></Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { I: Users, t: "One accountable team", b: "Land, planning, permits, construction and sales handled by the same team, from first meeting to handover." },
              { I: Eye, t: "On-site supervision", b: "Our team follows construction on site as each building rises." },
              { I: FileText, t: "Clear communication and documents", b: "We explain each step and the paperwork involved, so you always know where things stand." },
              { I: BadgeCheck, t: "Every project sold out", b: "All 75 homes across Shobuj Angon, Shobuj Aloy and Shobuj Digonto are sold." },
            ].map(({ I, t, b }) => (
              <Reveal key={t}>
                <I className="h-8 w-8 text-white" strokeWidth={1.4} aria-hidden />
                <h3 className="mt-4">{t}</h3>
                <p className="mt-2 text-muted-dark">{b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 10. CTA */}
      <section className="relative overflow-hidden text-white">
        <img src="/projects/shobuj-angon/aerial.webp" alt="" aria-hidden loading="lazy" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-navy-deep/75" />
        <div className="section-pad relative">
          <Reveal className="container-x max-w-3xl text-center">
            <h2>Visit our sites at Rajendrapur Bazar</h2>
            <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
              <a href={WA_VISIT} target="_blank" rel="noreferrer" className="btn btn-primary"><WhatsAppIcon /> WhatsApp</a>
              <a href={company.phoneLink} className="btn btn-ghost-dark"><Phone className="h-4 w-4" /> Call</a>
            </div>
            <p className="mx-auto mt-8 flex max-w-xl justify-center gap-2 text-white/90"><MapPin className="mt-1 h-5 w-5 shrink-0" />{company.address}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
