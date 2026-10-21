import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Phone, Mail, MapPin } from "lucide-react";
import { company } from "@/lib/site";

export const logo = { url: "/brand/natec-logo.png" };
// Original brand colours on a transparent background (no white box).
const fullLogoUrl = "/brand/natec-logo-transparent.png";
const markUrl = "/brand/natec-mark.png";

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/projects", label: "Projects" },
  { to: "/floor-plan", label: "Floor Plan" },
  { to: "/location", label: "Location" },
  { to: "/contact", label: "Contact" },
] as const;

export function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.43 9.43 0 0 1 9.43 9.44c0 5.2-4.23 9.43-9.44 9.43m8.03-17.46A11.3 11.3 0 0 0 12.05.72C5.79.72.7 5.8.7 12.07c0 2 .52 3.95 1.52 5.67L.6 23.6l6-1.57a11.3 11.3 0 0 0 5.43 1.38h.01c6.26 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02" />
    </svg>
  );
}

export function FacebookIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.5V4.46A20 20 0 0 0 14.3 4.3c-2.2 0-3.7 1.34-3.7 3.8v2.4H8.1v3h2.5V21z" />
    </svg>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const home = useLocation({ select: (l) => l.pathname === "/" });

  useEffect(() => {
    if (!home) return setSolid(true);
    const hero = document.getElementById("hero");
    const on = () => setSolid(window.scrollY > (hero ? hero.offsetHeight - window.innerHeight : 80));
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [home]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Over the hero: a floating white bar. After it: a full-width white bar. White keeps the logo in its real colours. */}
      <div
        className={`transition-all duration-300 ${
          solid
            ? "bg-white shadow-[0_1px_0_rgba(7,47,99,0.08),0_8px_24px_-12px_rgba(7,47,99,0.25)]"
            : "mx-3 mt-2 rounded-2xl bg-white/95 shadow-[0_10px_30px_-12px_rgba(4,26,56,0.45)] md:mx-6 md:mt-3"
        }`}
      >
        <div className={`container-x flex items-center justify-between transition-all duration-300 ${solid ? "h-16 md:h-[72px]" : "h-14 md:h-16"}`}>
          <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <img src={markUrl} alt="" aria-hidden width={44} height={44} className="h-9 w-auto md:h-10" />
            <span className="font-label text-[12px] leading-tight tracking-[0.24em] text-navy">
              NATEC<span className="block text-[9px] tracking-[0.2em] text-navy/75">DEVELOPMENT LTD.</span>
            </span>
            <span className="sr-only">Natec Development Ltd. — home</span>
          </Link>
          <nav className="hidden items-center gap-7 lg:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="eyebrow !text-[12px] text-navy/70 transition hover:text-navy"
                activeProps={{ className: "!text-navy underline decoration-brand-red decoration-2 underline-offset-8" }}
                activeOptions={{ exact: true }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <AccountLink />
            <a href={company.whatsappLink} target="_blank" rel="noreferrer" className="btn btn-primary hidden !px-5 !py-3 sm:inline-flex">
              <WhatsAppIcon /> WhatsApp
            </a>
            <a href={company.whatsappLink} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red text-white sm:hidden">
              <WhatsAppIcon />
            </a>
            <button className="rounded-full p-2 text-navy hover:bg-navy/5 lg:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <nav className="fixed inset-0 -z-10 flex flex-col gap-1 overflow-y-auto bg-white px-6 pb-8 pt-24 text-navy md:pt-28 lg:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="border-b border-navy/10 py-4 font-display text-3xl hover:text-brand-red" activeProps={{ className: "!text-brand-red" }} activeOptions={{ exact: true }}>
              {n.label}
            </Link>
          ))}
          <a href={company.whatsappLink} target="_blank" rel="noreferrer" className="btn btn-primary mt-8 w-full">
            <WhatsAppIcon /> WhatsApp
          </a>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  const social = "flex h-10 w-10 items-center justify-center rounded-full border border-navy/15 text-navy transition hover:border-brand-red hover:bg-brand-red hover:text-white";
  return (
    <footer className="border-t-4 border-brand-red bg-ivory text-ink">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1.4fr] md:py-20">
        <div>
          <img src={fullLogoUrl} alt="Natec Development Ltd. logo" width={120} height={144} loading="lazy" className="h-28 w-auto md:h-32" />
          <p className="mt-5 max-w-xs text-sm text-muted-foreground">Well-planned homes in Sreepur, Gazipur — built floor by floor since 2023.</p>
          <div className="mt-6 flex gap-3">
            <a href={company.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className={social}><FacebookIcon /></a>
            <a href={company.whatsappLink} target="_blank" rel="noreferrer" aria-label="WhatsApp" className={social}><WhatsAppIcon /></a>
          </div>
        </div>
        <div>
          <h4 className="eyebrow mb-5 !text-brand-red">Quick links</h4>
          <ul className="space-y-2 text-sm">
            {nav.map((n) => <li key={n.to}><Link to={n.to} className="text-navy/80 transition hover:text-brand-red">{n.label}</Link></li>)}
          </ul>
        </div>
        <div className="space-y-3 text-sm">
          <h4 className="eyebrow mb-5 !text-brand-red">Contact</h4>
          <a className="flex items-center gap-3 text-navy/80 transition hover:text-brand-red" href={company.whatsappLink}><WhatsAppIcon /> {company.whatsapp}</a>
          <a className="flex items-center gap-3 text-navy/80 transition hover:text-brand-red" href={company.phoneLink}><Phone className="h-4 w-4" /> {company.phone}</a>
          <a className="flex items-center gap-3 text-navy/80 transition hover:text-brand-red" href={`mailto:${company.email}`}><Mail className="h-4 w-4" /> {company.email}</a>
          <p className="flex gap-3 text-muted-foreground"><MapPin className="h-4 w-4 shrink-0 text-navy" /> {company.address}</p>
        </div>
      </div>
      <div className="bg-navy py-5 text-center text-xs tracking-wide text-white/80">© {new Date().getFullYear()} Natec Development Ltd. · All rights reserved.</div>
    </footer>
  );
}

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <section className="bg-navy text-white">
      <div className="container-x py-16 md:py-24">
        <p className="eyebrow text-muted-dark">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl">{title}</h1>
        {intro && <p className="mt-5 max-w-[62ch] text-lg text-muted-dark">{intro}</p>}
      </div>
    </section>
  );
}

export function Reveal({ children, className = "", as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { el.setAttribute("data-in", ""); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [el]);
  return <Tag ref={setEl as never} className={`reveal ${className}`}>{children}</Tag>;
}
