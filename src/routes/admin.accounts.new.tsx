import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageTitle, btnDanger, btnSm } from "@/components/admin/ui";
import { normalizeBdPhone } from "@/components/InquiryForm";
import { PAYMENT_METHODS, PAYMENT_TYPES, fmtDate } from "@/lib/account";
import { addDays, allocatePayment, taka, type ScheduleRow } from "@/lib/money";
import { PaymentPlanForm, initialPlanState, planBlocker } from "@/components/admin/PaymentPlanForm";

export const Route = createFileRoute("/admin/accounts/new")({
  validateSearch: (s: Record<string, unknown>): { profile?: string } => (typeof s["profile"] === "string" ? { profile: s["profile"] } : {}),
  component: NewClient,
});

type Pay = { paid_on: string; amount: number; type: string; method: string; reference: string };
const today = () => new Date().toISOString().slice(0, 10);
const STEPS = ["Client", "Home", "Payment plan", "Payments received", "Review"];

function NewClient() {
  const { profile } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [c, setC] = useState({ full_name: "", phone: "", email: "", address: "", profile_id: profile ?? "", project_id: "", flat_no: "", floor: "", size_sft: "", parking: false, booking_date: today(), agreement_date: "", payment_plan_note: "" });
  const [ps, setPs] = useState(() => initialPlanState(today()));
  const plan = ps.plan, rows = ps.rows;
  const touchedDownDue = ps.plan.downDue !== addDays(ps.plan.downDue ? c.booking_date : today(), 30);
  useEffect(() => {
    // keep the default down-payment due date = booking date + 30 days while the admin hasn't changed it
    if (!c.booking_date) return;
    setPs((s) => ({ ...s, plan: { ...s.plan, downDue: addDays(c.booking_date, 30) } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.booking_date]);
  void touchedDownDue;
  const [pays, setPays] = useState<Pay[]>([]);
  const set = (k: keyof typeof c, v: string | boolean) => setC((x) => ({ ...x, [k]: v }));

  const projects = useQuery({ queryKey: ["admin", "project-names"], queryFn: async () => (await supabase.from("projects").select("id, name, kind").order("sort_order")).data ?? [] });
  const linked = useQuery({ queryKey: ["admin", "profile", c.profile_id], enabled: !!c.profile_id, queryFn: async () => (await supabase.from("profiles").select("*").eq("id", c.profile_id).maybeSingle()).data });
  useEffect(() => {
    const p = linked.data;
    if (p) setC((x) => ({ ...x, full_name: x.full_name || p.full_name, phone: x.phone || p.phone, email: x.email || p.email }));
  }, [linked.data]);
  const [emailSearch, setEmailSearch] = useState("");
  const found = useQuery({
    queryKey: ["admin", "profile-search", emailSearch], enabled: emailSearch.trim().length >= 3,
    queryFn: async () => (await supabase.from("profiles").select("id, email, full_name").ilike("email", `%${emailSearch.trim()}%`).limit(6)).data ?? [],
  });

  const paid = pays.reduce((s, p) => s + Number(p.amount || 0), 0);

  function validate(): string | null {
    if (step === 0) { if (!c.full_name.trim()) return "Enter the client's name."; if (!normalizeBdPhone(c.phone)) return "Enter a valid Bangladesh mobile number."; if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) return "Email looks wrong."; }
    if (step === 1 && !c.project_id) return "Choose a project.";
    if (step === 2) { const b = planBlocker(ps, c.booking_date); if (b) return b; }
    if (step === 3 && pays.some((p) => !(p.amount > 0) || !p.paid_on)) return "Each payment needs a date and an amount.";
    return null;
  }
  const next = () => { const e = validate(); if (e) return void toast.error(e); setStep((s) => s + 1); };

  async function save() {
    setBusy(true);
    try {
      const { data: client, error } = await supabase.from("clients").insert({
        full_name: c.full_name.trim(), phone: normalizeBdPhone(c.phone)!, email: c.email.trim(), address: c.address.trim(), profile_id: c.profile_id || null,
        project_id: c.project_id, flat_no: c.flat_no.trim(), floor: c.floor.trim(), size_sft: c.size_sft ? Number(c.size_sft) : null, parking: c.parking,
        total_price: plan.total, booking_date: c.booking_date || null, agreement_date: c.agreement_date || null, payment_plan_note: c.payment_plan_note.trim(),
      }).select().single();
      if (error) throw error;
      const temp = rows.map((r, i) => ({ id: String(i), due_date: r.due_date, amount: Number(r.amount), paid_amount: 0 }));
      const { allocations } = allocatePayment(temp, paid);
      const inst = rows.map((r, i) => ({ client_id: client.id, due_date: r.due_date, amount: Number(r.amount), label: r.label, paid_amount: allocations.find((a) => a.id === String(i))?.apply ?? 0 }));
      if (inst.length) { const r = await supabase.from("instalments").insert(inst); if (r.error) throw r.error; }
      if (pays.length) { const r = await supabase.from("payments").insert(pays.map((p) => ({ ...p, client_id: client.id }))); if (r.error) throw r.error; }
      if (c.profile_id) await supabase.from("profiles").update({ account_type: "client" }).eq("id", c.profile_id);
      toast.success("Client saved");
      qc.invalidateQueries({ queryKey: ["admin"] });
      navigate({ to: "/admin/accounts/$id", params: { id: client.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the client.");
    } finally { setBusy(false); }
  }

  const input = "admin-input mt-1";
  return (
    <div className="max-w-5xl">
      <Link to="/admin/accounts" search={{ tab: "clients" }} className="mb-3 inline-flex items-center gap-1 text-sm text-navy"><ArrowLeft className="h-4 w-4" /> Clients</Link>
      <PageTitle title="Add client" />
      <ol className="mb-6 flex flex-wrap gap-2">
        {STEPS.map((s, i) => <li key={s} className={`rounded-full px-3 py-1.5 text-xs ${i === step ? "bg-navy text-white" : i < step ? "bg-navy/10 text-navy" : "bg-white text-muted-foreground"}`}>{i + 1}. {s}</li>)}
      </ol>
      <Card>
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-navy">Full name<input value={c.full_name} onChange={(e) => set("full_name", e.target.value)} className={input} /></label>
            <label className="text-sm font-medium text-navy">Phone<input value={c.phone} onChange={(e) => set("phone", e.target.value)} className={input} /></label>
            <label className="text-sm font-medium text-navy">Email<input type="email" value={c.email} onChange={(e) => set("email", e.target.value)} className={input} /></label>
            <label className="text-sm font-medium text-navy">Address<input value={c.address} onChange={(e) => set("address", e.target.value)} className={input} /></label>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-navy">Login</p>
              {c.profile_id ? (
                <p className="mt-1 flex flex-wrap items-center gap-3 text-sm">Linked to <strong className="text-navy">{linked.data?.email ?? "…"}</strong><button type="button" onClick={() => set("profile_id", "")} className={btnSm}>Unlink</button></p>
              ) : (
                <div className="mt-1">
                  <input value={emailSearch} onChange={(e) => setEmailSearch(e.target.value)} placeholder="Search an existing account by email — or leave empty for “No login yet”" className="admin-input" />
                  {found.data && found.data.length > 0 && (
                    <ul className="mt-2 space-y-1">{found.data.map((p) => <li key={p.id}><button type="button" onClick={() => { set("profile_id", p.id); setEmailSearch(""); }} className={btnSm}>{p.email} {p.full_name && `— ${p.full_name}`}</button></li>)}</ul>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">No login yet: you can send a portal invite from the client page later.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-navy md:col-span-2">Project
              <select value={c.project_id} onChange={(e) => set("project_id", e.target.value)} className={input}><option value="">Choose…</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </label>
            <label className="text-sm font-medium text-navy">Flat no.<input value={c.flat_no} onChange={(e) => set("flat_no", e.target.value)} className={input} /></label>
            <label className="text-sm font-medium text-navy">Floor<input value={c.floor} onChange={(e) => set("floor", e.target.value)} className={input} /></label>
            <label className="text-sm font-medium text-navy">Size (sft)<input type="number" min={0} value={c.size_sft} onChange={(e) => set("size_sft", e.target.value)} className={input} /></label>
            <label className="flex items-center gap-3 self-end pb-3 text-sm font-medium text-navy"><input type="checkbox" checked={c.parking} onChange={(e) => set("parking", e.target.checked)} className="h-5 w-5" /> Car parking</label>
            <label className="text-sm font-medium text-navy">Booking date<input type="date" value={c.booking_date} onChange={(e) => set("booking_date", e.target.value)} className={input} /></label>
            <label className="text-sm font-medium text-navy">Agreement date<input type="date" value={c.agreement_date} onChange={(e) => set("agreement_date", e.target.value)} className={input} /></label>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <PaymentPlanForm value={ps} onChange={setPs} bookingDate={c.booking_date} />
            <label className="block text-sm font-medium text-navy">Payment plan note<textarea value={c.payment_plan_note} onChange={(e) => set("payment_plan_note", e.target.value)} rows={2} className={input} /></label>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Add any money already received (for example the booking advance). It is applied to the oldest instalments first.</p>
            {pays.map((p, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[150px_140px_1fr_1fr_1fr_auto]">
                <input type="date" value={p.paid_on} aria-label="Date" onChange={(e) => setPays((ps) => ps.map((x, j) => (j === i ? { ...x, paid_on: e.target.value } : x)))} className="admin-input" />
                <input type="number" min={0} value={p.amount || ""} aria-label="Amount" placeholder="Amount" onChange={(e) => setPays((ps) => ps.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)))} className="admin-input" />
                <select value={p.type} aria-label="Type" onChange={(e) => setPays((ps) => ps.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} className="admin-input">{PAYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                <select value={p.method} aria-label="Method" onChange={(e) => setPays((ps) => ps.map((x, j) => (j === i ? { ...x, method: e.target.value } : x)))} className="admin-input">{PAYMENT_METHODS.map((t) => <option key={t}>{t}</option>)}</select>
                <input value={p.reference} aria-label="Reference" placeholder="Reference" onChange={(e) => setPays((ps) => ps.map((x, j) => (j === i ? { ...x, reference: e.target.value } : x)))} className="admin-input" />
                <button type="button" onClick={() => setPays((ps) => ps.filter((_, j) => j !== i))} className={btnDanger} aria-label="Remove payment"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setPays((ps) => [...ps, { paid_on: today(), amount: 0, type: "Booking money", method: "Cash", reference: "" }])} className={btnSm}><Plus className="h-4 w-4" /> Add payment</button>
            <p className="text-sm font-semibold text-navy">Received: {taka(paid)}</p>
          </div>
        )}
        {step === 4 && <Review c={c} plan={plan} rows={rows} pays={pays} projectName={projects.data?.find((p) => p.id === c.project_id)?.name ?? ""} linked={linked.data?.email} />}
        <div className="mt-6 flex justify-between gap-3 border-t border-border pt-5">
          <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className={`${btnSm} disabled:opacity-30`}>Back</button>
          {step < 4 ? <button type="button" onClick={next} className="btn btn-primary !py-2">Next</button> : <button type="button" disabled={busy} onClick={save} className="btn btn-primary !py-2 disabled:opacity-60">{busy ? "Saving…" : "Save client"}</button>}
        </div>
      </Card>
    </div>
  );
}

function Review({ c, plan, rows, pays, projectName, linked }: { c: Record<string, unknown>; plan: { total: number }; rows: ScheduleRow[]; pays: Pay[]; projectName: string; linked?: string | undefined }) {
  const paid = useMemo(() => pays.reduce((s, p) => s + p.amount, 0), [pays]);
  const items: [string, string][] = [
    ["Client", String(c["full_name"])], ["Phone", String(c["phone"])], ["Email", String(c["email"] || "—")], ["Login", linked ?? "No login yet"],
    ["Project", projectName], ["Flat / floor", `${c["flat_no"] || "—"} / ${c["floor"] || "—"}`], ["Size", c["size_sft"] ? `${c["size_sft"]} sft` : "—"], ["Parking", c["parking"] ? "Yes" : "No"],
    ["Booking date", fmtDate(String(c["booking_date"] || ""))], ["Total price", taka(plan.total)], ["Schedule rows", String(rows.length)], ["Received so far", taka(paid)], ["Amount due", taka(plan.total - paid)],
  ];
  return <dl className="grid gap-3 sm:grid-cols-2">{items.map(([k, v]) => <div key={k}><dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="font-semibold text-navy">{v}</dd></div>)}</dl>;
}
