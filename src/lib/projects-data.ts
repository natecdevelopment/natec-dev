import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type MediaRow = Database["public"]["Tables"]["media"]["Row"];
export type StageRow = Database["public"]["Tables"]["project_stages"]["Row"];
export type UnitRow = Database["public"]["Tables"]["project_units"]["Row"];
export type VideoRow = Database["public"]["Tables"]["videos"]["Row"];
export type ProjectWithMedia = ProjectRow & { cover: MediaRow | null; gallery: MediaRow[]; stages: StageRow[]; units: UnitRow[] };

export const STAGES = ["Excavation", "Foundation", "Structure", "Brickwork", "Finishing", "Handover"] as const;
export const STATUSES = ["Completed", "Ongoing", "Upcoming"] as const;
export const AVAILABILITY = ["Available", "Few left", "Sold out", "Coming soon"] as const;

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function assemble(projects: ProjectRow[], media: MediaRow[], stages: StageRow[] = [], units: UnitRow[] = []): ProjectWithMedia[] {
  return projects.map((p) => {
    const gallery = media.filter((m) => m.project_id === p.id).sort((a, b) => a.sort_order - b.sort_order);
    const cover = media.find((m) => m.id === p.cover_media_id) ?? gallery[0] ?? null;
    return { ...p, cover, gallery: cover ? [cover, ...gallery.filter((g) => g.id !== cover.id)] : gallery, stages: stages.filter((s) => s.project_id === p.id).sort((a, b) => a.sort_order - b.sort_order), units: units.filter((u) => u.project_id === p.id).sort((a, b) => a.sort_order - b.sort_order) };
  });
}

async function fetchPublishedProjects(): Promise<ProjectWithMedia[]> {
  const [p, m, s, u] = await Promise.all([
    supabase.from("projects").select("*").eq("published", true).order("sort_order"),
    supabase.from("media").select("*").not("project_id", "is", null),
    supabase.from("project_stages").select("*"),
    supabase.from("project_units").select("*"),
  ]);
  if (p.error) throw p.error;
  if (m.error) throw m.error;
  return assemble(p.data ?? [], m.data ?? [], s.data ?? [], u.data ?? []);
}

export const publicProjectsQuery = queryOptions({ queryKey: ["public-projects"], queryFn: fetchPublishedProjects, staleTime: 30_000 });

async function fetchPublishedVideos(): Promise<VideoRow[]> {
  const { data, error } = await supabase.from("videos").select("*").eq("published", true).order("sort_order").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export const publicVideosQuery = queryOptions({ queryKey: ["public-videos"], queryFn: fetchPublishedVideos, staleTime: 30_000 });

/* ---------- Key facts shown on project cards (units · storeys · flat size) ---------- */
const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Storeys: the admin "Number of floors" field, else read from building type, e.g. "B+G+7 (8-storey)" → 8. */
export function storeysOf(p: Pick<ProjectRow, "total_floors" | "building_type">): number | null {
  if (p.total_floors) return p.total_floors;
  const m = /(\d+)\s*-?\s*stor(e)?y/i.exec(p.building_type ?? "");
  return m ? Number(m[1]) : null;
}

/** Flat size: the admin "Flat sizes" text, else the min–max of the unit types, e.g. "1,276–1,353 sft". */
export function flatSizeOf(p: Pick<ProjectWithMedia, "flat_sizes" | "units">): string | null {
  if (p.flat_sizes?.trim()) return p.flat_sizes.trim();
  const sizes = (p.units ?? []).map((u) => Number(u.size_sqft)).filter((n) => n > 0);
  if (!sizes.length) return null;
  const lo = Math.round(Math.min(...sizes)), hi = Math.round(Math.max(...sizes));
  return lo === hi ? `${nf.format(lo)} sft` : `${nf.format(lo)}–${nf.format(hi)} sft`;
}

export type ProjectFact = { label: string; value: string };
export function projectFacts(p: ProjectWithMedia): ProjectFact[] {
  const facts: ProjectFact[] = [];
  if (p.total_flats) facts.push({ label: "Units", value: nf.format(p.total_flats) });
  const storeys = storeysOf(p);
  if (storeys) facts.push({ label: "Storeys", value: String(storeys) });
  const size = flatSizeOf(p);
  if (size) facts.push({ label: "Flat size", value: size });
  return facts;
}
