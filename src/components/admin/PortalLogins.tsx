import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WhatsAppIcon } from "@/components/SiteChrome";
import { Confirm, btnSm } from "@/components/admin/ui";
import { resetPortalPassword } from "@/lib/portal-logins.functions";
import { shareMessage, waLink } from "@/lib/portal-logins";

export async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); toast.success("Copied"); } catch { toast.error("Couldn't copy — select the text and copy it manually."); }
}

export const PASSWORD_WARNING = "Passwords are shown only now. Copy or download them before leaving this page.";

/** One client's ready-to-send login message with Copy / WhatsApp buttons. */
export function ShareCard({ name, phone, flat, username, password }: { name: string; phone: string; flat: string; username: string; password: string }) {
  const msg = shareMessage({ name, username, password, flat });
  const wa = waLink(phone, msg);
  return (
    <div className="rounded-xl border border-border bg-ivory/50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-navy">{name}{flat && <span className="ml-2 text-xs font-normal text-muted-foreground">Flat {flat}</span>}</p>
        <p className="font-mono text-xs text-navy">{username} · {password}</p>
      </div>
      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 font-sans text-xs text-navy" data-lenis-prevent>{msg}</pre>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => copyText(msg)} className={btnSm}><Copy className="h-3.5 w-3.5" /> Copy message</button>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={btnSm}><WhatsAppIcon /> Send on WhatsApp</a>}
      </div>
    </div>
  );
}

export function ResetPortalPassword({ clientId, name, phone, flat }: { clientId: string; name: string; phone: string; flat: string }) {
  const reset = useServerFn(resetPortalPassword);
  const [res, setRes] = useState<{ username: string; password: string } | null>(null);
  async function go() {
    try { setRes(await reset({ data: { clientId } })); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't reset the password"); }
  }
  return (
    <>
      <Confirm title="Reset portal password?" description={`${name} gets a new temporary password and must set their own at next login. The old password stops working.`} confirmLabel="Reset password" onConfirm={go}>
        {(ask) => <button onClick={ask} className={btnSm}><KeyRound className="h-4 w-4" /> Reset portal password</button>}
      </Confirm>
      <Dialog open={!!res} onOpenChange={(o) => { if (!o) setRes(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New temporary password</DialogTitle></DialogHeader>
          <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm font-medium text-brand-red">{PASSWORD_WARNING}</p>
          {res && <ShareCard name={name} phone={phone} flat={flat} username={res.username} password={res.password} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
