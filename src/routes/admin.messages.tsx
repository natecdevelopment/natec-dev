import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Mail, MailOpen, Phone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Confirm, Empty, ListSkeleton, PageTitle, btnDanger, btnSm } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/messages")({ component: MessagesPage });

const KEY = ["admin", "messages"];
const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // block spreadsheet formula injection
  return `"${safe.replace(/"/g, '""')}"`;
};

function MessagesPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function toggleRead(id: string, read: boolean) {
    const { error } = await supabase.from("contact_submissions").update({ read_at: read ? new Date().toISOString() : null }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: KEY });
  }
  async function remove(id: string) {
    const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Message deleted");
    qc.invalidateQueries({ queryKey: KEY });
  }
  function exportCsv() {
    if (!data?.length) return;
    const cols = ["created_at", "full_name", "phone", "email", "service", "visit_date", "message", "read_at"] as const;
    const csv = [cols.join(","), ...data.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `natec-messages-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  const unread = data?.filter((m) => !m.read_at).length ?? 0;
  return (
    <div>
      <PageTitle title={`Messages${unread ? ` (${unread} new)` : ""}`}>
        <button onClick={exportCsv} disabled={!data?.length} className={`${btnSm} disabled:opacity-40`}><Download className="h-4 w-4" /> Export CSV</button>
      </PageTitle>
      {isLoading ? <ListSkeleton /> : error ? <Card><p className="text-brand-red">Could not load messages.</p></Card> : !data?.length ? <Empty title="No messages yet" /> : (
        <ul className="space-y-3">
          {data.map((m) => (
            <li key={m.id}>
              <Card className={m.read_at ? "opacity-75" : "ring-2 ring-brand-red/30"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">{!m.read_at && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-red align-middle" aria-label="Unread" />}{m.full_name}</p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 hover:text-navy"><Phone className="h-3.5 w-3.5" />{m.phone}</a>
                      {m.email && <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 break-all hover:text-navy"><Mail className="h-3.5 w-3.5" />{m.email}</a>}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {m.service && <span className="rounded-full bg-ivory px-3 py-1 text-navy">{m.service}</span>}
                  {m.visit_date && <span className="rounded-full bg-ivory px-3 py-1 text-navy">Visit: {m.visit_date}</span>}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/85">{m.message}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => toggleRead(m.id, !m.read_at)} className={btnSm}>{m.read_at ? <><Mail className="h-4 w-4" /> Mark unread</> : <><MailOpen className="h-4 w-4" /> Mark as read</>}</button>
                  <Confirm title="Delete this message?" description="This permanently removes the message." onConfirm={() => remove(m.id)}>
                    <button className={btnDanger}><Trash2 className="h-4 w-4" /> Delete</button>
                  </Confirm>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
