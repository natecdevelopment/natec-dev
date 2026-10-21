import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, Field, SubmitButton, type SubmitState } from "@/components/auth/AuthFields";
import { passwordScore } from "@/lib/money";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Set a new password — Natec Development Ltd." },
    { name: "description", content: "Choose a new password for your Natec Development account." },
    { property: "og:title", content: "Set a new password — Natec Development Ltd." },
    { property: "og:description", content: "Choose a new password for your Natec Development account." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [errs, setErrs] = useState<Record<string, string>>({}); const [shake, setShake] = useState(0);
  const [pw, setPw] = useState("");
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((ev, s) => { if (ev === "PASSWORD_RECOVERY" || s) setReady(true); });
    supabase.auth.getSession().then(({ data: d }) => setReady(d.session ? true : /type=(recovery|invite)/.test(window.location.hash) ? null : false));
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = String(f.get("password") || ""), c = String(f.get("confirm") || "");
    const er: Record<string, string> = {};
    if (p.length < 8) er["password"] = "Use at least 8 characters.";
    if (c !== p) er["confirm"] = "Passwords don't match.";
    setErrs(er); setShake((s) => s + 1);
    if (Object.keys(er).length) return;
    setState("loading");
    const { error } = await supabase.auth.updateUser({ password: p });
    if (error) { setState("idle"); setErrs({ password: error.message }); return; }
    setState("success"); setTimeout(() => navigate({ to: "/account" }), 800);
  }
  return (
    <AuthCard title="Set a new password" intro="Choose a password you haven't used before.">
      {ready === false ? (
        <p className="text-navy">This reset link has expired or was already used. <Link to="/forgot-password" className="text-brand-red underline">Request a new one</Link>.</p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field label="New password" name="password" password autoComplete="new-password" error={errs["password"]} shakeKey={shake} onChange={setPw}>
            {pw && <p className="mt-1 text-xs text-muted-foreground">Strength: {["Too short", "Weak", "Fair", "Good", "Strong"][passwordScore(pw)]}</p>}
          </Field>
          <Field label="Confirm password" name="confirm" password autoComplete="new-password" error={errs["confirm"]} shakeKey={shake} />
          <SubmitButton state={state}>Save new password →</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
