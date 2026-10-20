import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Phone, MessageCircle } from "lucide-react";
import logo from "@/assets/natec-logo.png.asset.json";
import { company } from "@/lib/site";

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/projects", label: "Projects" },
  { to: "/directors", label: "Board" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo.url} alt="Natec Development Ltd. logo" className="h-11 w-auto" />
          <span className="hidden font-display text-lg font-semibold leading-none text-primary sm:block">
            Natec<span className="block text-[10px] font-sans tracking-[0.25em] text-muted-foreground">DEVELOPMENT LTD.</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm font-medium text-foreground/70 transition hover:text-primary" activeProps={{ className: "text-primary" }} activeOptions={{ exact: true }}>
              {n.label}
            </Link>
          ))}
          <a href={company.whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </nav>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col border-t border-border bg-background px-5 py-3 md:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-2 font-medium">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          <div className="inline-block bg-background p-3"><img src={logo.url} alt="Natec logo" className="h-20 w-auto" /></div>
          <p className="mt-4 max-w-xs text-sm opacity-70">Real estate development in Sreepur, Gazipur — from land acquisition to finished homes. Established 2023.</p>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 font-display text-lg">Visit us</h4>
          <p className="opacity-70">{company.address}</p>
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="mb-3 font-display text-lg">Talk to us</h4>
          <a className="flex items-center gap-2 opacity-80 hover:opacity-100" href={company.whatsappLink}><MessageCircle className="h-4 w-4" /> {company.whatsapp} (WhatsApp)</a>
          <a className="flex items-center gap-2 opacity-80 hover:opacity-100" href={company.phoneLink}><Phone className="h-4 w-4" /> {company.phone}</a>
          <a className="block opacity-80 hover:opacity-100" href={`mailto:${company.email}`}>{company.email}</a>
          <a className="block opacity-80 hover:opacity-100" href={company.facebook} target="_blank" rel="noreferrer">facebook.com/natecltd</a>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10 py-5 text-center text-xs opacity-50">© {new Date().getFullYear()} Natec Development Ltd. All rights reserved.</div>
    </footer>
  );
}

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <section className="border-b border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-primary md:text-6xl">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{intro}</p>}
      </div>
    </section>
  );
}
