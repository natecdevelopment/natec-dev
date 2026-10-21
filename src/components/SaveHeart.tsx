import { useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/account";

export const savedIdsKey = (uid?: string) => ["me", "saved-ids", uid];

/** Heart toggle on project cards; signed-out visitors go to /login and the project is saved after they sign in. */
export function SaveHeart({ projectId, name, className = "" }: { projectId: string; name: string; className?: string }) {
  const session = useSession();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const href = useLocation({ select: (l) => l.href });
  const { data: ids = [] } = useQuery({
    queryKey: savedIdsKey(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_projects").select("project_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.project_id);
    },
  });
  const saved = ids.includes(projectId);
  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!uid) {
      sessionStorage.setItem("natec-pending-save", projectId);
      navigate({ to: "/login", search: { redirect: href } });
      return;
    }
    const { error } = saved
      ? await supabase.from("saved_projects").delete().eq("user_id", uid).eq("project_id", projectId)
      : await supabase.from("saved_projects").insert({ user_id: uid, project_id: projectId });
    if (error) return void toast.error("Couldn't update your saved projects. Please try again.");
    toast.success(saved ? `Removed ${name} from saved` : `Saved ${name}`);
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  return (
    <button onClick={toggle} aria-pressed={saved} aria-label={saved ? `Remove ${name} from saved projects` : `Save ${name}`}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-brand-red shadow-md transition hover:scale-105 ${className}`}>
      <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
    </button>
  );
}
