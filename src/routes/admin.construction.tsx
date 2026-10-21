import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Download, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Confirm, Empty, ListSkeleton, PageTitle, SortableList, btnDanger, btnSm } from "@/components/admin/ui";
import { uploadImage } from "@/lib/media-upload";
import { averagePct, CATEGORIES, ITEM_STATUSES, monthYear, STANDARD_WORK, statusFor, type Category, type ItemRow } from "@/lib/construction-data";
import type { MediaRow, ProjectRow } from "@/lib/projects-data";

export const Route = createFileRoute("/admin/construction")({ component: ConstructionAdmin });

type SaveState = "idle" | "saving" | "saved";
function useSaver() {
  const [state, setState] = useState<SaveState>("idle");
  const n = useRef(0);
  async function run<T>(fn: () => PromiseLike<{ error: { message: string } | null } & T>) {
    n.current++; setState("saving");
    const r = await fn();
    n.current--;
    if (r.error) { toast.error(r.error.message); setState("idle"); return r; }
    if (n.current === 0) setState("saved");
    return r;
  }
  return { state, run };
}

function ConstructionAdmin() {
  const [tab, setTab] = useState<"status" | "subs">("status");
  const projects = useQuery({
    queryKey: ["admin", "cs-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("sort_order");
      if (error) throw error;
      return [...(data ?? [])].sort((a, b) => Number(a.kind === "upcoming") - Number(b.kind === "upcoming") || a.sort_order - b.sort_order);
    },
  });
  const [pid, setPid] = useState("");
  useEffect(() => { if (!pid && projects.data?.[0]) setPid(projects.data[0].id); }, [projects.data, pid]);
  const project = projects.data?.find((p) => p.id === pid);

  return (
    <div>
      <PageTitle title="Construction">
        <button onClick={() => setTab("status")} className={`${btnSm} ${tab === "status" ? "!bg-navy !text-white" : ""}`}>Status</button>
        <button onClick={() => setTab("subs")} className={`${btnSm} ${tab === "subs" ? "!bg-navy !text-white" : ""}`}>Subscribers</button>
      </PageTitle>
      {tab === "subs" ? <Subscribers projects={projects.data ?? []} /> : projects.isLoading ? <ListSkeleton /> : !projects.data?.length ? <Empty title="No projects yet" /> : (
        <>
          <label className="mb-5 block max-w-md text-sm font-medium text-navy">Project
            <select value={pid} onChange={(e) => setPid(e.target.value)} className="admin-input mt-1">
              {projects.data.map((p) => <option key={p.id} value={p.id}>{p.name}{p.kind === "upcoming" ? " (upcoming)" : ""}</option>)}
            </select>
          </label>
          {project && <ProjectStatus key={project.id} project={project} />}
        </>
      )}
    </div>
  );
}

function SavedBadge({ s }: { s: SaveState }) {
  if (s === "idle") return null;
  return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">{s === "saving" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Check className="h-3.5 w-3.5 text-navy" /> Saved</>}</span>;
}

function ProjectStatus({ project }: { project: ProjectRow }) {
  const qc = useQueryClient();
  const saver = useSaver();
  const [p, setP] = useState(project);
  const itemsQ = useQuery({
    queryKey: ["admin", "cs-items", project.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("construction_items").select("*").eq("project_id", project.id).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [items, setItems] = useState<ItemRow[]>([]);
  useEffect(() => { if (itemsQ.data) setItems(itemsQ.data); }, [itemsQ.data]);

  const refreshPublic = () => { qc.invalidateQueries({ queryKey: ["public-projects"] }); qc.invalidateQueries({ queryKey: ["construction", project.id] }); };
  async function refreshProject() {
    const { data } = await supabase.from("projects").select("*").eq("id", project.id).single();
    if (data) setP(data);
    qc.invalidateQueries({ queryKey: ["admin", "cs-projects"] });
    refreshPublic();
  }
  async function saveProject(patch: Partial<ProjectRow>) {
    setP((x) => ({ ...x, ...patch }));
    await saver.run(() => supabase.from("projects").update(patch).eq("id", project.id));
    refreshProject();
  }

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function patchItem(id: string, patch: Partial<ItemRow>, delay = 0) {
    setItems((xs) => xs.map((i) => {
      if (i.id !== id) return i;
      const next = { ...i, ...patch };
      return { ...next, status: statusFor(next.progress_pct, patch.status ?? (i.status === "Not applicable" && patch.progress_pct === undefined ? i.status : patch.status)) };
    }));
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const row = { ...patch };
      if (row.progress_pct !== undefined && row.status === undefined) {
        const cur = items.find((i) => i.id === id);
        row.status = cur?.status === "Not applicable" ? "Not applicable" : statusFor(row.progress_pct);
      }
      await saver.run(() => supabase.from("construction_items").update(row).eq("id", id));
      refreshProject();
    }, delay);
  }
  async function addItem(category: Category, name = "New work item") {
    const sort = Math.max(0, ...items.map((i) => i.sort_order)) + 1;
    const r = await saver.run(() => supabase.from("construction_items").insert({ project_id: project.id, category, name, sort_order: sort }).select().single());
    if (r.data) setItems((xs) => [...xs, r.data as ItemRow]);
    refreshProject();
  }
  async function removeItem(id: string) {
    setItems((xs) => xs.filter((i) => i.id !== id));
    await saver.run(() => supabase.from("construction_items").delete().eq("id", id));
    refreshProject();
  }
  async function reorder(category: Category, next: ItemRow[]) {
    const order = CATEGORIES.flatMap((c) => (c === category ? next : items.filter((i) => i.category === c)));
    const withSort = order.map((i, idx) => ({ ...i, sort_order: idx + 1 }));
    setItems(withSort);
    await saver.run(() => supabase.from("construction_items").upsert(withSort.map(({ id, project_id, category, name, progress_pct, status, sort_order }) => ({ id, project_id, category, name, progress_pct, status, sort_order }))));
    refreshProject();
  }
  async function loadStandard() {
    let sort = Math.max(0, ...items.map((i) => i.sort_order));
    const missing = CATEGORIES.flatMap((c) => STANDARD_WORK[c].filter((n) => !items.some((i) => i.category === c && i.name.trim().toLowerCase() === n.toLowerCase())).map((name) => ({ project_id: project.id, category: c, name, sort_order: ++sort })));
    if (!missing.length) return void toast.message("All standard items are already in the list.");
    const r = await saver.run(() => supabase.from("construction_items").insert(missing).select());
    if (r.data) setItems((xs) => [...xs, ...(r.data as ItemRow[])]);
    toast.success(`Added ${missing.length} items`);
    refreshProject();
  }
  const itemsAvg = averagePct(items);

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="!text-xl text-navy">{p.name}</h2><SavedBadge s={saver.state} /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-medium text-navy">Expected completion
            <input defaultValue={p.expected_completion} placeholder="e.g. December 2027" onBlur={(e) => e.target.value !== p.expected_completion && saveProject({ expected_completion: e.target.value.trim() })} className="admin-input mt-1" />
          </label>
          <label className="block text-sm font-medium text-navy">Overall progress %
            <input key={p.progress_pct} type="number" min={0} max={100} defaultValue={p.progress_pct} onBlur={(e) => { const v = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))); if (v !== p.progress_pct) saveProject({ progress_pct: v }); }} className="admin-input mt-1" />
          </label>
          <label className="flex items-center gap-3 self-end pb-2 text-sm font-medium text-navy">
            <input type="checkbox" checked={p.status_details_published} onChange={(e) => saveProject({ status_details_published: e.target.checked })} className="h-5 w-5 accent-[var(--navy)]" />
            Publish detailed report
          </label>
          <div className="text-sm"><p className="font-medium text-navy">Last updated</p><p className="mt-2 text-muted-foreground">{p.status_updated_at ? new Date(p.status_updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => itemsAvg != null && saveProject({ progress_pct: itemsAvg })} disabled={itemsAvg == null} className={`${btnSm} disabled:opacity-40`}>Set overall % from items{itemsAvg != null ? ` (${itemsAvg}%)` : ""}</button>
          <button onClick={loadStandard} className={btnSm}>Load standard work list</button>
        </div>
      </Card>

      {itemsQ.isLoading ? <ListSkeleton /> : CATEGORIES.map((c) => {
        const rows = items.filter((i) => i.category === c);
        return (
          <Card key={c}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="!text-lg text-navy">{c} <span className="text-sm text-muted-foreground">({averagePct(rows) ?? "—"}{averagePct(rows) != null ? "%" : ""})</span></h3>
              <button onClick={() => addItem(c)} className={btnSm}><Plus className="h-4 w-4" /> Add item</button>
            </div>
            {rows.length === 0 ? <p className="text-sm text-muted-foreground">No items.</p> : (
              <SortableList items={rows} getId={(i) => i.id} onReorder={(n) => reorder(c, n)} className="space-y-2" render={(i) => (
                <div className="grid items-center gap-2 md:grid-cols-[1fr_220px_150px_auto]">
                  <input defaultValue={i.name} aria-label="Work item name" onBlur={(e) => e.target.value.trim() && e.target.value !== i.name && patchItem(i.id, { name: e.target.value.trim() })} className="admin-input" />
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={100} value={i.progress_pct} aria-label={`${i.name} progress`} disabled={i.status === "Not applicable"} onChange={(e) => patchItem(i.id, { progress_pct: Number(e.target.value) }, 600)} className="w-full accent-[var(--red)]" />
                    <input type="number" min={0} max={100} value={i.progress_pct} aria-label={`${i.name} percent`} disabled={i.status === "Not applicable"} onChange={(e) => patchItem(i.id, { progress_pct: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) }, 600)} className="admin-input !w-20" />
                  </div>
                  <select value={i.status} aria-label={`${i.name} status`} onChange={(e) => {
                    const s = e.target.value;
                    const pct = s === "Done" ? 100 : s === "Not started" ? 0 : s === "In progress" && (i.progress_pct === 0 || i.progress_pct === 100) ? 50 : i.progress_pct;
                    patchItem(i.id, { status: s, progress_pct: pct });
                  }} className="admin-input">
                    {ITEM_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <Confirm title="Delete this work item?" description={i.name} onConfirm={() => removeItem(i.id)}>
                    {(ask) => <button onClick={ask} aria-label={`Delete ${i.name}`} className={btnDanger}><Trash2 className="h-4 w-4" /></button>}
                  </Confirm>
                </div>
              )} />
            )}
          </Card>
        );
      })}

      <PhotoUpdates projectId={project.id} projectName={project.name} saver={saver} onChange={refreshProject} />
    </div>
  );
}

type UpdateFull = { id: string; month: string; title: string; note: string; sort_order: number; photos: (MediaRow & { link_id: string; link_sort: number })[] };

function PhotoUpdates({ projectId, projectName, saver, onChange }: { projectId: string; projectName: string; saver: ReturnType<typeof useSaver>; onChange: () => void }) {
  const q = useQuery({
    queryKey: ["admin", "cs-updates", projectId],
    queryFn: async (): Promise<UpdateFull[]> => {
      const u = await supabase.from("construction_updates").select("*").eq("project_id", projectId).order("month", { ascending: false });
      if (u.error) throw u.error;
      const ids = (u.data ?? []).map((x) => x.id);
      if (!ids.length) return [];
      const l = await supabase.from("construction_update_media").select("id, update_id, media_id, sort_order, media(*)").in("update_id", ids).order("sort_order");
      if (l.error) throw l.error;
      return (u.data ?? []).map((x) => ({
        ...x,
        photos: (l.data ?? []).filter((r) => r.update_id === x.id && r.media).map((r) => ({ ...(r.media as unknown as MediaRow), link_id: r.id, link_sort: r.sort_order })),
      }));
    },
  });
  const reload = () => { q.refetch(); onChange(); };
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="!text-xl text-navy">Photo updates</h2>
        <button onClick={() => setAdding(true)} className={btnSm}><Plus className="h-4 w-4" /> Add monthly update</button>
      </div>
      {adding && <UpdateForm projectId={projectId} projectName={projectName} saver={saver} onDone={() => { setAdding(false); reload(); }} onCancel={() => setAdding(false)} />}
      {q.isLoading ? <ListSkeleton rows={2} /> : !q.data?.length ? (!adding && <p className="text-sm text-muted-foreground">No photo updates yet.</p>) : (
        <ul className="space-y-4">{q.data.map((u) => <UpdateEditor key={u.id} u={u} projectId={projectId} projectName={projectName} saver={saver} reload={reload} />)}</ul>
      )}
    </Card>
  );
}

async function uploadPhotos(files: File[], updateId: string, projectId: string, projectName: string, monthLabel: string, startSort: number, onProgress: (s: string) => void) {
  for (const [i, f] of files.entries()) {
    onProgress(`Uploading ${i + 1} / ${files.length}…`);
    const m = await uploadImage(f, { project_id: null, title: `${projectName} — ${monthLabel}`, alt_text: `${projectName} construction site, ${monthLabel}` });
    const { error } = await supabase.from("construction_update_media").insert({ update_id: updateId, media_id: m.id, sort_order: startSort + i });
    if (error) throw error;
  }
  void projectId;
}

function UpdateForm({ projectId, projectName, saver, onDone, onCancel }: { projectId: string; projectName: string; saver: ReturnType<typeof useSaver>; onDone: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const month = String(f.get("month") || "");
    if (!month) return void toast.error("Pick a month");
    const files = (f.getAll("photos") as File[]).filter((x) => x.size > 0);
    setBusy("Saving…");
    const r = await saver.run(() => supabase.from("construction_updates").insert({ project_id: projectId, month: `${month}-01`, title: String(f.get("title") || "").trim(), note: String(f.get("note") || "").trim() }).select().single());
    if (!r.data) return setBusy("");
    try { await uploadPhotos(files, (r.data as { id: string }).id, projectId, projectName, monthYear(`${month}-01`), 0, setBusy); toast.success("Update added"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    setBusy(""); onDone();
  }
  return (
    <form onSubmit={submit} className="mb-6 space-y-3 rounded-xl bg-ivory p-4">
      <div className="grid gap-3 md:grid-cols-[180px_1fr]">
        <label className="text-sm font-medium text-navy">Month<input name="month" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} className="admin-input mt-1" /></label>
        <label className="text-sm font-medium text-navy">Title<input name="title" placeholder="e.g. 5th floor slab cast" className="admin-input mt-1" /></label>
      </div>
      <label className="block text-sm font-medium text-navy">Note<textarea name="note" rows={3} className="admin-input mt-1" /></label>
      <label className="block text-sm font-medium text-navy">Photos<input name="photos" type="file" accept="image/*" multiple className="mt-1 block text-sm" /></label>
      <p className="text-xs text-muted-foreground">Photos are converted to WebP automatically. You can edit each photo's alt text after saving.</p>
      <div className="flex gap-2">
        <button disabled={!!busy} className="btn btn-primary !py-2 disabled:opacity-60">{busy || "Save update"}</button>
        <button type="button" onClick={onCancel} className={btnSm}>Cancel</button>
      </div>
    </form>
  );
}

function UpdateEditor({ u, projectId, projectName, saver, reload }: { u: UpdateFull; projectId: string; projectName: string; saver: ReturnType<typeof useSaver>; reload: () => void }) {
  const [busy, setBusy] = useState("");
  const photos = useMemo(() => [...u.photos].sort((a, b) => a.link_sort - b.link_sort), [u.photos]);
  const save = async (patch: Record<string, string>) => { await saver.run(() => supabase.from("construction_updates").update(patch).eq("id", u.id)); reload(); };
  async function addFiles(files: File[]) {
    try { await uploadPhotos(files, u.id, projectId, projectName, monthYear(u.month), photos.length, setBusy); } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    setBusy(""); reload();
  }
  async function reorder(next: typeof photos) {
    await saver.run(() => Promise.all(next.map((p, i) => supabase.from("construction_update_media").update({ sort_order: i }).eq("id", p.link_id))).then((rs) => ({ error: rs.find((r) => r.error)?.error ?? null })));
    reload();
  }
  async function removePhoto(p: (typeof photos)[number]) {
    await saver.run(() => supabase.from("construction_update_media").delete().eq("id", p.link_id));
    reload();
  }
  async function removeUpdate() {
    await saver.run(() => supabase.from("construction_updates").delete().eq("id", u.id));
    reload();
  }
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
        <input type="month" aria-label="Month" defaultValue={u.month.slice(0, 7)} onBlur={(e) => e.target.value && `${e.target.value}-01` !== u.month && save({ month: `${e.target.value}-01` })} className="admin-input" />
        <input aria-label="Title" defaultValue={u.title} placeholder="Title" onBlur={(e) => e.target.value !== u.title && save({ title: e.target.value.trim() })} className="admin-input" />
        <Confirm title="Delete this monthly update?" description="Its photos are removed from the update (they stay in the media library)." onConfirm={removeUpdate}>
          {(ask) => <button onClick={ask} className={btnDanger}><Trash2 className="h-4 w-4" /> Delete</button>}
        </Confirm>
      </div>
      <textarea aria-label="Note" defaultValue={u.note} rows={2} placeholder="Note" onBlur={(e) => e.target.value !== u.note && save({ note: e.target.value.trim() })} className="admin-input mt-3" />
      {photos.length > 0 && (
        <SortableList items={photos} getId={(p) => p.link_id} onReorder={reorder} className="mt-3 space-y-2" render={(p) => (
          <div className="flex items-center gap-3">
            <img src={p.public_url} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
            <input aria-label="Alt text" defaultValue={p.alt_text} placeholder="Alt text (describe the photo)" onBlur={async (e) => { if (e.target.value !== p.alt_text) { await saver.run(() => supabase.from("media").update({ alt_text: e.target.value.trim() }).eq("id", p.id)); reload(); } }} className="admin-input min-w-0 flex-1" />
            <button onClick={() => removePhoto(p)} aria-label="Remove photo" className={btnDanger}><Trash2 className="h-4 w-4" /></button>
          </div>
        )} />
      )}
      <label className={`${btnSm} mt-3 cursor-pointer`}>
        <ImagePlus className="h-4 w-4" /> {busy || "Add photos"}
        <input type="file" accept="image/*" multiple className="sr-only" disabled={!!busy} onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; if (fs.length) addFiles(fs); }} />
      </label>
    </li>
  );
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

function Subscribers({ projects }: { projects: ProjectRow[] }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const q = useQuery({
    queryKey: ["admin", "cs-subs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("construction_subscribers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const name = (id: string | null) => projects.find((p) => p.id === id)?.name ?? "—";
  const rows = (q.data ?? []).filter((r) => !filter || r.project_id === filter);
  async function remove(id: string) {
    const { error } = await supabase.from("construction_subscribers").delete().eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "cs-subs"] });
  }
  function exportCsv() {
    const csv = [["created_at", "name", "phone", "email", "project"].join(","), ...rows.map((r) => [r.created_at, r.name, r.phone, r.email, name(r.project_id)].map(csvCell).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `natec-update-subscribers-${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-navy">Project
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="admin-input mt-1">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <button onClick={exportCsv} disabled={!rows.length} className={`${btnSm} disabled:opacity-40`}><Download className="h-4 w-4" /> Export CSV</button>
      </div>
      {q.isLoading ? <ListSkeleton /> : !rows.length ? <Empty title="No subscribers yet" /> : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}><Card className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-navy">{r.name}</p>
                <p className="text-sm text-muted-foreground"><a href={`tel:${r.phone}`}>{r.phone}</a>{r.email && <> · <a className="break-all" href={`mailto:${r.email}`}>{r.email}</a></>} · {name(r.project_id)}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <Confirm title="Delete this subscriber?" description={r.name} onConfirm={() => remove(r.id)}>
                {(ask) => <button onClick={ask} className={btnDanger}><Trash2 className="h-4 w-4" /> Delete</button>}
              </Confirm>
            </Card></li>
          ))}
        </ul>
      )}
    </div>
  );
}
