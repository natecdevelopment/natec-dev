import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes, uploadImage } from "@/lib/media-upload";
import type { MediaRow } from "@/lib/projects-data";
import { Confirm, Empty, PageTitle, btnDanger, btnSm } from "@/components/admin/ui";
import { DropZone } from "@/components/admin/ProjectWizard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/media")({ component: MediaPage });

function MediaPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "media"],
    queryFn: async () => {
      const [m, p] = await Promise.all([supabase.from("media").select("*").order("created_at", { ascending: false }), supabase.from("projects").select("id, name, cover_media_id").order("sort_order")]);
      if (m.error) throw m.error;
      return { media: m.data, projects: p.data ?? [] };
    },
  });
  const [q, setQ] = useState("");
  const [project, setProject] = useState("all");
  const [sort, setSort] = useState<"new" | "old">("new");
  const [sel, setSel] = useState<MediaRow | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const list = useMemo(() => {
    let l = data?.media ?? [];
    if (q) { const s = q.toLowerCase(); l = l.filter((m) => [m.title, m.file_name, m.alt_text, m.caption].some((x) => x.toLowerCase().includes(s))); }
    if (project === "none") l = l.filter((m) => !m.project_id);
    else if (project !== "all") l = l.filter((m) => m.project_id === project);
    return sort === "new" ? l : [...l].reverse();
  }, [data, q, project, sort]);

  async function onFiles(files: FileList) {
    await Promise.all(Array.from(files).map(async (f) => {
      setProgress((p) => ({ ...p, [f.name]: 0 }));
      try {
        await uploadImage(f, { title: f.name.replace(/\.[^.]+$/, "") }, (pct) => setProgress((p) => ({ ...p, [f.name]: pct })));
        toast.success(`${f.name} uploaded`);
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      } finally {
        setProgress((p) => { const n = { ...p }; delete n[f.name]; return n; });
      }
    }));
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <>
      <PageTitle title="Media" />
      <DropZone onFiles={onFiles} label="Upload images — drag here or click" />
      {Object.entries(progress).map(([n, p]) => (
        <div key={n} className="mt-2 text-sm"><div className="flex justify-between"><span className="truncate">{n}</span><span>{p}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy/10"><div className="h-full bg-navy" style={{ width: `${p}%` }} /></div></div>
      ))}
      <div className="my-6 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input className="admin-input" placeholder="Search title, file name, alt text…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search media" />
        <select className="admin-input" value={project} onChange={(e) => setProject(e.target.value)} aria-label="Filter by project">
          <option value="all">All projects</option><option value="none">Not linked</option>
          {data?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="admin-input" value={sort} onChange={(e) => setSort(e.target.value as "new" | "old")} aria-label="Sort"><option value="new">Newest first</option><option value="old">Oldest first</option></select>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div>
      ) : !list.length ? (
        <Empty title={data?.media.length ? "No files match your filters" : "No media yet"}><p className="text-sm text-muted-foreground">Upload images using the box above.</p></Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((m) => (
            <button key={m.id} onClick={() => setSel(m)} className="group relative overflow-hidden rounded-xl bg-card text-left ring-1 ring-navy/5 transition hover:ring-navy/30">
              <img src={m.public_url} alt={m.alt_text} loading="lazy" className="aspect-square w-full object-cover" />
              {!m.alt_text && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-semibold text-white"><AlertTriangle className="h-3 w-3" /> No alt text</span>}
              <p className="truncate p-2 text-xs text-navy">{m.title || m.file_name}</p>
            </button>
          ))}
        </div>
      )}
      <MediaPanel media={sel} projects={data?.projects ?? []} onClose={() => setSel(null)} onChanged={() => qc.invalidateQueries({ queryKey: ["admin"] })} />
    </>
  );
}

function MediaPanel({ media, projects, onClose, onChanged }: { media: MediaRow | null; projects: { id: string; name: string; cover_media_id: string | null }[]; onClose: () => void; onChanged: () => void }) {
  const [f, setF] = useState({ title: "", alt_text: "", caption: "", project_id: "" });
  useEffect(() => { if (media) setF({ title: media.title, alt_text: media.alt_text, caption: media.caption, project_id: media.project_id ?? "" }); }, [media]);
  if (!media) return <Sheet open={false} />;
  const url = media.public_url.startsWith("/") ? `${window.location.origin}${media.public_url}` : media.public_url;
  const coverOf = projects.find((p) => p.cover_media_id === media.id);

  async function save() {
    const { error } = await supabase.from("media").update({ title: f.title.trim(), alt_text: f.alt_text.trim(), caption: f.caption.trim(), project_id: f.project_id || null }).eq("id", media!.id);
    if (error) return void toast.error(error.message);
    toast.success("Saved");
    onChanged();
    onClose();
  }
  async function remove() {
    if (media!.storage_path) await supabase.storage.from("media").remove([media!.storage_path]);
    const { error } = await supabase.from("media").delete().eq("id", media!.id);
    if (error) return void toast.error(error.message);
    toast.success("File deleted");
    onChanged();
    onClose();
  }
  const altLen = f.alt_text.length;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle>Media details</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4 text-sm">
          <img src={media.public_url} alt={media.alt_text} className="w-full rounded-xl bg-muted object-contain" />
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-muted-foreground">File name</dt><dd className="break-all text-navy">{media.file_name}</dd></div>
            <div><dt className="text-muted-foreground">Size</dt><dd className="text-navy">{formatBytes(media.size_bytes)}</dd></div>
            <div><dt className="text-muted-foreground">Dimensions</dt><dd className="text-navy">{media.width && media.height ? `${media.width} × ${media.height}` : "—"}</dd></div>
            <div><dt className="text-muted-foreground">Added</dt><dd className="text-navy">{new Date(media.created_at).toLocaleDateString()}</dd></div>
          </dl>
          <div className="flex gap-2">
            <input readOnly value={url} className="admin-input !py-2 !text-xs" aria-label="File URL" />
            <button className={btnSm} onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("URL copied"))}><Copy className="h-3.5 w-3.5" /> Copy</button>
          </div>
          <label className="block font-medium text-navy">Title<input className="admin-input mt-1" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <label className="block font-medium text-navy">Alt text
            <textarea rows={3} className="admin-input mt-1" value={f.alt_text} onChange={(e) => setF({ ...f, alt_text: e.target.value })} />
            <span className={`mt-1 block text-xs ${altLen === 0 || altLen > 125 ? "text-brand-red" : "text-muted-foreground"}`}>{altLen}/125 {altLen === 0 ? "— describe the image for screen readers and Google" : altLen > 125 ? "— try to keep it shorter" : ""}</span>
          </label>
          <label className="block font-medium text-navy">Caption<textarea rows={2} className="admin-input mt-1" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} /></label>
          <label className="block font-medium text-navy">Linked project
            <select className="admin-input mt-1" value={f.project_id} onChange={(e) => setF({ ...f, project_id: e.target.value })}>
              <option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button onClick={save} className="btn btn-primary">Save</button>
            {coverOf ? (
              <button className={btnDanger} onClick={() => toast.error(`This image is the cover of ${coverOf.name}. Choose another cover first.`)}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            ) : (
              <Confirm title="Delete this file?" description="It will be removed from the library and from any project gallery." onConfirm={remove}>
                {(ask) => <button className={btnDanger} onClick={ask}><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
              </Confirm>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
