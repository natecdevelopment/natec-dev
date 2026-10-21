import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bold, Check, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AVAILABILITY, STAGES, STATUSES, slugify, type MediaRow } from "@/lib/projects-data";
import { uploadImage } from "@/lib/media-upload";
import { mapEmbed } from "@/components/ProjectsGrid";
import { Card, SortableList, btnSm } from "@/components/admin/ui";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";

type Kind = "current" | "upcoming";
type Form = {
  name: string; project_no: string; kind: Kind; slug: string; status: string; availability: string;
  address: string; location_short: string; map_url: string;
  building_type: string; total_flats: string; flat_sizes: string; handover_date: string; features: string[]; description: string;
  progress_pct: number; cover_media_id: string | null; published: boolean;
};
type Stage = { stage: string; status: string; completed_on: string; note: string };
type Upload = { key: string; name: string; pct: number; error?: string };

const blank = (kind: Kind): Form => ({
  name: "", project_no: "", kind, slug: "", status: kind === "upcoming" ? "Upcoming" : "Ongoing", availability: kind === "upcoming" ? "Coming soon" : "Available",
  address: "", location_short: "", map_url: "", building_type: "", total_flats: "", flat_sizes: "", handover_date: "", features: [], description: "",
  progress_pct: 0, cover_media_id: null, published: false,
});
const blankStages = (): Stage[] => STAGES.map((s) => ({ stage: s, status: "Not started", completed_on: "", note: "" }));

const label = "block text-sm font-medium text-navy";

export function ProjectWizard({ id: initialId, kind: initialKind = "current" }: { id?: string; kind?: Kind }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [id, setId] = useState<string | null>(initialId ?? null);
  const [form, setForm] = useState<Form>(blank(initialKind));
  const [slugTouched, setSlugTouched] = useState(!!initialId);
  const [stages, setStages] = useState<Stage[]>(blankStages());
  const [images, setImages] = useState<MediaRow[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(!!initialId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!initialId) return;
    (async () => {
      const [p, s, m] = await Promise.all([
        supabase.from("projects").select("*").eq("id", initialId).maybeSingle(),
        supabase.from("project_stages").select("*").eq("project_id", initialId).order("sort_order"),
        supabase.from("media").select("*").eq("project_id", initialId).order("sort_order"),
      ]);
      if (p.error || !p.data) { toast.error("Project not found"); navigate({ to: "/admin/projects" }); return; }
      const d = p.data;
      setForm({ ...blank(d.kind as Kind), ...d, kind: d.kind as Kind, total_flats: d.total_flats?.toString() ?? "" });
      if (s.data?.length) setStages(STAGES.map((st) => { const r = s.data.find((x) => x.stage === st); return { stage: st, status: r?.status ?? "Not started", completed_on: r?.completed_on ?? "", note: r?.note ?? "" }; }));
      setImages(m.data ?? []);
      setLoading(false);
    })();
  }, [initialId, navigate]);

  const isUpcoming = form.kind === "upcoming";
  const steps = ["Basics", "Location", "Building details", ...(isUpcoming ? [] : ["Construction progress"]), "Images", "Review"];
  const current = steps[step]!;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function validate(name: string): boolean {
    const e: Record<string, string> = {};
    if (name === "Basics" || name === "all") {
      if (!form.name.trim()) e["name"] = "Name is required";
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) e["slug"] = "Use lowercase letters, numbers and dashes";
    }
    if (name === "Location" || name === "all") {
      if (!form.address.trim()) e["address"] = "Address is required";
    }
    if (name === "Building details" || name === "all") {
      if (form.total_flats && !/^\d+$/.test(form.total_flats)) e["total_flats"] = "Enter a whole number";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save(opts: { publish?: boolean; quiet?: boolean } = {}): Promise<string | null> {
    if (!validate("all")) {
      toast.error("Please fix the highlighted fields");
      const firstBad = !form.name.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug) ? 0 : !form.address.trim() ? 1 : 2;
      setStep(firstBad);
      return null;
    }
    setSaving(true);
    try {
      const row = {
        name: form.name.trim(), project_no: form.project_no.trim(), kind: form.kind, slug: form.slug, status: form.status, availability: form.availability,
        address: form.address.trim(), location_short: form.location_short.trim(), map_url: form.map_url.trim(),
        building_type: form.building_type.trim(), total_flats: form.total_flats ? Number(form.total_flats) : null, flat_sizes: form.flat_sizes.trim(),
        handover_date: form.handover_date.trim(), features: form.features, description: form.description, progress_pct: isUpcoming ? 0 : form.progress_pct,
        cover_media_id: form.cover_media_id, published: opts.publish ?? form.published,
      };
      let pid = id;
      if (pid) {
        const { error } = await supabase.from("projects").update(row).eq("id", pid);
        if (error) throw error;
      } else {
        const { data: last } = await supabase.from("projects").select("sort_order").order("sort_order", { ascending: false }).limit(1);
        const { data, error } = await supabase.from("projects").insert({ ...row, sort_order: (last?.[0]?.sort_order ?? 0) + 1 }).select("id").single();
        if (error) throw error;
        pid = data.id;
        setId(pid);
      }
      if (!isUpcoming) {
        await supabase.from("project_stages").delete().eq("project_id", pid);
        const { error } = await supabase.from("project_stages").insert(stages.map((s, i) => ({ project_id: pid!, stage: s.stage, status: s.status, completed_on: s.completed_on || null, note: s.note, sort_order: i + 1 })));
        if (error) throw error;
      }
      const res = await Promise.all(images.map((m, i) => supabase.from("media").update({ sort_order: i + 1, alt_text: m.alt_text, title: m.title }).eq("id", m.id)));
      const bad = res.find((r) => r.error);
      if (bad?.error) throw bad.error;
      set("published", row.published);
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["public-projects"] });
      if (!opts.quiet) toast.success(opts.publish ? "Project published" : "Saved as draft");
      return pid;
    } catch (e) {
      const msg = (e as { message?: string }).message ?? "Could not save";
      toast.error(/duplicate key.*slug/i.test(msg) ? "That slug is already used by another project" : msg);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function onFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return toast.error("Please choose image files");
    const pid = id ?? (await save({ quiet: true }));
    if (!pid) return;
    await Promise.all(list.map(async (f, n) => {
      const key = `${Date.now()}-${n}-${f.name}`;
      const view = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "view";
      setUploads((u) => [...u, { key, name: f.name, pct: 0 }]);
      try {
        const m = await uploadImage(f, { project_id: pid, alt_text: `${form.name}, ${form.address} — ${view}`.slice(0, 125), title: `${form.name} — ${view}`, sort_order: images.length + n + 1 }, (pct) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, pct } : x))));
        setImages((im) => [...im, m]);
        setForm((fm) => (fm.cover_media_id ? fm : { ...fm, cover_media_id: m.id }));
        setUploads((u) => u.filter((x) => x.key !== key));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: (e as Error).message } : x)));
        toast.error(`${f.name}: ${(e as Error).message}`);
      }
    }));
  }

  function next() {
    if (!validate(current)) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96 w-full rounded-2xl" /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="!text-3xl text-navy">{initialId ? `Edit ${form.name || "project"}` : isUpcoming ? "Add upcoming project" : "Add project"}</h1>
        <button disabled={saving} onClick={() => save()} className="btn btn-ghost-light !py-2.5 disabled:opacity-50">{saving ? "Saving…" : "Save as draft"}</button>
      </div>

      <ol className="mb-6 flex gap-1.5" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className="flex-1">
            <button type="button" onClick={() => (i < step || validate(current)) && setStep(i)} className="w-full text-left">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand-red" : "bg-navy/10"}`} />
              <span className={`mt-1.5 hidden text-xs sm:block ${i === step ? "font-semibold text-navy" : "text-muted-foreground"}`}>{i + 1}. {s}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mb-4 text-sm text-muted-foreground sm:hidden">Step {step + 1} of {steps.length}: <strong className="text-navy">{current}</strong></p>

      <Card className="space-y-4">
        {current === "Basics" && (
          <>
            <Field label="Project name *" error={errors["name"]}>
              <input className="admin-input" value={form.name} maxLength={120} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project number"><input className="admin-input" placeholder="Project 04" value={form.project_no} onChange={(e) => set("project_no", e.target.value)} /></Field>
              <Field label="Kind">
                <select className="admin-input" value={form.kind} onChange={(e) => { const k = e.target.value as Kind; setForm((f) => ({ ...f, kind: k, ...(k === "upcoming" ? { availability: "Coming soon", status: "Upcoming" } : {}) })); }}>
                  <option value="current">Current</option><option value="upcoming">Upcoming</option>
                </select>
              </Field>
            </div>
            <Field label="Slug (web address) *" error={errors["slug"]} hint={`/projects/${form.slug || "…"}`}>
              <input className="admin-input" value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status"><select className="admin-input" value={form.status} onChange={(e) => set("status", e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Availability"><select className="admin-input" value={form.availability} onChange={(e) => set("availability", e.target.value)}>{AVAILABILITY.map((s) => <option key={s}>{s}</option>)}</select></Field>
            </div>
          </>
        )}

        {current === "Location" && (
          <>
            <Field label="Full address *" error={errors["address"]}><input className="admin-input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Padma Gate, Rajendrapur Bazar, Sreepur, Gazipur" /></Field>
            <Field label="Short location"><input className="admin-input" value={form.location_short} onChange={(e) => set("location_short", e.target.value)} placeholder="Rajendrapur Bazar, Sreepur" /></Field>
            <Field label="Google Maps link or embed URL"><input className="admin-input" value={form.map_url} onChange={(e) => set("map_url", e.target.value)} placeholder="https://maps.google.com/…" /></Field>
            {(form.map_url || form.address) && <iframe title="Map preview" src={mapEmbed(form.map_url || form.address)} className="h-56 w-full rounded-xl border-0" loading="lazy" />}
          </>
        )}

        {current === "Building details" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Building type"><input className="admin-input" value={form.building_type} onChange={(e) => set("building_type", e.target.value)} placeholder="B+G+7 (8-storey)" /></Field>
              <Field label="Total flats" error={errors["total_flats"]}><input className="admin-input" inputMode="numeric" value={form.total_flats} onChange={(e) => set("total_flats", e.target.value)} /></Field>
              <Field label="Flat sizes"><input className="admin-input" value={form.flat_sizes} onChange={(e) => set("flat_sizes", e.target.value)} placeholder="1,250–1,450 sft" /></Field>
              <Field label="Handover date"><input className="admin-input" value={form.handover_date} onChange={(e) => set("handover_date", e.target.value)} placeholder="December 2027" /></Field>
            </div>
            <Field label="Key features"><TagInput value={form.features} onChange={(v) => set("features", v)} /></Field>
            <Field label="Description"><RichText value={form.description} onChange={(v) => set("description", v)} /></Field>
          </>
        )}

        {current === "Construction progress" && (
          <>
            <div>
              <div className="flex justify-between text-sm font-medium text-navy"><span>Overall progress</span><span className="num">{form.progress_pct}%</span></div>
              <Slider className="mt-3" min={0} max={100} step={1} value={[form.progress_pct]} onValueChange={(v) => set("progress_pct", v[0] ?? 0)} aria-label="Overall progress" />
            </div>
            <div className="space-y-3">
              {stages.map((s, i) => (
                <div key={s.stage} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[120px_1fr_1fr]">
                  <p className="font-medium text-navy sm:pt-2.5">{s.stage}</p>
                  <select aria-label={`${s.stage} status`} className="admin-input" value={s.status} onChange={(e) => setStages((st) => st.map((x, n) => (n === i ? { ...x, status: e.target.value } : x)))}>
                    {["Done", "In progress", "Not started"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <input aria-label={`${s.stage} completed date`} type="date" className="admin-input" value={s.completed_on} onChange={(e) => setStages((st) => st.map((x, n) => (n === i ? { ...x, completed_on: e.target.value } : x)))} />
                  <input aria-label={`${s.stage} note`} placeholder="Note (optional)" className="admin-input sm:col-span-3" value={s.note} onChange={(e) => setStages((st) => st.map((x, n) => (n === i ? { ...x, note: e.target.value } : x)))} />
                </div>
              ))}
            </div>
          </>
        )}

        {current === "Images" && (
          <>
            <DropZone onFiles={onFiles} />
            {uploads.map((u) => (
              <div key={u.key} className="text-sm">
                <div className="flex justify-between"><span className="truncate">{u.name}</span><span className={u.error ? "text-brand-red" : ""}>{u.error ?? `${u.pct}%`}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy/10"><div className={`h-full ${u.error ? "bg-brand-red" : "bg-navy"}`} style={{ width: `${u.pct}%` }} /></div>
              </div>
            ))}
            {images.length === 0 && !uploads.length && <p className="text-sm text-muted-foreground">No images yet — add at least one for the project card.</p>}
            <SortableList
              items={images}
              getId={(m) => m.id}
              onReorder={setImages}
              render={(m) => (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative shrink-0">
                    <img src={m.public_url} alt={m.alt_text} className="h-24 w-32 rounded-lg object-cover" />
                    {form.cover_media_id === m.id && <span className="eyebrow absolute left-1 top-1 rounded-full bg-brand-red px-2 py-0.5 !text-[9px] text-white">Cover</span>}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input aria-label="Image title" placeholder="Title" className="admin-input !py-2 !text-sm" value={m.title} onChange={(e) => setImages((im) => im.map((x) => (x.id === m.id ? { ...x, title: e.target.value } : x)))} />
                    <input aria-label="Alt text" placeholder="Alt text" maxLength={200} className="admin-input !py-2 !text-sm" value={m.alt_text} onChange={(e) => setImages((im) => im.map((x) => (x.id === m.id ? { ...x, alt_text: e.target.value } : x)))} />
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className={btnSm} onClick={() => set("cover_media_id", m.id)} disabled={form.cover_media_id === m.id}><Star className="h-3.5 w-3.5" /> {form.cover_media_id === m.id ? "Cover image" : "Make cover"}</button>
                      <span className={`text-xs ${!m.alt_text || m.alt_text.length > 125 ? "text-brand-red" : "text-muted-foreground"}`}>{m.alt_text.length}/125</span>
                    </div>
                  </div>
                </div>
              )}
            />
          </>
        )}

        {current === "Review" && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Name", form.name], ["Project number", form.project_no], ["Kind", form.kind], ["Slug", `/projects/${form.slug}`], ["Status", form.status], ["Availability", form.availability],
              ["Address", form.address], ["Short location", form.location_short], ["Building type", form.building_type], ["Total flats", form.total_flats], ["Flat sizes", form.flat_sizes], ["Handover", form.handover_date],
              ["Features", form.features.join(", ")], ...(isUpcoming ? [] : [["Progress", `${form.progress_pct}%`]]), ["Images", `${images.length} (${form.cover_media_id ? "cover chosen" : "no cover"})`],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-border pb-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium text-navy">{v || "—"}</dd></div>
            ))}
          </dl>
        )}
      </Card>

      <div className="mt-6 flex justify-between gap-3">
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="btn btn-ghost-light disabled:opacity-40">Back</button>
        {current === "Review" ? (
          <button disabled={saving} onClick={async () => { const pid = await save({ publish: true }); if (pid) navigate({ to: form.kind === "upcoming" ? "/admin/upcoming" : "/admin/projects" }); }} className="btn btn-primary disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Publish
          </button>
        ) : (
          <button type="button" onClick={next} className="btn btn-primary">Next</button>
        )}
      </div>
    </div>
  );
}

function Field({ label: l, error, hint, children }: { label: string; error?: string | undefined; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={label}>{l}<div className="mt-1">{children}</div></label>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-brand-red">{error}</p>}
    </div>
  );
}

function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => { const t = draft.trim().replace(/,$/, ""); if (t && !value.includes(t)) onChange([...value, t]); setDraft(""); };
  return (
    <div className="admin-input flex flex-wrap items-center gap-2">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-navy/10 px-2.5 py-1 text-xs text-navy">{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}><X className="h-3 w-3" /></button></span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1)); }} onBlur={add} placeholder={value.length ? "" : "Lift, generator, rooftop garden… (press Enter)"} className="min-w-[8rem] flex-1 bg-transparent outline-none" />
    </div>
  );
}

function RichText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cmd = (c: string, arg?: string) => { document.execCommand(c, false, arg); ref.current?.focus(); onChange(ref.current?.innerHTML ?? ""); };
  const tools = [
    { icon: Bold, label: "Bold", run: () => cmd("bold") },
    { icon: Italic, label: "Italic", run: () => cmd("italic") },
    { icon: List, label: "Bullet list", run: () => cmd("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", run: () => cmd("insertOrderedList") },
    { icon: Link2, label: "Link", run: () => { const u = window.prompt("Link URL (https://…)"); if (u && /^(https?:|mailto:|tel:)/i.test(u)) cmd("createLink", u); } },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-input">
      <div className="flex gap-1 border-b border-input bg-muted/40 p-1">
        {tools.map((t) => <button key={t.label} type="button" aria-label={t.label} title={t.label} onMouseDown={(e) => e.preventDefault()} onClick={t.run} className="rounded p-2 text-navy hover:bg-navy/10"><t.icon className="h-4 w-4" /></button>)}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={(e) => onChange(e.currentTarget.innerHTML)} className="min-h-[140px] bg-card p-3 text-[15px] outline-none [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" aria-label="Description" role="textbox" aria-multiline="true" />
    </div>
  );
}

export function DropZone({ onFiles, label: l = "Drag images here, or click to choose" }: { onFiles: (f: FileList) => void; label?: string }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center text-sm transition ${over ? "border-brand-red bg-brand-red/5" : "border-navy/20 hover:border-navy/40"}`}
    >
      <ImagePlus className="h-7 w-7 text-navy/60" />
      <span className="text-navy">{l}</span>
      <span className="text-xs text-muted-foreground">Converted to WebP automatically (max 2400px)</span>
      <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }} />
    </label>
  );
}
