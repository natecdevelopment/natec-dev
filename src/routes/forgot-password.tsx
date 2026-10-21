import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { requestPasswordReset } from "@/lib/login.functions";
import { company } from "@/lib/site";
import { MessageCircle, Phone } from "lucide-react";
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
  const [err, setErr] = useState(""); const [shake, setShake] = useState(0); const [sent, setSent] = useState(false); const [noEmail, setNoEmail] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const identifier = String(new FormData(e.currentTarget).get("identifier") || "").trim();
    if (!identifier) { setErr("Enter your email, phone or username."); setShake((s) => s + 1); return; }
    setErr(""); setState("loading");
    const r = await requestPasswordReset({ data: { identifier, password: "" } }).catch(() => ({ status: "error" as const }));
    if (r.status === "no_email") { setState("idle"); setNoEmail(true); return; }
    if (r.status === "limited") { setState("idle"); setErr("Too many attempts. Try again in a few minutes."); return; }
    if (r.status === "error") { setState("idle"); setErr("We couldn't send the email right now. Please try again in a minute."); return; }
    setState("success"); setTimeout(() => setSent(true), 600);
  }
  return (
    <AuthCard title="Forgot password?" intro="We'll email you a link to set a new one.">
      {noEmail ? (
        <div role="status" className="text-navy">
          <p>Please contact Natec to reset your password.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a href={company.whatsappLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            <a href={company.phoneLink} className="btn btn-ghost-light"><Phone className="h-4 w-4" /> Call {company.phone}</a>
          </div>
        </div>
      ) : sent ? <p role="status" className="text-navy">If an account exists, a reset link is on its way to its email. Check your inbox.</p> : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Field label="Email, phone or username" name="identifier" placeholder="e.g. 01712345678 or yourname" autoComplete="username" error={err} shakeKey={shake} />
          <SubmitButton state={state}>Send reset link →</SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link to="/login" className="text-brand-red hover:underline">Back to login</Link></p>
    </AuthCard>
  );
}
