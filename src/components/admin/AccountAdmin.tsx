import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteAccount } from "@/lib/admin-accounts.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/admin/ui";

export type DeleteTarget = { profileId: string | null; clientId: string | null; name: string; email: string; isClient: boolean };

/** Lower-cased emails of all admins (only returned to admins). */
export function useAdminEmails() {
  const q = useQuery({
    queryKey: ["admin", "admin-emails"],
    queryFn: async () => { const { data } = await supabase.rpc("admin_emails"); return new Set((data ?? []).map((e: string) => e.toLowerCase())); },
    staleTime: 5 * 60_000,
  });
  return q.data ?? new Set<string>();
}

export async function logAudit(action: string, targetEmail: string, details: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("admin_audit_log").insert({ admin_email: data.user?.email ?? "", action, target_email: targetEmail, details: details as never });
}

export const ADMIN_LOCK_TIP = "Admin accounts can't be deleted here";

export const muted = <span className="text-muted-foreground/60">—</span>;

export function StatusChip({ status }: { status: string }) {
  const s = status === "suspended";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${s ? "bg-brand-red/10 text-brand-red" : "bg-ok/10 text-ok"}`}>{status}</span>;
}

/** Square icon button with a native tooltip. */
export function IconBtn({ label, onClick, danger, disabled, children, title }: { label: string; onClick?: () => void; danger?: boolean; disabled?: boolean; children: ReactNode; title?: string }) {
  return (
    <span title={title ?? label} className="inline-flex">
      <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-35 ${danger ? "border-brand-red/30 text-brand-red hover:bg-brand-red/5" : "border-navy/20 text-navy hover:bg-navy/5"}`}>
        {children}
      </button>
    </span>
  );
}

export function DeleteAccountDialog({ targets, onClose, onDeleted }: { targets: DeleteTarget[] | null; onClose: () => void; onDeleted: (t: DeleteTarget[]) => void }) {
  const run = useServerFn(deleteAccount);
  const qc = useQueryClient();
  const [typed, setTyped] = useState("");
  const [mode, setMode] = useState<"login" | "all">("login");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setTyped(""); setMode("login"); setBusy(false); }, [targets]);
  if (!targets) return null;
  const bulk = targets.length > 1;
  const one = targets[0];
  const word = bulk ? "DELETE" : one?.email ?? "";
  const ok = !!word && typed.trim().toLowerCase() === word.toLowerCase();
  const anyClient = targets.some((t) => t.isClient);
  const loginOnlyImpossible = !bulk && !!one && !one.profileId;
  const effMode = loginOnlyImpossible ? "all" : mode;

  async function go() {
    if (!ok || !targets) return;
    setBusy(true);
    const done: DeleteTarget[] = [];
    for (const t of targets) {
      try {
        await run({ data: { profileId: t.profileId, clientId: effMode === "all" ? t.clientId : null, mode: effMode } });
        done.push(t);
      } catch (e) {
        toast.error(`${t.email || t.name}: ${e instanceof Error ? e.message : "Delete failed"}`);
      }
    }
    setBusy(false);
    if (done.length) {
      toast.success(done.length > 1 ? `${done.length} accounts deleted` : "Account deleted");
      onDeleted(done);
      qc.invalidateQueries({ queryKey: ["admin"] });
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{bulk ? `Delete ${targets.length} accounts?` : "Delete this account?"}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-sm">
              {bulk ? (
                <ul className="max-h-32 overflow-y-auto rounded-lg bg-ivory p-3 text-navy">{targets.map((t) => <li key={t.profileId ?? t.clientId} className="truncate">{t.name || t.email} <span className="text-muted-foreground">· {t.email}</span></li>)}</ul>
              ) : (
                <p className="text-navy"><strong>{one?.name || "—"}</strong><br /><span className="break-all text-muted-foreground">{one?.email}</span></p>
              )}
              <p>This permanently deletes their login, profile and saved projects. They will be signed out and cannot sign in again with this account. This cannot be undone.</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {anyClient && !bulk && (
          <fieldset className="space-y-2 rounded-xl border border-border p-3 text-sm">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client record</legend>
            <label className={`flex gap-2 ${loginOnlyImpossible ? "opacity-40" : ""}`}>
              <input type="radio" name="mode" checked={effMode === "login"} disabled={loginOnlyImpossible} onChange={() => setMode("login")} className="mt-1" />
              <span className="text-navy">Delete the login only — keep the client record, payments, instalments and documents <span className="text-muted-foreground">(recommended)</span>{loginOnlyImpossible && <span className="block text-xs text-muted-foreground">This client has no login.</span>}</span>
            </label>
            <label className={`flex gap-2 ${ok ? "" : "opacity-40"}`}>
              <input type="radio" name="mode" checked={effMode === "all"} disabled={!ok} onChange={() => setMode("all")} className="mt-1" />
              <span className="text-navy">Also delete the client record and all its payments, instalments and documents</span>
            </label>
            {effMode === "all" && <p className="flex items-start gap-2 rounded-lg bg-brand-red/10 p-2 text-brand-red"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Financial records will be lost permanently.</p>}
            {!ok && !loginOnlyImpossible && <p className="text-xs text-muted-foreground">Type the email below to enable the second option.</p>}
          </fieldset>
        )}
        {bulk && anyClient && <p className="text-xs text-muted-foreground">Client records, payments and documents are kept; only the logins are deleted.</p>}

        <label className="block text-sm text-navy">
          Type <strong className="break-all">{word}</strong> to confirm
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} className="admin-input mt-1" aria-label="Confirmation" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn border border-navy/30 !py-2 text-navy">Cancel</button>
          <button type="button" onClick={go} disabled={!ok || busy} className="btn btn-primary !py-2 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete permanently
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ACTION_LABEL: Record<string, string> = { delete_account: "Deleted account", suspend: "Suspended", reactivate: "Reactivated", make_client: "Made client" };

export function ActivityList() {
  const q = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: async () => { const { data, error } = await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(20); if (error) throw error; return data ?? []; },
  });
  return (
    <Card className="mt-8">
      <h2 className="font-display !text-lg text-navy">Activity</h2>
      {q.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Loading…</p> : !q.data?.length ? <p className="mt-2 text-sm text-muted-foreground">No activity yet.</p> : (
        <ul className="mt-3 divide-y divide-border text-sm">
          {q.data.map((e) => {
            const d = e.details as { mode?: string } | null;
            return (
              <li key={e.id} className="grid gap-1 py-2 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)] sm:gap-3">
                <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                <span className="text-navy"><strong>{ACTION_LABEL[e.action] ?? e.action}</strong> <span className="truncate text-muted-foreground">{e.target_email || "—"}</span>{d?.mode === "all" && <span className="ml-1 text-xs text-brand-red">(incl. client record)</span>}</span>
                <span className="truncate text-muted-foreground" title={e.admin_email}>by {e.admin_email}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
