import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: email an invite so the client can set a password; their login links to the client record on confirmation. */
export const inviteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string; origin: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.clientId)) throw new Error("Invalid client");
    if (!/^https?:\/\/[^/]+$/.test(input.origin)) throw new Error("Invalid origin");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Forbidden");
    const { data: client, error } = await context.supabase.from("clients").select("id, email, full_name, profile_id").eq("id", data.clientId).single();
    if (error || !client) throw new Error("Client not found");
    if (client.profile_id) return { status: "already_linked" as const };
    if (!client.email) throw new Error("Add an email address to this client first.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(client.email, {
      redirectTo: `${data.origin}/reset-password`,
      data: { full_name: client.full_name },
    });
    if (invErr) {
      if (/already|registered|exists/i.test(invErr.message)) return { status: "has_account" as const };
      throw new Error(invErr.message);
    }
    return { status: "invited" as const };
  });
