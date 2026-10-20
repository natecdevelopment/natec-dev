import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { PageHero } from "@/components/SiteChrome";
import { company, services } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Natec Development Ltd." },
      { name: "description", content: "Call, WhatsApp or visit Natec Development at Rajendrapur Bazar, Sreepur, Gazipur." },
      { property: "og:title", content: "Contact Natec Development Ltd." },
      { property: "og:description", content: "Let's discuss your land, design or construction project." },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  full_name: z.string().trim().min(1, "Please enter your name").max(120),
  phone: z.string().trim().min(5, "Please enter a valid phone number").max(30),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  service: z.string().max(100).optional(),
  message: z.string().trim().min(1, "Please write a message").max(2000),
});

const field = "w-full border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary";

function Contact() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setStatus("error");
      return;
    }
    setStatus("sending");
    const d = parsed.data;
    const { error } = await supabase.from("contact_submissions").insert({
      full_name: d.full_name,
      phone: d.phone,
      email: d.email || null,
      service: d.service || null,
      message: d.message,
    });
    if (error) {
      setError("Something went wrong. Please try again or call us.");
      setStatus("error");
      return;
    }
    form.reset();
    setStatus("done");
  }

  return (
    <>
      <PageHero eyebrow="Contact us" title="Let's discuss your project." intro="Contact Natec Development Ltd. to discuss land, building design, construction, or real estate development requirements." />
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <a href={company.whatsappLink} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-success p-5 text-ink-foreground">
            <MessageCircle className="h-8 w-8" />
            <div><div className="text-xs uppercase tracking-widest opacity-80">Chat on WhatsApp</div><div className="text-xl font-semibold">{company.whatsapp}</div></div>
          </a>
          <a href={company.phoneLink} className="flex items-center gap-4 border border-border p-5">
            <Phone className="h-6 w-6 text-accent" />
            <div><div className="text-xs uppercase tracking-widest text-muted-foreground">Call</div><div className="text-lg font-semibold">{company.phone}</div></div>
          </a>
          <a href={`mailto:${company.email}`} className="flex items-center gap-4 border border-border p-5">
            <Mail className="h-6 w-6 text-accent" />
            <div><div className="text-xs uppercase tracking-widest text-muted-foreground">Email</div><div className="font-semibold">{company.email}</div></div>
          </a>
          <div className="flex gap-4 border border-border p-5">
            <MapPin className="h-6 w-6 shrink-0 text-accent" />
            <div><div className="text-xs uppercase tracking-widest text-muted-foreground">Office</div><div className="text-sm">{company.address}</div></div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 border border-border bg-card p-8">
          <h2 className="text-2xl font-semibold text-primary">Send an inquiry</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="full_name" placeholder="Full name *" className={field} maxLength={120} />
            <input name="phone" placeholder="Phone number *" className={field} maxLength={30} />
          </div>
          <input name="email" type="email" placeholder="Email address" className={field} maxLength={200} />
          <select name="service" className={field} defaultValue="">
            <option value="">Service of interest</option>
            {services.map((s) => <option key={s.title}>{s.title}</option>)}
            <option>Buying an apartment</option>
          </select>
          <textarea name="message" placeholder="Message *" rows={5} className={field} maxLength={2000} />
          {status === "error" && <p className="text-sm text-destructive">{error}</p>}
          {status === "done" && <p className="text-sm font-semibold text-success">Thank you — your inquiry has been received.</p>}
          <button disabled={status === "sending"} className="w-full bg-accent py-3 font-semibold text-accent-foreground disabled:opacity-60">
            {status === "sending" ? "Sending…" : "Submit"}
          </button>
        </form>
      </section>
      <iframe
        title="Natec Development office location"
        src="https://www.google.com/maps?q=Rajendrapur+Bazar,+Sreepur,+Gazipur,+Bangladesh&output=embed"
        className="block h-[420px] w-full border-0"
        loading="lazy"
      />
    </>
  );
}
