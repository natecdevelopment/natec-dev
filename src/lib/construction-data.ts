import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { MediaRow, ProjectRow } from "@/lib/projects-data";

export type ItemRow = Database["public"]["Tables"]["construction_items"]["Row"];
export type UpdateRow = Database["public"]["Tables"]["construction_updates"]["Row"];
export type UpdateWithPhotos = UpdateRow & { photos: MediaRow[] };

export const CATEGORIES = ["Structure", "Masonry & plaster", "Electrical, plumbing & services", "Finishing", "Common facilities"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_SHORT: Record<Category, string> = {
  Structure: "Structure",
  "Masonry & plaster": "Masonry & plaster",
  "Electrical, plumbing & services": "Services",
  Finishing: "Finishing",
  "Common facilities": "Common facilities",
};
export const ITEM_STATUSES = ["Done", "In progress", "Not started", "Not applicable"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const STANDARD_WORK: Record<Category, string[]> = {
  Structure: ["Soil test & site preparation", "Piling / foundation", "Basement & ground floor structure", "Super structure (columns, beams, slabs)", "Roof casting"],
  "Masonry & plaster": ["Brickwork", "Inside plaster", "Outside plaster"],
  "Electrical, plumbing & services": ["Electrical conduit", "Electrical wiring", "Switch & socket fitting", "Sanitary & plumbing lines", "Water reservoir & pump", "Gas line", "Fire safety system", "Lift installation", "Generator & substation"],
  Finishing: ["Door frames", "Door shutters", "Aluminium windows & glass", "Grill & railing", "Floor tiles", "Bathroom & kitchen wall tiles", "Kitchen platform", "Sanitary fittings (commode, basin, C.P.)", "Inside paint", "Outside paint", "Roof top finishing"],
  "Common facilities": ["Boundary wall & main gate", "Ground floor & car parking", "Lobby & reception", "Roof top garden", "Landscaping"],
};

/** Status follows the % unless the item is marked Not applicable (mirrors the database trigger). */
export function statusFor(pct: number, current?: string): ItemStatus {
  if (current === "Not applicable") return "Not applicable";
  return pct >= 100 ? "Done" : pct > 0 ? "In progress" : "Not started";
}

/** Average % of applicable items; null when there are none. */
export function averagePct(items: Pick<ItemRow, "progress_pct" | "status">[]): number | null {
  const a = items.filter((i) => i.status !== "Not applicable");
  if (!a.length) return null;
  return Math.round(a.reduce((s, i) => s + i.progress_pct, 0) / a.length);
}

/** A project appears in Construction Status if it is a current project, or an upcoming one with a published report or progress above 0. */
export function isListed(p: Pick<ProjectRow, "kind" | "status_details_published" | "progress_pct">) {
  return p.kind !== "upcoming" || p.status_details_published || p.progress_pct > 0;
}

export function monthYear(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

async function fetchConstruction(projectId: string) {
  const [items, updates] = await Promise.all([
    supabase.from("construction_items").select("*").eq("project_id", projectId).order("sort_order"),
    supabase.from("construction_updates").select("*").eq("project_id", projectId).order("month", { ascending: false }).order("sort_order"),
  ]);
  if (items.error) throw items.error;
  if (updates.error) throw updates.error;
  const ids = (updates.data ?? []).map((u) => u.id);
  let links: { update_id: string; media_id: string; sort_order: number }[] = [];
  let media: MediaRow[] = [];
  if (ids.length) {
    const l = await supabase.from("construction_update_media").select("update_id, media_id, sort_order").in("update_id", ids).order("sort_order");
    if (l.error) throw l.error;
    links = l.data ?? [];
    if (links.length) {
      const m = await supabase.from("media").select("*").in("id", links.map((x) => x.media_id));
      if (m.error) throw m.error;
      media = m.data ?? [];
    }
  }
  const withPhotos: UpdateWithPhotos[] = (updates.data ?? []).map((u) => ({
    ...u,
    photos: links.filter((l) => l.update_id === u.id).map((l) => media.find((m) => m.id === l.media_id)).filter((m): m is MediaRow => !!m),
  }));
  return { items: items.data ?? [], updates: withPhotos };
}

export const constructionQuery = (projectId: string) =>
  queryOptions({ queryKey: ["construction", projectId], queryFn: () => fetchConstruction(projectId), staleTime: 30_000 });
