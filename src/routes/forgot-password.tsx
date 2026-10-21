import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, Field, SubmitButton, type SubmitState } from "@/components/auth/AuthFields";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Forgot password — Natec Development Ltd." },
    { name: "description", content: "Reset the password for your Natec Development account." },
    { property: "og:title", content: "Forgot password — Natec Development Ltd." },
    { property: "og:description", content: "Reset the password for your Natec Development account." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: Forgot,
});

function Forgot() {
  const [state, setState] = useState<SubmitState>("idle");
  const [err, setErr] = useState(""); const [shake, setShake] = useState(0); const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr("Enter a valid email address."); setShake((s) => s + 1); return; }
    setErr(""); setState("loading");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) { setState("idle"); setErr("We couldn't send the email right now. Please try again in a minute."); return; }
    setState("success"); setTimeout(() => setSent(true), 600);
  }
  return (
    <AuthCard title="Forgot password?" intro="We'll email you a link to set a new one.">
      {sent ? <p role="status" className="text-navy">If an account exists for that email, a reset link is on its way. Check your inbox.</p> : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field label="Email" name="email" type="email" autoComplete="email" error={err} shakeKey={shake} />
          <SubmitButton state={state}>Send reset link →</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link to="/login" className="text-brand-red hover:underline">Back to login</Link></p>
    </AuthCard>
  );
}
