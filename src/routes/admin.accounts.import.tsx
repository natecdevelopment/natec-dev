import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/components/admin/AccountAdmin";
import { Card, PageTitle, btnSm } from "@/components/admin/ui";
import { PAYMENT_METHODS } from "@/lib/account";
import { taka } from "@/lib/money";
import { readXlsx } from "@/lib/xlsx-lite";
import { buildClientPlan, parseNatecWorkbook, sizeRange, type ParsedWorkbook } from "@/lib/sheet-import";

export const Route = createFileRoute("/admin/accounts/import")({ component: ImportClients });

const today = () => new Date().toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").replace(/h/g, "");

type Result = { flat: string; ok: boolean; message: string };

function ImportClients() {
  const qc = useQueryClient();
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [projectId, setProjectId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [undatedOn, setUndatedOn] = useState(today());
  const [method, setMethod] = useState<string>("Other");
  const [updateFacts, setUpdateFacts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const projects = useQuery({ queryKey: ["admin", "project-names"], queryFn: async () => (await supabase.from("projects").select("id, name, kind").order("sort_order")).data ?? [] });
  const existing = useQuery({
    queryKey: ["admin", "client-flats", projectId], enabled: !!projectId,
    queryFn: async () => new Set(((await supabase.from("clients").select("flat_no").eq("project_id", projectId)).data ?? []).map((r) => r.flat_no.toUpperCase())),
  });

  async function onFile(f: File | undefined) {
    if (!f) return;
    setResults([]); setParsed(null); setFileName(f.name);
    try {
      const p = parseNatecWorkbook(await readXlsx(f));
      if (!p.clients.length) throw new Error("No clients found in this file. Use the Natec client payment sheet format.");
      setParsed(p);
      setSelected(new Set(p.clients.map((c) => c.flat_no)));
      const match = (projects.data ?? []).find((x) => p.projectName && norm(x.name).includes(norm(p.projectName).replace(/^sobuj|^sbuj/, "")));
      setProjectId(match?.id ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read this file.");
    }
  }

  const rows = useMemo(() => (parsed?.clients ?? []).map((c) => {
    const plan = buildClientPlan(c, parsed!.schedule, undatedOn, method);
    const paid = plan.pays.reduce((s, p) => s + p.amount, 0);
    return { c, plan, paid, due: c.total_price - paid, exists: existing.data?.has(c.flat_no) ?? false };
  }), [parsed, undatedOn, method, existing.data]);

  const toImport = rows.filter((r) => selected.has(r.c.flat_no) && !r.exists);

  async function runImport() {
    if (!parsed || !projectId) return;
    setBusy(true); setProgress(0);
    const out: Result[] = [];
    const project = projects.data?.find((p) => p.id === projectId);
    try {
      if (updateFacts && parsed.units.length) {
        const r1 = await supabase.from("projects").update({ units_per_floor: parsed.units.length, flat_sizes: sizeRange(parsed.units) }).eq("id", projectId);
        if (r1.error) throw r1.error;
        const { data: have } = await supabase.from("project_units").select("id, label").eq("project_id", projectId);
        for (const [i, u] of parsed.units.entries()) {
          const label = `Unit ${u.letter}`;
          const found = (have ?? []).find((h) => h.label.trim().toUpperCase() === label.toUpperCase() || h.label.trim().toUpperCase() === u.letter);
          const r = found
            ? await supabase.from("project_units").update({ size_sqft: u.size_sft }).eq("id", found.id)
            : await supabase.from("project_units").insert({ project_id: projectId, label, size_sqft: u.size_sft, sort_order: i });
          if (r.error) throw r.error;
        }
      }
      for (const [n, r] of toImport.entries()) {
        const c = r.c;
        try {
          const note = [
            `${parsed.schedule.length} instalments per the ${parsed.projectName || project?.name || "project"} schedule${parsed.penaltyRate != null ? ` (late penalty ${(parsed.penaltyRate * 100).toFixed(1)}%)` : ""}.`,
            `Imported from ${fileName} on ${today()}. Dates not in the sheet (booking, down payment, payment dates) use ${undatedOn}.`,
            ...c.issues,
          ].join("\n");
          const { data: client, error } = await supabase.from("clients").insert({
            full_name: c.full_name, phone: c.phone, address: c.address, project_id: projectId,
            flat_no: c.flat_no, floor: c.floor, size_sft: c.size_sft, total_price: c.total_price, payment_plan_note: note,
          }).select("id").single();
          if (error) throw error;
          const inst = r.plan.rows.map((x) => ({ ...x, client_id: client.id }));
          if (inst.length) { const e2 = await supabase.from("instalments").insert(inst); if (e2.error) throw e2.error; }
          if (r.plan.pays.length) { const e3 = await supabase.from("payments").insert(r.plan.pays.map((p) => ({ ...p, client_id: client.id }))); if (e3.error) throw e3.error; }
          out.push({ flat: c.flat_no, ok: true, message: `${c.full_name} — ${taka(c.total_price)}, paid ${taka(r.paid)}` });
        } catch (e) {
          out.push({ flat: c.flat_no, ok: false, message: e instanceof Error ? e.message : "Failed" });
        }
        setProgress(Math.round(((n + 1) / toImport.length) * 100));
      }
      await logAudit("import_clients", "", { file: fileName, project: project?.name, imported: out.filter((x) => x.ok).map((x) => x.flat), failed: out.filter((x) => !x.ok).map((x) => x.flat) });
      setResults(out);
      qc.invalidateQueries({ queryKey: ["admin"] });
      const okN = out.filter((x) => x.ok).length;
      okN === out.length ? toast.success(`${okN} clients imported`) : toast.error(`${okN} imported, ${out.length - okN} failed — see the list`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed.");
    } finally { setBusy(false); }
  }

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="max-w-6xl">
      <Link to="/admin/accounts" search={{ tab: "clients" }} className="mb-3 inline-flex items-center gap-1 text-sm text-navy"><ArrowLeft className="h-4 w-4" /> Clients</Link>
      <PageTitle title="Import clients from Excel" />

      <Card>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-navy/20 p-8 text-center hover:bg-navy/[0.03]">
          <FileSpreadsheet className="h-8 w-8 text-navy" />
          <span className="font-semibold text-navy">{fileName || "Choose the client payment sheet (.xlsx)"}</span>
          <span className="text-sm text-muted-foreground">The file is read in your browser. Client data is saved only to the database — nothing is uploaded anywhere else.</span>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          <span className={btnSm}><Upload className="h-3.5 w-3.5" /> Select file</span>
        </label>
      </Card>

      {parsed && (
        <>
          <Card className="mt-6">
            <h2 className="!text-xl text-navy">What the sheet contains</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted-foreground">Project in sheet</dt><dd className="font-semibold">{parsed.projectName || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Clients found</dt><dd className="font-semibold">{parsed.clients.length}</dd></div>
              <div><dt className="text-muted-foreground">Instalment plan</dt><dd className="font-semibold">{parsed.schedule.length} × (total {taka(parsed.schedule.reduce((s, x) => s + x.amount, 0))})</dd></div>
              <div><dt className="text-muted-foreground">Flat sizes</dt><dd className="font-semibold">{parsed.units.map((u) => `${u.letter} ${u.size_sft}`).join(" · ") || "—"}</dd></div>
            </dl>
            {parsed.warnings.length > 0 && (
              <ul className="mt-4 space-y-1 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                {parsed.warnings.map((w) => <li key={w} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{w}</li>)}
              </ul>
            )}
          </Card>

          <Card className="mt-6">
            <h2 className="!text-xl text-navy">Import settings</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-navy">Project on the website
                <select className="admin-input mt-1" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">Choose…</option>
                  {(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-navy">Date for items the sheet has no date for
                <input type="date" className="admin-input mt-1" value={undatedOn} onChange={(e) => setUndatedOn(e.target.value)} />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">Used for booking money, down payment and every payment's "paid on". Each one is noted as "date not in sheet" — edit later per client.</span>
              </label>
              <label className="text-sm font-medium text-navy">Payment method
                <select className="admin-input mt-1" value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-navy">
              <input type="checkbox" checked={updateFacts} onChange={(e) => setUpdateFacts(e.target.checked)} />
              Also update the project's flat sizes ({sizeRange(parsed.units) || "—"}), units per floor ({parsed.units.length}) and unit types A–{parsed.units.at(-1)?.letter ?? "?"}
            </label>
          </Card>

          <Card className="mt-6 overflow-x-auto">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="!text-xl text-navy">Clients ({selected.size} selected)</h2>
              <div className="flex gap-2">
                <button className={btnSm} onClick={() => setSelected(new Set(parsed.clients.map((c) => c.flat_no)))}>Select all</button>
                <button className={btnSm} onClick={() => setSelected(new Set())}>Select none</button>
              </div>
            </div>
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2"></th><th>Flat</th><th>Name</th><th>Phone</th><th className="text-right">Total</th><th className="text-right">Booking</th><th className="text-right">Down</th><th className="text-right">Paid</th><th className="text-right">Due</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {rows.map(({ c, paid, due, exists }) => (
                  <tr key={c.flat_no} className="border-b align-top last:border-0">
                    <td className="py-2 pr-2"><input type="checkbox" disabled={exists} checked={!exists && selected.has(c.flat_no)} onChange={() => toggle(c.flat_no)} aria-label={`Import ${c.flat_no}`} /></td>
                    <td className="font-semibold text-navy">{c.flat_no}<span className="block text-xs font-normal text-muted-foreground">{c.floor}{c.size_sft ? ` · ${c.size_sft} sft` : ""}</span></td>
                    <td>{c.full_name}<span className="block text-xs text-muted-foreground">{c.address}</span></td>
                    <td className="whitespace-nowrap">{c.phone || <span className="text-brand-red">missing</span>}</td>
                    <td className="num text-right">{taka(c.total_price)}</td>
                    <td className="num text-right">{taka(c.booking)}</td>
                    <td className="num text-right">{taka(c.down)}</td>
                    <td className="num text-right">{taka(paid)}</td>
                    <td className="num text-right font-semibold">{taka(due)}</td>
                    <td className="max-w-[280px] text-xs">
                      {exists && <span className="mb-1 inline-block rounded-full bg-navy/10 px-2 py-0.5 text-navy">Already in this project — skipped</span>}
                      {c.issues.map((i) => <span key={i} className="block text-amber-800">• {i}</span>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-lg">
            <p className="text-sm text-navy">{toImport.length} clients will be imported{rows.some((r) => r.exists) ? ` · ${rows.filter((r) => r.exists).length} already exist and will be skipped` : ""}.</p>
            <div className="flex items-center gap-3">
              {busy && <span className="num text-sm text-muted-foreground">{progress}%</span>}
              <button className="btn btn-primary !py-2" disabled={busy || !projectId || !toImport.length} onClick={runImport}>
                {busy ? "Importing…" : `Import ${toImport.length} clients`}
              </button>
            </div>
          </div>

          {results.length > 0 && (
            <Card className="mt-6">
              <h2 className="!text-xl text-navy">Result</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {results.map((r) => (
                  <li key={r.flat} className={`flex gap-2 ${r.ok ? "text-navy" : "text-brand-red"}`}>
                    {r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span className="font-semibold">{r.flat}</span> {r.message}
                  </li>
                ))}
              </ul>
              <Link to="/admin/accounts" search={{ tab: "clients" }} className="btn btn-primary mt-4 !py-2">Go to client accounts</Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
