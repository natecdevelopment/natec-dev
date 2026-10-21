import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, UserCheck, UserX, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Empty, ListSkeleton, PageTitle, btnSm, btnDanger } from "@/components/admin/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate } from "@/lib/account";
import { taka } from "@/lib/money";
import { normalizeBdPhone } from "@/components/InquiryForm";

type Tab = "general" | "clients";
export const Route = createFileRoute("/admin/accounts/")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => (s["tab"] === "clients" ? { tab: "clients" } : {}),
  component: AccountsPage,
});

function AccountsPage() {
  const { tab = "general" } = Route.useSearch();
  return (
    <div>
      <PageTitle title="Accounts">
        <Link to="/admin/accounts" search={{}} className={`${btnSm} ${tab === "general" ? "!bg-navy !text-white" : ""}`}>General accounts</Link>
        <Link to="/admin/accounts" search={{ tab: "clients" }} className={`${btnSm} ${tab === "clients" ? "!bg-navy !text-white" : ""}`}>Client accounts</Link>
        <Link to="/admin/accounts/new" search={{}} className="btn btn-primary !py-2"><Plus className="h-4 w-4" /> Add client</Link>
      </PageTitle>
      {tab === "general" ? <General /> : <Clients />}
    </div>
  );
}

const PAGE = 20;
type Acc = { id: string; full_name: string; phone: string; email: string; account_type: string; status: string; created_at: string; last_seen_at: string | null; email_verified: boolean };

function General() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["admin", "accounts"], queryFn: async () => { const { data, error } = await supabase.rpc("admin_accounts"); if (error) throw error; return (data ?? []) as Acc[]; } });
  const [term, setTerm] = useState(""); const [filter, setFilter] = useState("all"); const [sort, setSort] = useState<"joined" | "name" | "seen">("joined"); const [page, setPage] = useState(0);
  const [view, setView] = useState<Acc | null>(null); const [edit, setEdit] = useState<Acc | null>(null);
  const rows = useMemo(() => {
    const t = term.trim().toLowerCase();
    let r = (q.data ?? []).filter((a) => !t || [a.full_name, a.email, a.phone].some((v) => v.toLowerCase().includes(t)));
    if (filter === "suspended") r = r.filter((a) => a.status === "suspended");
    if (filter === "unverified") r = r.filter((a) => !a.email_verified);
    if (filter === "client") r = r.filter((a) => a.account_type === "client");
    if (filter === "general") r = r.filter((a) => a.account_type === "general");
    return [...r].sort((a, b) => sort === "name" ? a.full_name.localeCompare(b.full_name) : sort === "seen" ? (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? "") : b.created_at.localeCompare(a.created_at));
  }, [q.data, term, filter, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);

  async function setStatus(a: Acc, status: "active" | "suspended") {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", a.id);
    if (error) return void toast.error(error.message);
    toast.success(status === "suspended" ? "Account suspended" : "Account reactivated");
    qc.invalidateQueries({ queryKey: ["admin", "accounts"] });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={term} onChange={(e) => { setTerm(e.target.value); setPage(0); }} placeholder="Search name, email or phone" aria-label="Search accounts" className="admin-input !pl-9" /></label>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} aria-label="Filter" className="admin-input !w-auto">
          <option value="all">All</option><option value="general">General</option><option value="client">Clients</option><option value="unverified">Email not verified</option><option value="suspended">Suspended</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort" className="admin-input !w-auto">
          <option value="joined">Newest first</option><option value="name">Name A–Z</option><option value="seen">Last seen</option>
        </select>
      </div>
      {q.isLoading ? <ListSkeleton /> : q.error ? <Card><p className="text-brand-red">Could not load accounts.</p></Card> : !rows.length ? <Empty title="No accounts found" /> : (
        <Card className="!p-0 overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1.6fr_1fr_100px_110px_90px_90px_auto] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
            <span>Name</span><span>Email</span><span>Phone</span><span>Joined</span><span>Last seen</span><span>Verified</span><span>Status</span><span />
          </div>
          <ul className="divide-y divide-border">
            {shown.map((a) => (
              <li key={a.id} className="grid gap-1 px-4 py-3 text-sm lg:grid-cols-[1.4fr_1.6fr_1fr_100px_110px_90px_90px_auto] lg:items-center lg:gap-3">
                <span className="font-semibold text-navy">{a.full_name || "—"}{a.account_type === "client" && <span className="ml-2 rounded-full bg-navy px-2 py-0.5 text-[10px] text-white">Client</span>}</span>
                <span className="break-all text-muted-foreground">{a.email}</span>
                <span className="text-muted-foreground">{a.phone || "—"}</span>
                <span className="text-muted-foreground">{fmtDate(a.created_at)}</span>
                <span className="text-muted-foreground">{a.last_seen_at ? fmtDate(a.last_seen_at) : "Never"}</span>
                <span className={a.email_verified ? "text-navy" : "text-brand-red"}>{a.email_verified ? "Yes" : "No"}</span>
                <span className={a.status === "suspended" ? "font-semibold text-brand-red" : "text-navy"}>{a.status}</span>
                <span className="flex flex-wrap gap-1.5 pt-2 lg:pt-0">
                  <button onClick={() => setView(a)} className={btnSm} aria-label={`View ${a.email}`}><Eye className="h-4 w-4" /></button>
                  <button onClick={() => setEdit(a)} className={btnSm} aria-label={`Edit ${a.email}`}><Pencil className="h-4 w-4" /></button>
                  {a.status === "active" ? <button onClick={() => setStatus(a, "suspended")} className={btnDanger}><UserX className="h-4 w-4" /> Suspend</button> : <button onClick={() => setStatus(a, "active")} className={btnSm}><UserCheck className="h-4 w-4" /> Reactivate</button>}
                  {a.account_type !== "client" && <button onClick={() => navigate({ to: "/admin/accounts/new", search: { profile: a.id } })} className={btnSm}>Make client</button>}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>{rows.length} accounts</span>
            <span className="flex items-center gap-2">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className={`${btnSm} disabled:opacity-30`} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              {page + 1} / {pages}
              <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className={`${btnSm} disabled:opacity-30`} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </span>
          </div>
        </Card>
      )}
      <ViewDialog a={view} onClose={() => setView(null)} />
      <EditDialog a={edit} onClose={() => setEdit(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "accounts"] })} />
    </div>
  );
}

function ViewDialog({ a, onClose }: { a: Acc | null; onClose: () => void }) {
  const saved = useQuery({
    queryKey: ["admin", "saved", a?.id], enabled: !!a,
    queryFn: async () => (await supabase.from("saved_projects").select("created_at, projects(name)").eq("user_id", a!.id)).data ?? [],
  });
  return (
    <Dialog open={!!a} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{a?.full_name || a?.email}</DialogTitle></DialogHeader>
        {a && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Email</dt><dd className="break-all text-navy">{a.email}</dd></div>
            <div><dt className="text-muted-foreground">Phone</dt><dd className="text-navy">{a.phone || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Joined</dt><dd className="text-navy">{fmtDate(a.created_at)}</dd></div>
            <div><dt className="text-muted-foreground">Type</dt><dd className="text-navy">{a.account_type}</dd></div>
          </dl>
        )}
        <h3 className="mt-2 font-semibold text-navy">Saved projects</h3>
        {saved.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !saved.data?.length ? <p className="text-sm text-muted-foreground">None.</p> : (
          <ul className="list-disc pl-5 text-sm text-navy">{saved.data.map((s, i) => <li key={i}>{(s.projects as { name: string } | null)?.name}</li>)}</ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ a, onClose, onSaved }: { a: Acc | null; onClose: () => void; onSaved: () => void }) {
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phoneRaw = String(f.get("phone") || "").trim();
    const phone = phoneRaw ? normalizeBdPhone(phoneRaw) : "";
    if (phone === null) return void toast.error("Enter a valid Bangladesh mobile number.");
    const { error } = await supabase.from("profiles").update({ full_name: String(f.get("full_name") || "").trim(), phone }).eq("id", a!.id);
    if (error) return void toast.error(error.message);
    toast.success("Saved"); onSaved(); onClose();
  }
  return (
    <Dialog open={!!a} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit account</DialogTitle></DialogHeader>
        {a && (
          <form onSubmit={save} className="space-y-3">
            <label className="block text-sm font-medium text-navy">Full name<input name="full_name" defaultValue={a.full_name} className="admin-input mt-1" /></label>
            <label className="block text-sm font-medium text-navy">Phone<input name="phone" defaultValue={a.phone} className="admin-input mt-1" /></label>
            <button className="btn btn-primary">Save</button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Clients() {
  const q = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: async () => {
      const [c, b, p] = await Promise.all([
        supabase.from("clients").select("*").order("created_at", { ascending: false }),
        supabase.from("client_balances").select("*"),
        supabase.from("projects").select("id, name").order("sort_order"),
      ]);
      if (c.error) throw c.error;
      return { clients: c.data ?? [], balances: b.data ?? [], projects: p.data ?? [] };
    },
  });
  const [term, setTerm] = useState(""); const [proj, setProj] = useState(""); const [status, setStatus] = useState("");
  const rows = useMemo(() => {
    if (!q.data) return [];
    const t = term.trim().toLowerCase();
    return q.data.clients
      .filter((c) => (!t || [c.full_name, c.phone, c.email, c.flat_no].some((v) => v.toLowerCase().includes(t))) && (!proj || c.project_id === proj) && (!status || c.status === status))
      .map((c) => ({ c, b: q.data.balances.find((x) => x.client_id === c.id), p: q.data.projects.find((x) => x.id === c.project_id) }));
  }, [q.data, term, proj, status]);
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  const totals = [["Total sales value", sum((r) => Number(r.c.total_price))], ["Total collected", sum((r) => Number(r.b?.total_paid ?? 0))], ["Total due", sum((r) => Number(r.b?.amount_due ?? r.c.total_price))], ["Overdue", sum((r) => Number(r.b?.overdue_amount ?? 0))]] as const;

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {totals.map(([k, v]) => <Card key={k}><p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p><p className={`mt-1 font-display text-xl ${k === "Overdue" && v > 0 ? "text-brand-red" : "text-navy"}`}>{taka(v)}</p></Card>)}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search name, phone, flat" aria-label="Search clients" className="admin-input !pl-9" /></label>
        <select value={proj} onChange={(e) => setProj(e.target.value)} aria-label="Project" className="admin-input !w-auto"><option value="">All projects</option>{q.data?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="admin-input !w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
      </div>
      {q.isLoading ? <ListSkeleton /> : !rows.length ? <Empty title="No clients yet"><Link to="/admin/accounts/new" search={{}} className="btn btn-primary !py-2"><Plus className="h-4 w-4" /> Add client</Link></Empty> : (
        <Card className="!p-0 overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1fr_1.2fr_70px_1fr_1fr_1fr_110px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
            <span>Name</span><span>Phone</span><span>Project</span><span>Flat</span><span>Total</span><span>Paid</span><span>Due</span><span>Next due</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map(({ c, b, p }) => {
              const overdue = Number(b?.overdue_amount ?? 0) > 0;
              return (
                <li key={c.id}>
                  <Link to="/admin/accounts/$id" params={{ id: c.id }} className="grid gap-1 px-4 py-3 text-sm hover:bg-ivory lg:grid-cols-[1.4fr_1fr_1.2fr_70px_1fr_1fr_1fr_110px] lg:items-center lg:gap-3">
                    <span className="font-semibold text-navy">{c.full_name}{overdue && <span className="ml-2 rounded-full bg-brand-red px-2 py-0.5 text-[10px] text-white">Overdue</span>}{c.status !== "active" && <span className="ml-2 text-xs text-muted-foreground">({c.status})</span>}</span>
                    <span className="text-muted-foreground">{c.phone}</span>
                    <span className="text-muted-foreground">{p?.name ?? "—"}</span>
                    <span className="text-muted-foreground">{c.flat_no || "—"}</span>
                    <span className="text-navy">{taka(c.total_price)}</span>
                    <span className="text-navy">{taka(b?.total_paid ?? 0)}</span>
                    <span className="text-navy">{taka(b?.amount_due ?? c.total_price)}</span>
                    <span className={overdue ? "font-semibold text-brand-red" : "text-muted-foreground"}>{fmtDate(b?.next_due_date)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
