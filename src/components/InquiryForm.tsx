import { useState } from "react";
import { z } from "zod";
import { services } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  full_name: z.string().trim().min(1, "Please enter your name").max(120),
  phone: z.string().trim().min(5, "Please enter a valid phone number").max(30),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  service: z.string().max(100).optional(),
  message: z.string().trim().min(1, "Please write a message").max(2000),
});

const projects = ["Shobuj Angon", "Shobuj Aloy", "Shobuj Digonto", "Upcoming 2027 projects"];
const field = "w-full rounded-xl border border-input bg-white px-4 py-3 text-[15px] text-foreground outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/15";

export function InquiryForm({ title = "Send an inquiry" }: { title?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
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
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl md:p-9">
      <h3 className="text-3xl text-navy">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="full_name" aria-label="Full name" placeholder="Full name *" className={field} maxLength={120} />
        <input name="phone" aria-label="Phone number" placeholder="Phone number *" className={field} maxLength={30} />
      </div>
      <input name="email" type="email" aria-label="Email" placeholder="Email address" className={field} maxLength={200} />
      <select name="service" aria-label="Project or service" className={field} defaultValue="">
        <option value="">Project of interest</option>
        <optgroup label="Projects">{projects.map((p) => <option key={p}>{p}</option>)}</optgroup>
        <optgroup label="Services">{services.map((s) => <option key={s.title}>{s.title}</option>)}</optgroup>
      </select>
      <textarea name="message" aria-label="Message" placeholder="Message *" rows={4} className={field} maxLength={2000} />
      {status === "error" && <p className="text-sm text-brand-red">{error}</p>}
      {status === "done" && <p className="text-sm font-semibold text-navy">Thank you — your inquiry has been received.</p>}
      <button disabled={status === "sending"} className="btn btn-primary w-full disabled:opacity-60">
        {status === "sending" ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
