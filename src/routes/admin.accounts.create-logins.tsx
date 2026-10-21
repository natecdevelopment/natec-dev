import { downloadText } from "@/lib/download";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Copy, Download, KeyRound, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Empty, ListSkeleton, PageTitle, btnSm } from "@/components/admin/ui";
import { PASSWORD_WARNING, ShareCard, copyText } from "@/components/admin/PortalLogins";
import { createPortalLogins, linkClientToProfile, type CreateResult } from "@/lib/portal-logins.functions";
import { loginsCsv, normPhone, proposeUsernames, shareMessage, tempPassword, validUsername } from "@/lib/portal-logins";

export const Route = createFileRoute("/admin/accounts/create-logins")({ component: CreateLogins });

type Row = { selected: boolean; username: string; password: string };
type Client = { id: string; full_name: string; phone: string; flat_no: string; email: string; project_id: string | null };

function CreateLogins() {
  const qc = useQueryClient();
  const create = useServerFn(createPortalLogins);
  const link = useServerFn(linkClientToProfile);
  const q = useQuery({
    queryKey: ["admin", "create-logins"],
    queryFn: async () => {
      const [c, p, pr] = await Promise.all([
        supabase.from("clients").select("id, full_name, phone, flat_no, email, project_id").is("profile_id", null).order("flat_no"),
        supabase.from("profiles").select("username, phone"),
        supabase.from("projects").select("id, name").order("sort_order"),
      ]);
      if (c.error) throw c.error;
      return { clients: (c.data ?? []) as Client[], taken: new Set((p.data ?? []).map((x) => x.username ?? "").filter(Boolean)), phones: new Set((p.data ?? []).map((x) => x.phone).filter(Boolean)), projects: pr.data ?? [] };
    },
    staleTime: Infinity,
  });
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [proj, setProj] = useState("");
  const [shared, setShared] = useState(false); const [sharedPw, setSharedPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<CreateResult[] | null>(null);

  useEffect(() => {
    if (!q.data) return;
    const names = proposeUsernames(q.data.clients, q.data.taken, q.data.phones);
    setRows(Object.fromEntries(q.data.clients.map((c) => [c.id, { selected: true, username: names[c.id] ?? "", password: tempPassword() }])));
  }, [q.data]);

  // Warn before leaving while passwords are on screen.
  useEffect(() => {
    if (!results?.some((r) => r.status === "created")) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [results]);

  const list = useMemo(() => (q.data?.clients ?? []).filter((c) => !proj || c.project_id === proj), [q.data, proj]);
  const byId = (id: string) => q.data?.clients.find((c) => c.id === id);
  const statusOf = (id: string) => {
    const u = rows[id]?.username ?? "";
    if (!validUsername(u)) return "invalid";
    if (q.data?.taken.has(u)) return "taken";
    if (Object.entries(rows).some(([k, r]) => k !== id && r.selected && r.username === u)) return "taken";
    return "ok";
  };
  const picked = list.filter((c) => rows[c.id]?.selected);
  const blocked = picked.some((c) => statusOf(c.id) !== "ok") || (shared ? sharedPw.length < 8 : picked.some((c) => (rows[c.id]?.password ?? "").length < 8));
  const set = (id: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id]!, ...patch } }));

  async function submit() {
    setBusy(true);
    try {
      const { results } = await create({ data: { items: picked.map((c) => ({ clientId: c.id, username: rows[c.id]!.username, password: shared ? sharedPw : rows[c.id]!.password })) } });
      setResults(results);
      const n = results.filter((r) => r.status === "created").length;
      toast.success(`${n} login${n === 1 ? "" : "s"} created`);
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't create logins"); }
    setBusy(false);
  }

  async function linkExisting(clientId: string, profileId: string) {
    try {
      await link({ data: { clientId, profileId } });
      setResults((rs) => rs?.map((r) => (r.clientId === clientId ? { clientId, status: "failed", reason: "Linked to the existing account" } : r)) ?? null);
      toast.success("Linked to the existing account");
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't link"); }
  }

  if (results) {
    const ok = results.filter((r): r is Extract<CreateResult, { status: "created" }> => r.status === "created");
    const share = ok.map((r) => { const c = byId(r.clientId)!; return { flat: c.flat_no, name: c.full_name, phone: c.phone, username: r.username, password: r.password }; });
    const all = share.map((s) => shareMessage(s)).join("\n\n────────────\n\n");
    function csv() {
      downloadText(loginsCsv(share), "natec-client-logins.csv");
    }
    return (
      <div className="space-y-4">
        <PageTitle title="Logins created" />
        {ok.length > 0 && <p role="alert" className="flex items-start gap-2 rounded-xl bg-brand-red/10 p-4 font-medium text-brand-red"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />{PASSWORD_WARNING} After leaving, passwords can't be viewed again — only reset.</p>}
        {ok.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => copyText(all)} className={btnSm}><Copy className="h-3.5 w-3.5" /> Copy all as text</button>
            <button onClick={csv} className={btnSm}><Download className="h-3.5 w-3.5" /> Download CSV</button>
          </div>
        )}
        <div className="grid gap-3 lg:grid-cols-2">{share.map((s, i) => <ShareCard key={ok[i]!.clientId} {...s} />)}</div>
        {results.some((r) => r.status !== "created") && (
          <Card>
            <h2 className="!text-xl text-navy">Not created</h2>
            <ul className="mt-2 divide-y divide-border text-sm">
              {results.filter((r) => r.status !== "created").map((r) => { const c = byId(r.clientId); return (
                <li key={r.clientId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span><strong className="text-navy">{c?.full_name}</strong> {c?.flat_no && <span className="text-muted-foreground">· Flat {c.flat_no}</span>} — <span className="text-brand-red">{"reason" in r ? r.reason : ""}</span></span>
                  {r.status === "exists" && r.profileId && <button onClick={() => linkExisting(r.clientId, r.profileId!)} className={btnSm}><Link2 className="h-3.5 w-3.5" /> Link to existing account</button>}
                </li>
              ); })}
            </ul>
          </Card>
        )}
        <Link to="/admin/accounts" search={{ tab: "clients" }} onClick={(e) => { if (ok.length && !confirm("Passwords will not be shown again. Leave this page?")) e.preventDefault(); }} className="btn btn-primary !py-2">Done</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/admin/accounts" search={{ tab: "clients" }} className="inline-flex items-center gap-1 text-sm text-navy"><ArrowLeft className="h-4 w-4" /> Clients</Link>
      <PageTitle title="Create logins">
        <select value={proj} onChange={(e) => setProj(e.target.value)} aria-label="Project" className="admin-input !w-auto"><option value="">All projects</option>{q.data?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </PageTitle>
      <p className="text-sm text-muted-foreground">Clients without a website login. Each gets a username and a temporary password; they must set their own password at first sign-in.</p>
      {q.isLoading ? <ListSkeleton /> : !list.length ? <Empty title="Every client already has a login" /> : (
        <>
          <Card className="!p-0 overflow-x-auto" >
            <table className="w-full min-w-[760px] text-sm" data-lenis-prevent>
              <thead className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3"><input type="checkbox" aria-label="Select all" checked={list.every((c) => rows[c.id]?.selected)} onChange={(e) => list.forEach((c) => set(c.id, { selected: e.target.checked }))} /></th>
                  <th className="px-2 py-3">Flat</th><th className="px-2 py-3">Name</th><th className="px-2 py-3">Phone</th><th className="px-2 py-3">Proposed username</th><th className="px-2 py-3">Temporary password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((c) => { const r = rows[c.id]; if (!r) return null; const st = statusOf(c.id); return (
                  <tr key={c.id} className={r.selected ? "" : "opacity-50"}>
                    <td className="px-3 py-2"><input type="checkbox" aria-label={`Select ${c.full_name}`} checked={r.selected} onChange={(e) => set(c.id, { selected: e.target.checked })} /></td>
                    <td className="px-2 py-2 text-navy">{c.flat_no || "—"}</td>
                    <td className="px-2 py-2 font-medium text-navy">{c.full_name}</td>
                    <td className="px-2 py-2 text-muted-foreground">{c.phone ? <>{c.phone}{!normPhone(c.phone) && <span className="block text-xs text-brand-red">invalid</span>}</> : "—"}</td>
                    <td className="px-2 py-2">
                      <input value={r.username} onChange={(e) => set(c.id, { username: e.target.value.toLowerCase().replace(/\s/g, "") })} aria-label={`Username for ${c.full_name}`} className="admin-input !py-1.5 font-mono" />
                      <span className={`text-xs ${st === "ok" ? "text-navy/70" : "text-brand-red"}`} aria-live="polite">{st === "ok" ? "✓ Available" : st === "taken" ? "Taken" : "3–30: a–z, 0–9, . or _"}</span>
                    </td>
                    <td className="px-2 py-2"><input value={shared ? sharedPw : r.password} disabled={shared} onChange={(e) => set(c.id, { password: e.target.value })} aria-label={`Password for ${c.full_name}`} className="admin-input !py-1.5 font-mono disabled:opacity-50" /></td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </Card>
          <Card>
            <label className="flex items-center gap-2 text-sm font-medium text-navy"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Use one password for all</label>
            {shared && (
              <div className="mt-3 space-y-2">
                <input value={sharedPw} onChange={(e) => setSharedPw(e.target.value)} placeholder="At least 8 characters" aria-label="Password for all" className="admin-input max-w-xs font-mono" />
                <p className="flex items-start gap-2 text-sm text-brand-red"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Anyone who knows another client's phone number could open their account. Use only if every client changes it at first login.</p>
              </div>
            )}
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={submit} disabled={busy || !picked.length || blocked} className="btn btn-primary !py-2 disabled:opacity-50"><KeyRound className="h-4 w-4" /> {busy ? "Creating…" : `Create ${picked.length} login${picked.length === 1 ? "" : "s"}`}</button>
            {blocked && picked.length > 0 && <span className="text-sm text-brand-red">Fix the usernames/passwords marked in red first.</span>}
          </div>
        </>
      )}
    </div>
  );
}
