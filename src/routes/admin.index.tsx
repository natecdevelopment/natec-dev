import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Film, Building2, Sparkles, Image as ImageIcon, Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageTitle } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

async function count(table: "videos" | "projects" | "media", kind?: string) {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  if (kind) q = q.eq("kind", kind);
  const { count: c, error } = await q;
  if (error) throw error;
  return c ?? 0;
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: async () => {
      const [videos, current, upcoming, media] = await Promise.all([count("videos"), count("projects", "current"), count("projects", "upcoming"), count("media")]);
      return { videos, current, upcoming, media };
    },
  });
  const tiles = [
    { label: "Videos", n: data?.videos, icon: Film, to: "/admin/videos" },
    { label: "Current projects", n: data?.current, icon: Building2, to: "/admin/projects" },
    { label: "Upcoming projects", n: data?.upcoming, icon: Sparkles, to: "/admin/upcoming" },
    { label: "Media files", n: data?.media, icon: ImageIcon, to: "/admin/media" },
  ] as const;
  return (
    <>
      <PageTitle title="Dashboard" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to}>
            <Card className="transition hover:shadow-md">
              <t.icon className="h-5 w-5 text-brand-red" />
              {isLoading ? <Skeleton className="mt-3 h-9 w-12" /> : <p className="num mt-3 text-4xl text-navy">{t.n}</p>}
              <p className="mt-1 text-sm text-muted-foreground">{t.label}</p>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/admin/videos" className="btn btn-primary"><Plus className="h-4 w-4" /> Add video</Link>
        <Link to="/admin/projects/new" search={{ kind: "current" }} className="btn btn-ghost-light"><Plus className="h-4 w-4" /> Add project</Link>
        <Link to="/admin/media" className="btn btn-ghost-light"><Upload className="h-4 w-4" /> Upload media</Link>
      </div>
    </>
  );
}
