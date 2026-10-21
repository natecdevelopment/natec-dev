import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { assemble, type ProjectWithMedia } from "@/lib/projects-data";
import { Confirm, Empty, ListSkeleton, PageTitle, SortableList, btnDanger, btnSm } from "@/components/admin/ui";
import { Switch } from "@/components/ui/switch";

export function useAdminProjects(kind: "current" | "upcoming") {
  return useQuery({
    queryKey: ["admin", "projects", kind],
    queryFn: async () => {
      const [p, m] = await Promise.all([supabase.from("projects").select("*").eq("kind", kind).order("sort_order"), supabase.from("media").select("*").not("project_id", "is", null)]);
      if (p.error) throw p.error;
      return assemble(p.data, m.data ?? []);
    },
  });
}

export function ProjectList({ kind }: { kind: "current" | "upcoming" }) {
  const qc = useQueryClient();
  const key = ["admin", "projects", kind];
  const { data, isLoading } = useAdminProjects(kind);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["public-projects"] }); };

  async function reorder(next: ProjectWithMedia[]) {
    qc.setQueryData(key, next);
    const base = kind === "current" ? 0 : 1000;
    const res = await Promise.all(next.map((p, i) => supabase.from("projects").update({ sort_order: base + i }).eq("id", p.id)));
    if (res.some((r) => r.error)) toast.error("Could not save the new order");
    else toast.success("Order saved");
    refresh();
  }
  async function toggle(p: ProjectWithMedia) {
    const { error } = await supabase.from("projects").update({ published: !p.published }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(p.published ? "Project hidden from the site" : "Project published");
    refresh();
  }
  async function remove(p: ProjectWithMedia) {
    await supabase.from("project_stages").delete().eq("project_id", p.id);
    await supabase.from("media").update({ project_id: null }).eq("project_id", p.id);
    const { error } = await supabase.from("projects").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Project deleted");
    refresh();
  }

  const label = kind === "current" ? "Projects" : "Upcoming projects";
  return (
    <>
      <PageTitle title={label}>
        <Link to="/admin/projects/new" search={{ kind }} className="btn btn-primary"><Plus className="h-4 w-4" /> Add {kind === "current" ? "project" : "upcoming project"}</Link>
      </PageTitle>
      {isLoading ? <ListSkeleton /> : !data?.length ? (
        <Empty title={`No ${label.toLowerCase()} yet`}>
          <Link to="/admin/projects/new" search={{ kind }} className="btn btn-primary">Add the first one</Link>
        </Empty>
      ) : (
        <SortableList
          items={data}
          getId={(p) => p.id}
          onReorder={reorder}
          render={(p) => (
            <div className="flex flex-wrap items-center gap-3">
              {p.cover ? <img src={p.cover.public_url} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" /> : <div className="h-16 w-20 shrink-0 rounded-lg bg-muted" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">{[p.project_no, p.status, p.availability, kind === "current" ? `${p.progress_pct}%` : null].filter(Boolean).join(" · ")}</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={p.published} onCheckedChange={() => toggle(p)} aria-label="Published" /> {p.published ? "Published" : "Draft"}</label>
              <Link to="/admin/projects/$id" params={{ id: p.id }} className={btnSm}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
              <Confirm title={`Delete ${p.name}?`} description="This deletes the project and its construction stages. Its images stay in the Media library, unlinked." onConfirm={() => remove(p)}>
                {(ask) => <button className={btnDanger} onClick={ask}><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
              </Confirm>
            </div>
          )}
        />
      )}
    </>
  );
}
