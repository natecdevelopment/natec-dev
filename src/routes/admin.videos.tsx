import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseVideoUrl, youtubeThumb, embedUrl } from "@/lib/video";
import { uploadImage } from "@/lib/media-upload";
import type { VideoRow } from "@/lib/projects-data";
import { Card, Confirm, Empty, ListSkeleton, PageTitle, SortableList, btnDanger, btnSm } from "@/components/admin/ui";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/videos")({ component: VideosPage });

const KEY = ["admin", "videos"];

function VideosPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("videos").select("*").order("sort_order").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [editing, setEditing] = useState<VideoRow | null>(null);

  async function reorder(next: VideoRow[]) {
    qc.setQueryData(KEY, next);
    const res = await Promise.all(next.map((v, i) => supabase.from("videos").update({ sort_order: i }).eq("id", v.id)));
    if (res.some((r) => r.error)) toast.error("Could not save the new order");
    else toast.success("Order saved");
    qc.invalidateQueries({ queryKey: KEY });
  }
  async function togglePublished(v: VideoRow) {
    const { error } = await supabase.from("videos").update({ published: !v.published }).eq("id", v.id);
    if (error) return void toast.error(error.message);
    toast.success(v.published ? "Video hidden" : "Video published");
    qc.invalidateQueries({ queryKey: KEY });
  }
  async function remove(v: VideoRow) {
    const { error } = await supabase.from("videos").delete().eq("id", v.id);
    if (error) return void toast.error(error.message);
    toast.success("Video deleted");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <>
      <PageTitle title="Videos" />
      <AddVideo minOrder={data?.[0]?.sort_order ?? 0} onAdded={() => qc.invalidateQueries({ queryKey: ["admin"] })} />
      <h2 className="mb-3 mt-10 !text-xl text-navy">All videos</h2>
      {isLoading ? <ListSkeleton /> : !data?.length ? (
        <Empty title="No videos yet">
          <p className="text-sm text-muted-foreground">Paste a YouTube or Facebook link above to add the first one.</p>
        </Empty>
      ) : (
        <SortableList
          items={data}
          getId={(v) => v.id}
          onReorder={reorder}
          render={(v) => (
            <div className="flex flex-wrap items-center gap-3">
              <img src={v.thumbnail_url || (v.provider === "youtube" ? youtubeThumb(v.video_id) : "/brand/natec-mark.png")} alt="" className="h-14 w-24 shrink-0 rounded-lg bg-muted object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy">{v.title || "Untitled video"}</p>
                <span className={`eyebrow mt-1 inline-block rounded-full px-2 py-0.5 !text-[10px] text-white ${v.provider === "youtube" ? "bg-brand-red" : "bg-navy"}`}>{v.provider}</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={v.published} onCheckedChange={() => togglePublished(v)} aria-label="Published" /> {v.published ? "Published" : "Hidden"}</label>
              <button className={btnSm} onClick={() => setEditing(v)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
              <Confirm title="Delete this video?" description={`"${v.title || v.url}" will be removed permanently.`} onConfirm={() => remove(v)}>
                {(ask) => <button className={btnDanger} onClick={ask}><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
              </Confirm>
            </div>
          )}
        />
      )}
      <EditVideo video={editing} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: KEY })} />
    </>
  );
}

function AddVideo({ minOrder, onAdded }: { minOrder: number; onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [thumb, setThumb] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => (url.trim() ? parseVideoUrl(url) : null), [url]);
  const invalid = url.trim().length > 0 && !parsed;

  useEffect(() => {
    if (parsed?.provider !== "youtube" || title) return;
    const ctrl = new AbortController();
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url.trim())}&format=json`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { title?: string } | null) => j?.title && setTitle((t) => t || j.title!))
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.videoId]);

  async function onThumb(f?: File) {
    if (!f) return;
    try {
      setBusy(true);
      const m = await uploadImage(f, { title: `Video thumbnail${title ? ` — ${title}` : ""}`, alt_text: title ? `${title} video thumbnail` : "Video thumbnail" });
      setThumb(m.public_url);
      toast.success("Thumbnail uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed) return void toast.error("Please paste a YouTube or Facebook video link.");
    setBusy(true);
    const { error } = await supabase.from("videos").insert({
      url: url.trim(),
      provider: parsed.provider,
      video_id: parsed.videoId,
      title: title.trim(),
      thumbnail_url: thumb ?? (parsed.provider === "youtube" ? youtubeThumb(parsed.videoId) : null),
      sort_order: minOrder - 1,
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Video added");
    setUrl(""); setTitle(""); setThumb(null);
    onAdded();
  }

  return (
    <Card>
      <h2 className="!text-xl text-navy">Add video — insert from URL</h2>
      <form onSubmit={add} className="mt-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=… or https://www.facebook.com/…/videos/…" aria-label="Video URL" className="admin-input" />
          <button disabled={busy || !parsed} className="btn btn-primary shrink-0 disabled:opacity-50">Add</button>
        </div>
        {invalid && <p role="alert" className="text-sm text-brand-red">Only YouTube and Facebook video links are supported.</p>}
        {parsed && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="aspect-video overflow-hidden rounded-xl bg-navy/5">
              <iframe title="Video preview" src={embedUrl({ provider: parsed.provider, videoId: parsed.videoId, url: url.trim() })} className="h-full w-full border-0" allowFullScreen />
            </div>
            <div className="space-y-3">
              <p className="text-sm"><span className="eyebrow !text-[11px] text-brand-red">{parsed.provider}</span> · ID <code>{parsed.videoId}</code></p>
              <label className="block text-sm font-medium text-navy">Title (optional)<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="admin-input mt-1" /></label>
              <label className={`${btnSm} cursor-pointer`}><Upload className="h-3.5 w-3.5" /> {thumb ? "Replace" : "Custom"} thumbnail<input type="file" accept="image/*" className="sr-only" onChange={(e) => onThumb(e.target.files?.[0])} /></label>
              {thumb && <img src={thumb} alt="Custom thumbnail" className="h-20 rounded-lg object-cover" />}
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}

function EditVideo({ video, onClose, onSaved }: { video: VideoRow | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => { setTitle(video?.title ?? ""); setUrl(video?.url ?? ""); }, [video]);
  async function save() {
    if (!video) return;
    const p = parseVideoUrl(url);
    if (!p) return void toast.error("Only YouTube and Facebook video links are supported.");
    const { error } = await supabase.from("videos").update({ title: title.trim(), url: url.trim(), provider: p.provider, video_id: p.videoId, ...(p.provider === "youtube" && video.thumbnail_url?.includes("ytimg") ? { thumbnail_url: youtubeThumb(p.videoId) } : {}) }).eq("id", video.id);
    if (error) return void toast.error(error.message);
    toast.success("Video updated");
    onSaved(); onClose();
  }
  return (
    <Dialog open={!!video} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit video</DialogTitle></DialogHeader>
        <label className="block text-sm font-medium text-navy">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className="admin-input mt-1" /></label>
        <label className="block text-sm font-medium text-navy">URL<input value={url} onChange={(e) => setUrl(e.target.value)} className="admin-input mt-1" /></label>
        <button onClick={save} className="btn btn-primary">Save</button>
      </DialogContent>
    </Dialog>
  );
}
