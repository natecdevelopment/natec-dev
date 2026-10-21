import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Natec Development Ltd." },
      { name: "description", content: "Sign in or create your Natec Development account." },
      { property: "og:title", content: "Sign in — Natec Development Ltd." },
      { property: "og:description", content: "Sign in or create your Natec Development account." },
    ],
  }),
  component: AuthPage,
});

const field = "w-full rounded-xl border border-input bg-white px-4 py-3 text-[15px] text-foreground outline-none focus:border-navy focus:ring-2 focus:ring-navy/15";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/account", replace: true }); });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "").trim();
    const password = String(f.get("password") || "");
    if (!email || password.length < 6) return setMsg("Enter your email and a password of at least 6 characters.");
    setBusy(true); setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg(error.message);
      navigate({ to: "/account" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) return setMsg(error.message);
      if (data.session) navigate({ to: "/account" });
      else setMsg("Check your email to confirm your account, then sign in.");
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r && "error" in r && r.error) setMsg(String((r.error as Error).message ?? r.error));
  }

  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-ivory px-4 py-16">
      <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-3xl text-navy">{mode === "in" ? "Sign in" : "Create account"}</h1>
        <button type="button" onClick={google} className="btn w-full border border-navy/20 text-navy">Continue with Google</button>
        <div className="text-center text-xs text-muted-foreground">or</div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input name="email" type="email" placeholder="Email" aria-label="Email" className={field} autoComplete="email" />
          <input name="password" type="password" placeholder="Password" aria-label="Password" className={field} autoComplete={mode === "in" ? "current-password" : "new-password"} />
          {msg && <p className="text-sm text-navy">{msg}</p>}
          <button disabled={busy} className="btn btn-primary w-full disabled:opacity-60">{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</button>
        </form>
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }} className="w-full text-sm text-navy underline">
          {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </section>
  );
}
