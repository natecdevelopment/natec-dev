import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LayoutDashboard, Inbox, Film, Building2, Sparkles, Image as ImageIcon, ExternalLink, LogOut, Menu, X, Loader2, HardHat, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signInAny } from "@/lib/login-client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Natec Development Ltd." },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Natec Development content administration." },
      { property: "og:title", content: "Admin — Natec Development Ltd." },
      { property: "og:description", content: "Natec Development content administration." },
    ],
  }),
  component: AdminGate,
});

type GateState = "loading" | "signedOut" | "notAdmin" | "ok";

function AdminGate() {
  const [state, setState] = useState<GateState>("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let alive = true;
    async function check() {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      if (!data.user) return setState((s) => (s === "notAdmin" ? s : "signedOut"));
      const { data: ok } = await supabase.rpc("is_admin");
      if (!alive) return;
      if (ok) {
        setEmail(data.user.email ?? "");
        setState("ok");
      } else {
        setState("notAdmin");
        await supabase.auth.signOut();
      }
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") check();
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "loading")
    return <div className="flex min-h-screen items-center justify-center bg-ivory"><Loader2 className="h-6 w-6 animate-spin text-navy" /></div>;
  if (state === "signedOut") return <AdminLogin />;
  if (state === "notAdmin")
    return (
      <Centered>
        <h1 className="!text-3xl text-navy">Not authorised</h1>
        <p className="mt-3 text-sm text-muted-foreground">This account doesn't have access to the admin panel. You have been signed out.</p>
        <button className="btn btn-primary mt-6 w-full" onClick={() => setState("signedOut")}>Back to sign in</button>
      </Centered>
    );
  return <AdminShell email={email} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-xl">
        <img src="/brand/natec-mark.png" alt="Natec Development" className="mx-auto mb-6 h-14 w-auto" />
        {children}
      </div>
    </div>
  );
}

function AdminLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "").trim();
    const password = String(f.get("password") || "");
    if (!email || !password) return void setError("Enter your email or username and password.");
    setBusy(true);
    setError("");
    const error = await signInAny(email, password);
    setBusy(false);
    if (error) setError(error);
  }
  return (
    <Centered>
      <p className="eyebrow text-brand-red">Admin</p>
      <h1 className="mt-2 !text-3xl text-navy">Sign in</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3 text-left">
        <label className="block text-sm font-medium text-navy">Email or username<input name="email" type="text" autoComplete="username" className="admin-input mt-1" /></label>
        <label className="block text-sm font-medium text-navy">Password<input name="password" type="password" autoComplete="current-password" className="admin-input mt-1" /></label>
        {error && <p role="alert" className="text-sm text-brand-red">{error}</p>}
        <button disabled={busy} className="btn btn-primary !mt-5 w-full disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </Centered>
  );
}

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/videos", label: "Videos", icon: Film },
  { to: "/admin/projects", label: "Projects", icon: Building2 },
  { to: "/admin/upcoming", label: "Upcoming", icon: Sparkles },
  { to: "/admin/construction", label: "Construction", icon: HardHat },
  { to: "/admin/media", label: "Media", icon: ImageIcon },
  { to: "/admin/accounts", label: "Accounts", icon: Users },
  { to: "/admin/messages", label: "Messages", icon: Inbox },
] as const;

function AdminShell({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.removeQueries({ queryKey: ["admin"] });
    await supabase.auth.signOut();
    navigate({ to: "/admin", replace: true });
  }
  const links = (
    <>
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: "exact" in n }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
          activeProps={{ className: "!bg-white/15 !text-white" }}
        >
          <n.icon className="h-4 w-4" /> {n.label}
        </Link>
      ))}
      <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 hover:bg-white/10 hover:text-white"><ExternalLink className="h-4 w-4" /> View site ↗</a>
      <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /> Sign out</button>
    </>
  );
  return (
    <div className="min-h-screen bg-ivory md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy p-4 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2 pt-2">
          <img src="/brand/natec-logo-white.png" alt="Natec Development" className="h-10 w-auto" />
        </div>
        <nav className="flex flex-1 flex-col gap-1">{links}</nav>
        <p className="truncate px-3 text-xs text-white/50">{email}</p>
      </aside>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-navy px-4 md:hidden">
        <img src="/brand/natec-logo-white.png" alt="Natec Development" className="h-8 w-auto" />
        <button aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)} className="p-2 text-white">{open ? <X /> : <Menu />}</button>
      </header>
      {open && <nav className="fixed inset-x-0 top-14 z-40 flex flex-col gap-1 bg-navy p-4 shadow-xl md:hidden">{links}</nav>}
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
