import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type MediaRow = Database["public"]["Tables"]["media"]["Row"];
export type StageRow = Database["public"]["Tables"]["project_stages"]["Row"];
export type VideoRow = Database["public"]["Tables"]["videos"]["Row"];
export type ProjectWithMedia = ProjectRow & { cover: MediaRow | null; gallery: MediaRow[]; stages: StageRow[] };

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

export function assemble(projects: ProjectRow[], media: MediaRow[], stages: StageRow[] = []): ProjectWithMedia[] {
  return projects.map((p) => {
    const gallery = media.filter((m) => m.project_id === p.id).sort((a, b) => a.sort_order - b.sort_order);
    const cover = media.find((m) => m.id === p.cover_media_id) ?? gallery[0] ?? null;
    return { ...p, cover, gallery: cover ? [cover, ...gallery.filter((g) => g.id !== cover.id)] : gallery, stages: stages.filter((s) => s.project_id === p.id).sort((a, b) => a.sort_order - b.sort_order) };
  });
}

async function fetchPublishedProjects(): Promise<ProjectWithMedia[]> {
  const [p, m, s] = await Promise.all([
    supabase.from("projects").select("*").eq("published", true).order("sort_order"),
    supabase.from("media").select("*").not("project_id", "is", null),
    supabase.from("project_stages").select("*"),
  ]);
  if (p.error) throw p.error;
  if (m.error) throw m.error;
  return assemble(p.data ?? [], m.data ?? [], s.data ?? []);
}

export const publicProjectsQuery = queryOptions({ queryKey: ["public-projects"], queryFn: fetchPublishedProjects, staleTime: 30_000 });
