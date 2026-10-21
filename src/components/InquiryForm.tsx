import { useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { publicProjectsQuery } from "@/lib/projects-data";
import { company } from "@/lib/site";

/** Bangladesh mobile: 01XXXXXXXXX, optionally prefixed by +880 / 880 (spaces and dashes allowed). */
export function normalizeBdPhone(raw: string): string | null {
  const d = raw.replace(/[\s-]/g, "");
  const m = d.match(/^(?:\+?880|0)?(1[3-9]\d{8})$/);
  return m ? `0${m[1]}` : null;
}

const schema = z.object({
  full_name: z.string().trim().min(1, "Please enter your name").max(120),
  phone: z.string().trim().max(30).refine((v) => normalizeBdPhone(v) !== null, "Enter a Bangladesh mobile number, e.g. 01712-345678"),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  service: z.string().max(120).optional(),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Please write a message").max(2000),
  website: z.string().max(0).optional().or(z.literal("")),
});

const field = "w-full rounded-xl border border-input bg-white px-4 py-3 text-[15px] text-foreground outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/15";
const EXTRA = ["Upcoming projects", "Land partnership", "Other"];

export function InquiryForm({ title = "Send an inquiry", defaultProject = "" }: { title?: string; defaultProject?: string }) {
  const { data: projects = [] } = useQuery(publicProjectsQuery);
  const names = projects.filter((p) => p.kind === "current").map((p) => p.name);
  if (defaultProject && !names.includes(defaultProject) && !EXTRA.includes(defaultProject)) names.unshift(defaultProject);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [sentName, setSentName] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      setStatus("error");
      return;
    }
    const d = parsed.data;
    setStatus("sending");
    if (d.website) { setStatus("done"); return; } // honeypot: silently drop bots
    const { error } = await supabase.from("contact_submissions").insert({
      full_name: d.full_name,
      phone: normalizeBdPhone(d.phone)!,
      email: d.email || null,
      service: d.service || null,
      visit_date: d.visit_date || null,
      message: d.message,
    });
    if (error) {
      setError("Something went wrong. Please try again or call us.");
      setStatus("error");
      return;
    }
    setSentName(d.full_name);
    form.reset();
    setStatus("done");
  }

  if (status === "done") {
    const wa = `${company.whatsappLink}?text=${encodeURIComponent(`Hi Natec, this is ${sentName || "me"} — I just sent an inquiry on your website.`)}`;
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-2xl md:p-12" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-navy" aria-hidden />
        <h3 className="mt-4 text-3xl text-navy">Thank you{sentName ? `, ${sentName}` : ""}</h3>
        <p className="mx-auto mt-3 max-w-[40ch] text-muted-foreground">Your inquiry has been received. Our team will call you back.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a href={wa} target="_blank" rel="noreferrer" className="btn btn-primary">Follow up on WhatsApp</a>
          <button onClick={() => setStatus("idle")} className="btn border border-navy text-navy">Send another</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl md:p-9">
      <h3 className="text-3xl text-navy">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="full_name" aria-label="Full name" placeholder="Full name *" autoComplete="name" className={field} maxLength={120} required />
        <input name="phone" type="tel" inputMode="tel" aria-label="Phone number" placeholder="Phone * (01XXX-XXXXXX)" autoComplete="tel" className={field} maxLength={30} required />
      </div>
      <input name="email" type="email" aria-label="Email" placeholder="Email address (optional)" autoComplete="email" className={field} maxLength={200} />
      <div className="grid gap-4 sm:grid-cols-2">
        <select name="service" aria-label="Interested in" className={field} defaultValue={defaultProject}>
          <option value="">Interested in…</option>
          {names.length > 0 && <optgroup label="Projects">{names.map((p) => <option key={p}>{p}</option>)}</optgroup>}
          <optgroup label="Other">{EXTRA.map((p) => <option key={p}>{p}</option>)}</optgroup>
        </select>
        <label className="block">
          <span className="sr-only">Preferred visit date (optional)</span>
          <input name="visit_date" type="date" min={today} aria-label="Preferred visit date (optional)" title="Preferred visit date (optional)" className={field} />
        </label>
      </div>
      <textarea name="message" aria-label="Message" placeholder="Message *" rows={4} className={field} maxLength={2000} required />
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {status === "error" && <p role="alert" className="text-sm text-brand-red">{error}</p>}
      <button disabled={status === "sending"} className="btn btn-primary w-full disabled:opacity-60">
        {status === "sending" ? "Sending…" : "Send inquiry"}
      </button>
      <p className="text-xs text-muted-foreground">Visit date is optional — leave blank if you're not sure yet.</p>
    </form>
  );
}
